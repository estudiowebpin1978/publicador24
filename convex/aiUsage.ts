import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiUsage")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    totalTokens: v.number(),
    totalCost: v.number(),
    operationsCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiUsage", args);
  },
});

export const update = mutation({
  args: {
    date: v.string(),
    additionalTokens: v.number(),
    additionalCost: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalTokens: existing.totalTokens + args.additionalTokens,
        totalCost: existing.totalCost + args.additionalCost,
        operationsCount: existing.operationsCount + 1,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("aiUsage", {
        date: args.date,
        totalTokens: args.additionalTokens,
        totalCost: args.additionalCost,
        operationsCount: 1,
      });
    }
  },
});
