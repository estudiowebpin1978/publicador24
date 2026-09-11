import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const search = query({
  args: {
    tag: v.string(),
    language: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("hashtags")
      .withIndex("by_tag", (q) => q.eq("tag", args.tag))
      .collect();

    if (args.language) {
      const lang = args.language;
      results = results.filter((h) => h.language === lang);
    }
    if (args.platform) {
      const plat = args.platform;
      results = results.filter((h) => h.platform === plat);
    }
    return results;
  },
});

export const list = query({
  args: {
    language: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.language) {
      return await ctx.db
        .query("hashtags")
        .withIndex("by_language", (q) => q.eq("language", args.language!))
        .take(args.limit ?? 50);
    }
    return await ctx.db.query("hashtags").take(args.limit ?? 50);
  },
});

export const get = query({
  args: { id: v.id("hashtags") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    tag: v.string(),
    category: v.optional(v.string()),
    language: v.string(),
    country: v.optional(v.string()),
    platform: v.optional(v.string()),
    popularityScore: v.optional(v.number()),
    competitionScore: v.optional(v.number()),
    relevanceScore: v.optional(v.number()),
    trendScore: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    isEstimated: v.boolean(),
    dataSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("hashtags", args);
  },
});

export const upsert = mutation({
  args: {
    tag: v.string(),
    category: v.optional(v.string()),
    language: v.string(),
    country: v.optional(v.string()),
    platform: v.optional(v.string()),
    popularityScore: v.optional(v.number()),
    competitionScore: v.optional(v.number()),
    relevanceScore: v.optional(v.number()),
    trendScore: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    isEstimated: v.boolean(),
    dataSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("hashtags")
      .withIndex("by_tag", (q) => q.eq("tag", args.tag))
      .collect();

    const match = existing.find(
      (h) =>
        h.language === args.language && h.platform === args.platform
    );

    if (match) {
      await ctx.db.patch(match._id, {
        category: args.category,
        country: args.country,
        popularityScore: args.popularityScore,
        competitionScore: args.competitionScore,
        relevanceScore: args.relevanceScore,
        trendScore: args.trendScore,
        finalScore: args.finalScore,
        isEstimated: args.isEstimated,
        dataSource: args.dataSource,
      });
      return match._id;
    }

    return await ctx.db.insert("hashtags", args);
  },
});
