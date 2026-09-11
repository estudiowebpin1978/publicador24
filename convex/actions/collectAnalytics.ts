"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function fetchMockAnalytics() {
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

  const baseFollowers = 1000 + Math.floor(Math.random() * 5000);
  const gained = Math.floor(Math.random() * 50);
  const impressions = Math.floor(Math.random() * 10000) + 500;
  const reach = Math.floor(impressions * 0.6);
  const engagement = Math.floor(Math.random() * 500) + 20;
  const postsCount = Math.floor(Math.random() * 5) + 1;

  return {
    followers: baseFollowers + gained,
    followersGained: gained,
    impressions,
    reach,
    engagement,
    engagementRate: reach > 0 ? Number(((engagement / reach) * 100).toFixed(2)) : 0,
    postsCount,
  };
}

async function fetchMockPostMetrics() {
  await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 600));

  return {
    views: Math.floor(Math.random() * 5000) + 100,
    likes: Math.floor(Math.random() * 200) + 10,
    comments: Math.floor(Math.random() * 50) + 2,
    shares: Math.floor(Math.random() * 30) + 1,
    saves: Math.floor(Math.random() * 20) + 1,
    reach: Math.floor(Math.random() * 3000) + 200,
    impressions: Math.floor(Math.random() * 5000) + 300,
  };
}

async function collectAccountAnalyticsLogic(
  ctx: ActionCtx,
  args: {
    socialAccountId: Id<"socialAccounts">;
    platform: string;
    date: string;
  }
) {
  const account = await ctx.runQuery(api.socialAccounts.get, {
    id: args.socialAccountId,
  });
  if (!account) throw new Error("Social account not found");

  const startTime = Date.now();

  const analytics = await fetchMockAnalytics();

  await ctx.runMutation(api.analytics.createDaily, {
    socialAccountId: args.socialAccountId,
    platform: args.platform,
    date: args.date,
    ...analytics,
  });

  await ctx.runMutation(api.auditLogs.create, {
    action: "COLLECT_ANALYTICS",
    platform: args.platform,
    result: "SUCCESS",
    durationMs: Date.now() - startTime,
  });

  return { success: true, analytics };
}

export const collectAccountAnalytics = action({
  args: {
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await collectAccountAnalyticsLogic(ctx, args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.auditLogs.create, {
        action: "COLLECT_ANALYTICS",
        platform: args.platform,
        result: "FAILED",
        error: errorMessage,
        durationMs: 0,
      });

      return { success: false, error: errorMessage };
    }
  },
});

export const collectPostMetrics = action({
  args: {
    publishedPostId: v.id("publishedPosts"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.runQuery(api.publishedPosts.get, {
      id: args.publishedPostId,
    });
    if (!post) throw new Error("Published post not found");

    try {
      const metrics = await fetchMockPostMetrics();

      await ctx.runMutation(api.analytics.createPostAnalytics, {
        publishedPostId: args.publishedPostId,
        platform: args.platform,
        metrics,
      });

      await ctx.runMutation(api.publishedPosts.updateMetrics, {
        id: args.publishedPostId,
        metrics,
      });

      return { success: true, metrics };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  },
});

export const collectAllAnalytics = action({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.runQuery(api.socialAccounts.list, {});
    const results = [];

    for (const account of accounts) {
      if (account.status === "CONNECTED") {
        try {
          const result = await collectAccountAnalyticsLogic(ctx, {
            socialAccountId: account._id,
            platform: account.platform,
            date: args.date,
          });
          results.push({
            accountId: account._id,
            platform: account.platform,
            ...result,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
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
  },
});
