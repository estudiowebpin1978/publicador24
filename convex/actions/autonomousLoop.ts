"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

// ============================================
// AUTONOMOUS LOOP
// CHECK_CAMPAIGNS → CHECK_QUEUE → GENERATE →
// COMPLIANCE → SCHEDULE → PUBLISH → METRICS →
// LEARN → REGENERATE
// ============================================

interface LoopResult {
  timestamp: number;
  campaignsChecked: number;
  contentGenerated: number;
  contentScheduled: number;
  contentPublished: number;
  safetyChecks: number;
  metricsCollected: number;
  errors: string[];
  nextRunAt: number;
}

/**
 * La lógica del loop accede a `scheduledAt` y `contentId` sobre las piezas
 * (campos que en runtime pueden venir de `metadata`). Se declaran como
 * opcionales para describir esa expectativa sin ocultar errores con `any`.
 */
type LoopPiece = Doc<"contentPieces"> & {
  scheduledAt?: number;
  contentId?: Id<"contentPieces">;
};

export const runAutonomousLoop = action({
  args: {
    forceRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<LoopResult> => {
    const startTime = Date.now();
    const errors: string[] = [];

    const settings = await ctx.runQuery(api.autopilot.getSettings);
    if (settings?.level === "STOPPED" && !args.forceRun) {
      return {
        timestamp: startTime,
        campaignsChecked: 0,
        contentGenerated: 0,
        contentScheduled: 0,
        contentPublished: 0,
        safetyChecks: 0,
        metricsCollected: 0,
        errors: ["Autopilot paused"],
        nextRunAt: startTime + 30 * 60 * 1000,
      };
    }

    let contentGenerated = 0;
    let contentScheduled = 0;
    let contentPublished = 0;
    let safetyChecks = 0;
    let metricsCollected = 0;

    const campaigns: Array<{
      _id: Id<"campaigns">;
      name: string;
      autopilotLevel?: string;
      queueMinimum?: number;
      brandProfileId?: Id<"brandProfiles">;
    }> = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });

    for (const campaign of campaigns) {
      try {
        if (campaign.autopilotLevel === "MANUAL") continue;

        const pieces: LoopPiece[] = await ctx.runQuery(
          api.contentPieces.getByCampaign,
          { campaignId: campaign._id }
        );

        const queueMinimum = campaign.queueMinimum || 7;
        const generated = pieces.filter((p: LoopPiece) => p.status === "GENERATED");
        const scheduled = pieces.filter((p: LoopPiece) => p.status === "SCHEDULED");

        // Auto-refill if queue is low
        if (generated.length < queueMinimum) {
          try {
            const result = await ctx.runAction(api.actions.autoRefill.checkAndRefill, {
              campaignId: campaign._id,
            });
            contentGenerated += result.totalGenerated;
          } catch (e) {
            errors.push(`Refill ${campaign.name}: ${e instanceof Error ? e.message : "failed"}`);
          }
        }

        // Schedule unscheduled content
        const unscheduled = generated.filter(
          (p: LoopPiece) =>
            !scheduled.some((s: LoopPiece) => s.contentId === p._id)
        );

        if (unscheduled.length > 0) {
          for (const piece of unscheduled.slice(0, 3)) {
            try {
              const safetyResult = await ctx.runAction(api.actions.safetyCheck.checkPublicationSafety, {
                contentPieceId: piece._id,
                platform: piece.platform,
              });
              safetyChecks++;

              if (safetyResult.approved) {
                contentScheduled++;
              }
            } catch (e) {
              errors.push(`Safety check ${piece._id}: ${e instanceof Error ? e.message : "failed"}`);
            }
          }
        }

        // Publish ready content
        const readyToPublish = scheduled.filter(
          (p: LoopPiece) =>
            p.status === "SCHEDULED" && (!p.scheduledAt || p.scheduledAt <= Date.now())
        );

        if (readyToPublish.length > 0 && campaign.autopilotLevel === "AUTONOMOUS") {
          for (const piece of readyToPublish.slice(0, 2)) {
            try {
              if (piece._id) {
                const scheduledPost = await ctx.runQuery(
                  api.scheduledPosts.getByContentPiece,
                  { contentPieceId: piece._id }
                );
                if (scheduledPost) {
                  await ctx.runAction(api.actions.socialPublish.publishByPlatform, {
                    scheduledPostId: scheduledPost._id,
                  });
                  contentPublished++;
                }
              }
            } catch (error) {
              const msg = error instanceof Error ? error.message : "Publish failed";
              errors.push(`Publish ${piece._id}: ${msg}`);
            }
          }
        }

        // Collect metrics
        const published = pieces.filter((p: LoopPiece) => p.status === "PUBLISHED");
        if (published.length > 0) {
          try {
            const today = new Date().toISOString().split("T")[0];
            await ctx.runAction(api.actions.collectAnalytics.collectAllAnalytics, { date: today });
            metricsCollected++;
          } catch (e) {
            errors.push(`Analytics: ${e instanceof Error ? e.message : "failed"}`);
          }
        }

        const healthScore = calculateHealthScore(
          generated.length,
          scheduled.length,
          published.length,
          pieces.length
        );

        await ctx.runMutation(api.campaigns.update, {
          id: campaign._id,
          healthScore,
          lastGeneratedAt: Date.now(),
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Campaign ${campaign.name}: ${msg}`);
      }
    }

    const nextRunAt = startTime + 15 * 60 * 1000;

    return {
      timestamp: startTime,
      campaignsChecked: campaigns.length,
      contentGenerated,
      contentScheduled,
      contentPublished,
      safetyChecks,
      metricsCollected,
      errors,
      nextRunAt,
    };
  },
});

function calculateHealthScore(
  generated: number,
  scheduled: number,
  published: number,
  total: number
): number {
  if (total === 0) return 50;

  const queueScore = Math.min(100, (generated / 7) * 100);
  const scheduledScore = Math.min(100, (scheduled / 3) * 100);
  const publishedScore = Math.min(100, (published / Math.max(total * 0.3, 1)) * 100);

  return Math.round(queueScore * 0.4 + scheduledScore * 0.3 + publishedScore * 0.3);
}
