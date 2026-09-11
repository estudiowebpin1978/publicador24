import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let results = await ctx.db
      .query("trends")
      .withIndex("by_detected", (q) => q.gte("detectedAt", thirtyDaysAgo))
      .order("desc")
      .collect();

    if (args.language) {
      results = results.filter((t) => t.language === args.language);
    }

    return results.slice(0, limit);
  },
});

export const listByPlatform = query({
  args: {
    platform: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const results = await ctx.db
      .query("trends")
      .withIndex("by_detected", (q) => q.gte("detectedAt", thirtyDaysAgo))
      .order("desc")
      .collect();

    return results
      .filter((t) => t.platform === args.platform)
      .slice(0, limit);
  },
});

export const get = query({
  args: { id: v.id("trends") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    keyword: v.string(),
    category: v.optional(v.string()),
    platform: v.optional(v.string()),
    country: v.optional(v.string()),
    language: v.string(),
    direction: v.string(),
    trendScore: v.number(),
    volume: v.optional(v.number()),
    growthRate: v.optional(v.number()),
    relatedHashtags: v.array(v.string()),
    relatedEntities: v.array(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("trends", {
      ...args,
      detectedAt: Date.now(),
    });
  },
});
