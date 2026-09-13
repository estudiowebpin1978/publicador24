import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByPiece = query({
  args: { contentPieceId: v.id("contentPieces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("publicationSafety")
      .withIndex("by_piece", (q) => q.eq("contentPieceId", args.contentPieceId))
      .order("desc")
      .take(10);
  },
});

export const get = query({
  args: { id: v.id("publicationSafety") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    contentPieceId: v.id("contentPieces"),
    platform: v.string(),
    safetyScore: v.number(),
    checks: v.any(),
    approved: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("publicationSafety", {
      ...args,
      checkedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("publicationSafety") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
