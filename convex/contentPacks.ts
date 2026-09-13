import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    if (args.campaignId) {
      return await ctx.db
        .query("contentPacks")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("contentPacks").order("desc").take(limit);
  },
});

export const get = query({
  args: { id: v.id("contentPacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    totalPieces: v.number(),
    generatedPieces: v.number(),
    status: v.string(),
    distribution: v.optional(v.any()),
    generatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentPacks", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("contentPacks"),
    status: v.optional(v.string()),
    generatedPieces: v.optional(v.number()),
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
  args: { id: v.id("contentPacks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
