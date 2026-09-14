import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    funnel: v.any(),
    contentPillars: v.any(),
    ctaStrategy: v.any(),
    landingPages: v.optional(v.any()),
    budgetAllocation: v.optional(v.any()),
    riskAssessment: v.optional(v.array(v.string())),
    recommendations: v.optional(v.array(v.string())),
    kpiTargets: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("campaignStrategies", {
      ...args,
      generatedAt: Date.now(),
    });
  },
});

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("campaignStrategies")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
  },
});

export const update = mutation({
  args: {
    id: v.id("campaignStrategies"),
    funnel: v.optional(v.any()),
    contentPillars: v.optional(v.any()),
    ctaStrategy: v.optional(v.any()),
    landingPages: v.optional(v.any()),
    budgetAllocation: v.optional(v.any()),
    riskAssessment: v.optional(v.array(v.string())),
    recommendations: v.optional(v.array(v.string())),
    kpiTargets: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});
