import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getDailyByAccount = query({
  args: {
    socialAccountId: v.id("socialAccounts"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyticsDaily")
      .withIndex("by_account_date", (q) =>
        q
          .eq("socialAccountId", args.socialAccountId)
          .eq("date", args.date)
      )
      .first();
  },
});

export const getDailyByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyticsDaily")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

export const getPostAnalytics = query({
  args: { postId: v.id("publishedPosts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyticsPosts")
      .withIndex("by_post", (q) => q.eq("publishedPostId", args.postId))
      .order("desc")
      .collect();
  },
});

export const getSummary = query({
  args: {
    socialAccountId: v.optional(v.id("socialAccounts")),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("analyticsDaily");

    if (args.socialAccountId) {
      query = query.withIndex("by_account_date", (q) =>
        q.eq("socialAccountId", args.socialAccountId!)
      );
    } else {
      query = query.withIndex("by_date");
    }

    const daily = await query.collect();

    const range = daily.filter(
      (a) => a.date >= args.startDate && a.date <= args.endDate
    );

    const totals = range.reduce(
      (acc, day) => ({
        followersGained: acc.followersGained + day.followersGained,
        impressions: acc.impressions + day.impressions,
        reach: acc.reach + day.reach,
        engagement: acc.engagement + day.engagement,
        postsCount: acc.postsCount + day.postsCount,
      }),
      {
        followersGained: 0,
        impressions: 0,
        reach: 0,
        engagement: 0,
        postsCount: 0,
      }
    );

    const avgEngagementRate =
      range.length > 0
        ? range.reduce((sum, day) => sum + day.engagementRate, 0) /
          range.length
        : 0;

    const followers = range.length > 0 ? range[range.length - 1].followers : 0;

    return {
      period: { startDate: args.startDate, endDate: args.endDate },
      days: range.length,
      totals: { ...totals, followers },
      avgEngagementRate,
    };
  },
});

export const createDaily = mutation({
  args: {
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    date: v.string(),
    followers: v.number(),
    followersGained: v.number(),
    impressions: v.number(),
    reach: v.number(),
    engagement: v.number(),
    engagementRate: v.number(),
    postsCount: v.number(),
    topPostId: v.optional(v.string()),
    metrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("analyticsDaily")
      .withIndex("by_account_date", (q) =>
        q
          .eq("socialAccountId", args.socialAccountId)
          .eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        followers: args.followers,
        followersGained: args.followersGained,
        impressions: args.impressions,
        reach: args.reach,
        engagement: args.engagement,
        engagementRate: args.engagementRate,
        postsCount: args.postsCount,
        topPostId: args.topPostId,
        metrics: args.metrics,
      });
      return existing._id;
    }

    return await ctx.db.insert("analyticsDaily", args);
  },
});

export const createPostAnalytics = mutation({
  args: {
    publishedPostId: v.id("publishedPosts"),
    platform: v.string(),
    metrics: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyticsPosts", {
      ...args,
      collectedAt: Date.now(),
    });
  },
});
