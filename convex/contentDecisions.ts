import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    contentPieceId: v.optional(v.id("contentPieces")),
    decisionType: v.string(),
    decision: v.string(),
    reasoning: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contentDecisions", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("contentDecisions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(50);
  },
});
