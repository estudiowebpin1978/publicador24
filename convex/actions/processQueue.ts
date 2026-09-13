"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function publishSinglePost(ctx: ActionCtx, postId: Id<"scheduledPosts">) {
  const post = await ctx.runQuery(api.scheduledPosts.get, { id: postId });
  if (!post) throw new Error("Scheduled post not found");

  const content = await ctx.runQuery(api.content.get, { id: post.contentId });
  if (!content) throw new Error("Content not found");

  let platformVariant: { caption?: string; hashtags?: string[] } | undefined = undefined;
  if (post.platformVariantId) {
    platformVariant = await ctx.runQuery(
      api.contentPlatformVariants.get,
      { id: post.platformVariantId }
    );
  }

  const caption = platformVariant?.caption ?? content.description ?? content.title;
  const hashtags = platformVariant?.hashtags ?? [];
  const fullCaption = `${caption}\n\n${hashtags.map((h: string) => `#${h}`).join(" ")}`;

  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  const platformPostId = `mock_${post.platform}_${Date.now()}`;
  const platformPostUrl = `https://${post.platform}.com/post/${platformPostId}`;

  await ctx.runMutation(api.scheduledPosts.markPublished, {
    id: postId,
    platformPostId,
    platformPostUrl,
  });

  await ctx.runMutation(api.publishedPosts.create, {
    scheduledPostId: postId,
    socialAccountId: post.socialAccountId,
    platform: post.platform,
    platformPostId,
    platformPostUrl,
    caption: fullCaption,
    hashtags,
    mediaUrls: [],
    publishedAt: Date.now(),
  });

  return { platformPostId, platformPostUrl };
}

async function processPublishQueueLogic(ctx: ActionCtx, limit: number) {
  const pendingPosts = await ctx.runQuery(api.scheduledPosts.getNextToProcess, {
    limit,
  });

  const results: { postId: any; platform: string; success: boolean; platformPostId?: string; platformPostUrl?: string; error?: string }[] = [];

  for (const post of pendingPosts) {
    try {
      await ctx.runMutation(api.scheduledPosts.lock, { id: post._id });

      const result = await publishSinglePost(ctx, post._id);

      results.push({
        postId: post._id,
        platform: post.platform,
        success: true,
        ...result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.scheduledPosts.markFailed, {
        id: post._id,
        errorMessage,
      });

      results.push({
        postId: post._id,
        platform: post.platform,
        success: false,
        error: errorMessage,
      });
    }
  }

  const metadataProcessed = results.length;
  const metadataSuccessful = results.filter((r) => r.success).length;
  const metadataFailed = results.filter((r) => !r.success).length;
  await ctx.runMutation(api.auditLogs.create, {
    action: "PROCESS_QUEUE",
    result: "SUCCESS",
    metadata: {
      processed: metadataProcessed,
      successful: metadataSuccessful,
      failed: metadataFailed,
    },
  });

  return {
    processed: metadataProcessed,
    successful: metadataSuccessful,
    failed: metadataFailed,
    results,
  };
}

async function processRetryQueueLogic(ctx: ActionCtx, limit: number) {
  const retryPosts = await ctx.runQuery(api.scheduledPosts.list, {
    status: "RETRY",
    limit,
  });

  const now = Date.now();
  const readyToRetry = retryPosts.filter(
    (post: (typeof retryPosts)[number]) =>
      !post.nextAttemptAt || post.nextAttemptAt <= now
  );

  const results: { postId: any; platform: string; success: boolean; platformPostId?: string; platformPostUrl?: string; error?: string }[] = [];

  for (const post of readyToRetry) {
    try {
      await ctx.runMutation(api.scheduledPosts.lock, { id: post._id });

      const result = await publishSinglePost(ctx, post._id);

      results.push({
        postId: post._id,
        platform: post.platform,
        success: true,
        ...result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.scheduledPosts.markFailed, {
        id: post._id,
        errorMessage,
      });

      results.push({
        postId: post._id,
        platform: post.platform,
        success: false,
        error: errorMessage,
      });
    }
  }

  return {
    processed: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

async function collectAllAnalyticsLogic(ctx: ActionCtx, date: string) {
  const accounts = await ctx.runQuery(api.socialAccounts.list, {});
  const results: { accountId: any; platform: string; success: boolean; analytics?: any; error?: string }[] = [];

  for (const account of accounts) {
    if (account.status === "CONNECTED") {
      const startTime = Date.now();
      try {
        const baseFollowers = 1000 + Math.floor(Math.random() * 5000);
        const gained = Math.floor(Math.random() * 50);
        const impressions = Math.floor(Math.random() * 10000) + 500;
        const reach = Math.floor(impressions * 0.6);
        const engagement = Math.floor(Math.random() * 500) + 20;
        const postsCount = Math.floor(Math.random() * 5) + 1;

        const analytics = {
          followers: baseFollowers + gained,
          followersGained: gained,
          impressions,
          reach,
          engagement,
          engagementRate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0,
          postsCount,
        };

        await ctx.runMutation(api.analytics.createDaily, {
          socialAccountId: account._id,
          platform: account.platform,
          date,
          ...analytics,
        });

        await ctx.runMutation(api.auditLogs.create, {
          action: "COLLECT_ANALYTICS",
          platform: account.platform,
          result: "SUCCESS",
          durationMs: Date.now() - startTime,
        });

        results.push({
          accountId: account._id,
          platform: account.platform,
          success: true,
          analytics,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        await ctx.runMutation(api.auditLogs.create, {
          action: "COLLECT_ANALYTICS",
          platform: account.platform,
          result: "FAILED",
          error: errorMessage,
          durationMs: Date.now() - startTime,
        });

        results.push({
          accountId: account._id,
          platform: account.platform,
          success: false,
          error: errorMessage,
        });
      }
    }
  }

  return results;
}

export const processPublishQueue = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return processPublishQueueLogic(ctx, args.limit ?? 10);
  },
});

export const processRetryQueue = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return processRetryQueueLogic(ctx, args.limit ?? 10);
  },
});

export const processJobs = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const pendingJobs = await ctx.runQuery(api.jobs.getNextJob, { limit });
    const results: { jobId: any; jobType: string; success: boolean; error?: string }[] = [];

    for (const job of pendingJobs) {
      try {
        await ctx.runMutation(api.jobs.lock, { id: job._id });

        let result;
        switch (job.jobType) {
          case "collect_analytics":
            result = await collectAllAnalyticsLogic(
              ctx,
              new Date().toISOString().split("T")[0]
            );
            break;

          case "process_queue":
            result = await processPublishQueueLogic(ctx, 50);
            break;

          case "process_retries":
            result = await processRetryQueueLogic(ctx, 20);
            break;

          default:
            throw new Error(`Unknown job type: ${job.jobType}`);
        }

        await ctx.runMutation(api.jobs.markCompleted, {
          id: job._id,
          result,
        });

        results.push({ jobId: job._id, jobType: job.jobType, success: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        await ctx.runMutation(api.jobs.markFailed, {
          id: job._id,
          error: errorMessage,
        });

        results.push({
          jobId: job._id,
          jobType: job.jobType,
          success: false,
          error: errorMessage,
        });
      }
    }

    return {
      processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});
