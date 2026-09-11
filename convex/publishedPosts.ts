import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    platform: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.platform) {
      const results = await ctx.db
        .query("publishedPosts")
        .withIndex("by_platform", (q) => q.eq("platform", args.platform!))
        .order("desc")
        .collect();

      return results
        .filter((p) => {
          if (args.startDate && p.publishedAt < args.startDate) return false;
          if (args.endDate && p.publishedAt > args.endDate) return false;
          return true;
        })
        .slice(0, limit);
    }

    if (args.startDate || args.endDate) {
      const all = await ctx.db
        .query("publishedPosts")
        .withIndex("by_published")
        .order("desc")
        .collect();

      return all
        .filter((p) => {
          if (args.startDate && p.publishedAt < args.startDate) return false;
          if (args.endDate && p.publishedAt > args.endDate) return false;
          return true;
        })
        .slice(0, limit);
    }

    return await ctx.db
      .query("publishedPosts")
      .withIndex("by_published")
      .order("desc")
      .take(limit);
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("publishedPosts")
      .withIndex("by_published")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const get = query({
  args: { id: v.id("publishedPosts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    platformPostId: v.string(),
    platformPostUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.array(v.string()),
    mediaUrls: v.array(v.string()),
    publishedAt: v.number(),
    metrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("publishedPosts", args);
  },
});

export const updateMetrics = mutation({
  args: {
    id: v.id("publishedPosts"),
    metrics: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { metrics: args.metrics });
    return args.id;
  },
});
