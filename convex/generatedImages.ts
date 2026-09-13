import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    contentPieceId: v.optional(v.id("contentPieces")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.contentPieceId) {
      return await ctx.db
        .query("generatedImages")
        .withIndex("by_piece", (q) => q.eq("contentPieceId", args.contentPieceId!))
        .order("desc")
        .take(limit);
    }

    if (args.campaignId) {
      return await ctx.db
        .query("generatedImages")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("generatedImages").order("desc").take(limit);
  },
});

export const get = query({
  args: { id: v.id("generatedImages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    contentPieceId: v.optional(v.id("contentPieces")),
    campaignId: v.optional(v.id("campaigns")),
    prompt: v.string(),
    imageUrl: v.string(),
    aspectRatio: v.string(),
    width: v.number(),
    height: v.number(),
    provider: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generatedImages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("generatedImages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
