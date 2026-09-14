import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getGlobalHealth = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();
    const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");

    const campaignHealth = await Promise.all(
      activeCampaigns.map(async (campaign) => {
        const pieces = await ctx.db
          .query("contentPieces")
          .withIndex("by_campaign", (q) => q.eq("campaignId", campaign._id))
          .collect();

        const scheduled = await ctx.db
          .query("scheduledPosts")
          .collect();

        const campaignScheduled = scheduled.filter((s) => {
          return pieces.some((p) => p._id === s.contentPieceId);
        });

        const published = campaignScheduled.filter((s) => s.status === "PUBLISHED");
        const queued = campaignScheduled.filter((s) => s.status === "QUEUED");
        const failed = campaignScheduled.filter((s) => s.status === "FAILED");

        const totalPieces = pieces.length;
        const publishedCount = published.length;
        const queuedCount = queued.length;
        const failedCount = failed.length;

        let healthScore = 100;
        if (totalPieces === 0) healthScore = 0;
        else if (queuedCount === 0 && publishedCount < totalPieces) healthScore = 30;
        else if (failedCount > 0) healthScore = Math.max(50, 100 - (failedCount / totalPieces) * 100);

        let status: string = "HEALTHY";
        if (healthScore < 50) status = "CRITICAL";
        else if (healthScore < 80) status = "WARNING";

        return {
          campaignId: campaign._id,
          name: campaign.name,
          status,
          healthScore: Math.round(healthScore),
          metrics: {
            contentGenerated: totalPieces,
            contentScheduled: queuedCount,
            contentPublished: publishedCount,
            contentFailed: failedCount,
          },
        };
      })
    );

    const overallScore = campaignHealth.length > 0
      ? Math.round(campaignHealth.reduce((sum, c) => sum + c.healthScore, 0) / campaignHealth.length)
      : 0;

    return {
      overallScore,
      campaigns: campaignHealth,
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaigns.length,
    };
  },
});

export const setGlobalKillSwitch = mutation({
  args: { paused: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("autopilotSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        level: args.paused ? "STOPPED" : "AUTO",
      });
    } else {
      await ctx.db.insert("autopilotSettings", {
        level: args.paused ? "STOPPED" : "AUTO",
      });
    }
    return { success: true };
  },
});

export const checkCostLimits = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("aiUsage")
      .filter((q) => q.eq(q.field("date"), today))
      .first();

    return {
      costUsd: usage?.totalCost || 0,
      costLimit: 1.0,
      tokensUsed: usage?.totalTokens || 0,
      tokensLimit: 100000,
      withinLimits: (usage?.totalCost || 0) < 1.0,
    };
  },
});
