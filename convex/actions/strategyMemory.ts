"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// STRATEGY MEMORY
// Per-campaign learning: what works, what doesn't
// ============================================

interface StrategyInsight {
  campaignId: string;
  bestHooks: { hook: string; score: number }[];
  bestFormats: { format: string; score: number }[];
  bestPlatforms: { platform: string; score: number }[];
  bestFunnels: { stage: string; score: number }[];
  worstPerformers: { hook: string; score: number }[];
  totalPublished: number;
  averageEngagement: number;
}

export const recordStrategyMemory = action({
  args: {
    campaignId: v.id("campaigns"),
    contentPieceId: v.id("contentPieces"),
    platform: v.string(),
    metrics: v.any(),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.getById, { id: args.contentPieceId });
    if (!piece) throw new Error("Content piece not found");

    const engagement = calculateEngagementScore(args.metrics);

    await ctx.runMutation(api.strategyMemory.create, {
      campaignId: args.campaignId,
      topic: piece.title,
      hook: piece.hook,
      contentType: piece.contentType,
      platform: args.platform,
      funnelStage: piece.funnelStage,
      score: engagement,
      impressions: args.metrics.impressions || 0,
      engagement: args.metrics.engagement || 0,
      publishedAt: Date.now(),
    });

    return { recorded: true, engagement };
  },
});

export const getCampaignInsights = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args): Promise<StrategyInsight> => {
    const memories = await ctx.runQuery(api.strategyMemory.getByCampaign, {
      campaignId: args.campaignId,
    });

    const hookScores: Record<string, number[]> = {};
    const formatScores: Record<string, number[]> = {};
    const platformScores: Record<string, number[]> = {};
    const funnelScores: Record<string, number[]> = {};

    for (const mem of memories) {
      if (!hookScores[mem.hook]) hookScores[mem.hook] = [];
      hookScores[mem.hook].push(mem.score);

      if (!formatScores[mem.contentType]) formatScores[mem.contentType] = [];
      formatScores[mem.contentType].push(mem.score);

      if (!platformScores[mem.platform]) platformScores[mem.platform] = [];
      platformScores[mem.platform].push(mem.score);

      if (!funnelScores[mem.funnelStage]) funnelScores[mem.funnelStage] = [];
      funnelScores[mem.funnelStage].push(mem.score);
    }

    const avgHookScores = Object.entries(hookScores).map(([hook, scores]) => ({
      hook,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    const avgFormatScores = Object.entries(formatScores).map(([format, scores]) => ({
      format,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    const avgPlatformScores = Object.entries(platformScores).map(([platform, scores]) => ({
      platform,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    const avgFunnelScores = Object.entries(funnelScores).map(([stage, scores]) => ({
      stage,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    const allScores = memories.map((m) => m.score);
    const avgEngagement = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    return {
      campaignId: args.campaignId,
      bestHooks: avgHookScores.sort((a, b) => b.score - a.score).slice(0, 5),
      bestFormats: avgFormatScores.sort((a, b) => b.score - a.score).slice(0, 3),
      bestPlatforms: avgPlatformScores.sort((a, b) => b.score - a.score).slice(0, 3),
      bestFunnels: avgFunnelScores.sort((a, b) => b.score - a.score),
      worstPerformers: avgHookScores.sort((a, b) => a.score - b.score).slice(0, 3),
      totalPublished: memories.length,
      averageEngagement: avgEngagement,
    };
  },
});

function calculateEngagementScore(metrics: any): number {
  if (!metrics) return 50;

  let score = 50;

  if (metrics.likes) score += Math.min(20, metrics.likes / 10);
  if (metrics.comments) score += Math.min(15, metrics.comments / 5);
  if (metrics.shares) score += Math.min(10, metrics.shares / 3);
  if (metrics.impressions) score += Math.min(5, metrics.impressions / 1000);

  return Math.min(100, Math.max(0, score));
}
