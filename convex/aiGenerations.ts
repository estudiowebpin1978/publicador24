import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listGenerations = query({
  args: {
    contentId: v.optional(v.id("content")),
    operation: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.contentId) {
      const results = await ctx.db
        .query("aiGenerations")
        .withIndex("by_content", (q) =>
          q.eq("contentId", args.contentId)
        )
        .order("desc")
        .collect();
      return results.slice(0, limit);
    }

    return await ctx.db.query("aiGenerations").order("desc").take(limit);
  },
});

export const logGeneration = mutation({
  args: {
    contentId: v.optional(v.id("content")),
    model: v.string(),
    operation: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    durationMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiGenerations", args);

    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalTokens: existing.totalTokens + args.inputTokens + args.outputTokens,
        totalCost: existing.totalCost + args.cost,
        operationsCount: existing.operationsCount + 1,
      });
    } else {
      await ctx.db.insert("aiUsage", {
        date: today,
        totalTokens: args.inputTokens + args.outputTokens,
        totalCost: args.cost,
        operationsCount: 1,
      });
    }

    return id;
  },
});

export const getUsage = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("aiUsage").collect();
    return all.filter(
      (u) => u.date >= args.startDate && u.date <= args.endDate
    );
  },
});

export const getTotalUsage = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("aiUsage").collect();
    return all.reduce(
      (acc, usage) => ({
        totalTokens: acc.totalTokens + usage.totalTokens,
        totalCost: acc.totalCost + usage.totalCost,
        operationsCount: acc.operationsCount + usage.operationsCount,
      }),
      { totalTokens: 0, totalCost: 0, operationsCount: 0 }
    );
  },
});

export const deleteGeneration = mutation({
  args: { generationId: v.id("aiGenerations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.generationId);
    return args.generationId;
  },
});
