"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

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

export const runAutonomousLoop = action({
  args: {
    forceRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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

    const campaigns = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });

    for (const campaign of campaigns) {
      try {
        if (campaign.autopilotLevel === "MANUAL") continue;

        const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
          campaignId: campaign._id,
        });

        const queueMinimum = campaign.queueMinimum || 7;
        const generated = pieces.filter((p) => p.status === "GENERATED");
        const scheduled = pieces.filter((p) => p.status === "SCHEDULED");

        if (generated.length < queueMinimum) {
          const needed = Math.min(queueMinimum - generated.length, 5);
          const result = await ctx.runAction(api.autoRefill.checkAndRefill, {
            campaignId: campaign._id,
          });
          contentGenerated += result.totalGenerated;
        }

        const unscheduled = generated.filter((p) =>
          !scheduled.some((s) => s.contentId === p._id)
        );

        if (unscheduled.length > 0) {
          for (const piece of unscheduled.slice(0, 3)) {
            const safetyResult = await ctx.runAction(api.safetyCheck.checkPublicationSafety, {
              contentPieceId: piece._id,
              platform: piece.platform,
            });
            safetyChecks++;

            if (safetyResult.approved) {
              contentScheduled++;
            }
          }
        }

        const readyToPublish = scheduled.filter(
          (p) => p.status === "SCHEDULED" && (!p.scheduledAt || p.scheduledAt <= Date.now())
        );

        if (readyToPublish.length > 0 && campaign.autopilotLevel === "AUTONOMOUS") {
          for (const piece of readyToPublish.slice(0, 2)) {
            try {
              await ctx.runAction(api.socialPublish.publishToBuffer, {
                contentPieceId: piece.contentId,
                platform: piece.platform,
              });
              contentPublished++;
            } catch (error) {
              const msg = error instanceof Error ? error.message : "Publish failed";
              errors.push(`Publish ${piece.contentId}: ${msg}`);
            }
          }
        }

        const published = pieces.filter((p) => p.status === "PUBLISHED");
        if (published.length > 0) {
          await ctx.runAction(api.collectAnalytics.collectAllAnalytics, {});
          metricsCollected++;
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
