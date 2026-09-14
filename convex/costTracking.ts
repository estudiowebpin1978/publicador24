import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const track = mutation({
  args: {
    date: v.string(),
    operation: v.string(),
    provider: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUsd: v.number(),
    campaignId: v.optional(v.id("campaigns")),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("costTracking", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getDailyTotal = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("costTracking")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    return records.reduce((sum, r) => sum + r.costUsd, 0);
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("costTracking")
      .withIndex("by_date")
      .order("desc")
      .take(args.limit ?? 50);
  },
});
