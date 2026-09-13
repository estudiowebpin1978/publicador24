import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyMemory")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const getByCampaignPlatform = query({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("strategyMemory")
      .withIndex("by_campaign_platform", (q) =>
        q.eq("campaignId", args.campaignId).eq("platform", args.platform)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    topic: v.string(),
    hook: v.string(),
    contentType: v.string(),
    platform: v.string(),
    funnelStage: v.string(),
    score: v.number(),
    impressions: v.optional(v.number()),
    engagement: v.optional(v.number()),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("strategyMemory", args);
  },
});

export const remove = mutation({
  args: { id: v.id("strategyMemory") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
