import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    segmentType: v.string(),
    description: v.string(),
    demographics: v.optional(v.string()),
    psychographics: v.optional(v.string()),
    painPoints: v.optional(v.array(v.string())),
    desires: v.optional(v.array(v.string())),
    whereToReach: v.optional(v.array(v.string())),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("audienceProfiles", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("audienceProfiles")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const deactivate = mutation({
  args: { id: v.id("audienceProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
    return args.id;
  },
});
