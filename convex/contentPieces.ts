import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    packId: v.optional(v.id("contentPacks")),
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
    contentType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.packId) {
      const results = await ctx.db
        .query("contentPieces")
        .withIndex("by_pack", (q) => q.eq("contentPackId", args.packId!))
        .order("desc")
        .take(limit);
      return results.filter((p) => {
        if (args.platform && p.platform !== args.platform) return false;
        if (args.status && p.status !== args.status) return false;
        if (args.contentType && p.contentType !== args.contentType) return false;
        return true;
      });
    }

    if (args.campaignId) {
      const results = await ctx.db
        .query("contentPieces")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .order("desc")
        .take(limit);
      return results.filter((p) => {
        if (args.platform && p.platform !== args.platform) return false;
        if (args.status && p.status !== args.status) return false;
        if (args.contentType && p.contentType !== args.contentType) return false;
        return true;
      });
    }

    const results = await ctx.db
      .query("contentPieces")
      .order("desc")
      .take(limit);
    return results.filter((p) => {
      if (args.platform && p.platform !== args.platform) return false;
      if (args.status && p.status !== args.status) return false;
      if (args.contentType && p.contentType !== args.contentType) return false;
      return true;
    });
  },
});

export const get = query({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByPack = query({
  args: { packId: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentPieces")
      .withIndex("by_pack", (q) => q.eq("contentPackId", args.packId))
      .collect();
  },
});

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentPieces")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const create = mutation({
  args: {
    contentPackId: v.id("contentPacks"),
    campaignId: v.id("campaigns"),
    title: v.string(),
    hook: v.string(),
    body: v.string(),
    cta: v.string(),
    contentType: v.string(),
    funnelStage: v.string(),
    platform: v.string(),
    hashtags: v.array(v.string()),
    keywords: v.array(v.string()),
    imagePrompt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    score: v.number(),
    status: v.string(),
    variantOf: v.optional(v.id("contentPieces")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentPieces", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("contentPieces"),
    title: v.optional(v.string()),
    hook: v.optional(v.string()),
    body: v.optional(v.string()),
    cta: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    keywords: v.optional(v.array(v.string())),
    imagePrompt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    score: v.optional(v.number()),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, nonUndefined);
  },
});

export const remove = mutation({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
