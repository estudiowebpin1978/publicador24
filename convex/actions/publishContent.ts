"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function simulatePlatformPublish(platform: string): Promise<{
  success: boolean;
  platformPostId: string;
  platformPostUrl: string;
}> {
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));
  return {
    success: true,
    platformPostId: `mock_${platform}_${Date.now()}`,
    platformPostUrl: `https://${platform}.com/post/mock_${Date.now()}`,
  };
}

export const publishToPlatform = action({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    platform: v.string(),
    contentId: v.id("content"),
    socialAccountId: v.id("socialAccounts"),
  },
  handler: async (ctx, args) => {
    const content = await ctx.runQuery(api.content.get, { id: args.contentId });
    if (!content) throw new Error("Content not found");

    const account = await ctx.runQuery(api.socialAccounts.get, {
      id: args.socialAccountId,
    });
    if (!account) throw new Error("Social account not found");

    const platformVariant = await ctx.runQuery(
      api.contentPlatformVariants.getByPlatform,
      { contentId: args.contentId, platform: args.platform }
    );

    const scheduled = await ctx.runQuery(api.scheduledPosts.get, {
      id: args.scheduledPostId,
    });
    if (scheduled?.status === "PUBLISHED") {
      return { success: true, message: "Already published" };
    }

    const mockResult = await simulatePlatformPublish(args.platform);

    if (mockResult.success) {
      await ctx.runMutation(api.scheduledPosts.markPublished, {
        id: args.scheduledPostId,
        platformPostId: mockResult.platformPostId,
        platformPostUrl: mockResult.platformPostUrl,
      });

      await ctx.runMutation(api.publishedPosts.create, {
        scheduledPostId: args.scheduledPostId,
        socialAccountId: args.socialAccountId,
        platform: args.platform,
        platformPostId: mockResult.platformPostId,
        platformPostUrl: mockResult.platformPostUrl,
        caption: platformVariant?.caption || content.title,
        hashtags: platformVariant?.hashtags || [],
        mediaUrls: [],
        publishedAt: Date.now(),
      });

      await ctx.runMutation(api.auditLogs.create, {
        action: "publish",
        platform: args.platform,
        contentId: args.contentId,
        result: "SUCCESS",
      });
    }

    return mockResult;
  },
});
