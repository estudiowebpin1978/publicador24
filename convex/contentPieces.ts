import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("contentPieces")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("contentPieces").collect();
  },
});

export const getById = query({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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

export const getByPack = query({
  args: { contentPackId: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentPieces")
      .withIndex("by_pack", (q) => q.eq("contentPackId", args.contentPackId))
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
    contentType: v.optional(v.string()),
    funnelStage: v.optional(v.string()),
    platform: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    keywords: v.optional(v.array(v.string())),
    imagePrompt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    score: v.optional(v.number()),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("contentPieces") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
