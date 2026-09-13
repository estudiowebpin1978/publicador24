"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "../_generated/server";

// ============================================
// CAMPAIGN ORCHESTRATOR
// Central engine that coordinates all campaigns
// ============================================

interface OrchestratorResult {
  campaignsProcessed: number;
  jobsCreated: number;
  errors: string[];
  durationMs: number;
}

interface CampaignStatus {
  campaignId: string;
  name: string;
  status: string;
  autopilotLevel: string;
  healthScore: number;
  contentAvailable: number;
  scheduledCount: number;
  publishedCount: number;
  needsContent: boolean;
  needsImages: boolean;
  nextPostAt: number | null;
}

const MIN_QUEUE_SIZE = 7;
const MAX_CONCURRENT_JOBS = 10;

export const getCampaignStatuses = action({
  args: {},
  handler: async (ctx): Promise<CampaignStatus[]> => {
    const campaigns = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });
    const statuses: CampaignStatus[] = [];

    for (const campaign of campaigns) {
      const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
        campaignId: campaign._id,
      });

      const scheduled = pieces.filter((p) => p.status === "SCHEDULED");
      const generated = pieces.filter((p) => p.status === "GENERATED");
      const published = pieces.filter((p) => p.status === "PUBLISHED");

      const needsContent = generated.length < MIN_QUEUE_SIZE;
      const healthScore = calculateHealthScore(
        generated.length,
        scheduled.length,
        published.length,
        campaign.contentCount
      );

      statuses.push({
        campaignId: campaign._id,
        name: campaign.name,
        status: campaign.status,
        autopilotLevel: campaign.autopilotLevel || "ASSISTED",
        healthScore,
        contentAvailable: generated.length,
        scheduledCount: scheduled.length,
        publishedCount: published.length,
        needsContent,
        needsImages: generated.some((p) => !p.imageUrl && p.imagePrompt),
        nextPostAt: null,
      });
    }

    return statuses;
  },
});

export const runOrchestrator = action({
  args: {},
  handler: async (ctx): Promise<OrchestratorResult> => {
    const startTime = Date.now();
    const errors: string[] = [];
    let jobsCreated = 0;

    const globalSettings = await ctx.runQuery(api.autopilot.getSettings);
    if (globalSettings?.level === "STOPPED") {
      return {
        campaignsProcessed: 0,
        jobsCreated: 0,
        errors: ["Automation is paused (global kill switch active)"],
        durationMs: Date.now() - startTime,
      };
    }

    const campaigns = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });

    for (const campaign of campaigns) {
      try {
        if (campaign.autopilotLevel === "MANUAL") continue;

        const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
          campaignId: campaign._id,
        });

        const generated = pieces.filter((p) => p.status === "GENERATED");
        const scheduled = pieces.filter((p) => p.status === "SCHEDULED");
        const queueMinimum = campaign.queueMinimum || MIN_QUEUE_SIZE;

        if (generated.length < queueMinimum && campaign.autopilotLevel !== "MANUAL") {
          const needed = queueMinimum - generated.length;
          await createContentGenerationJob(ctx, campaign._id, needed);
          jobsCreated++;
        }

        const unscheduled = generated.filter((p) => {
          return !scheduled.some((s) => s.contentId === p._id);
        });

        if (unscheduled.length > 0 && scheduled.length < MAX_CONCURRENT_JOBS) {
          await createSchedulingJob(ctx, campaign._id, unscheduled.slice(0, 3));
          jobsCreated++;
        }

        if (campaign.autopilotLevel === "AUTONOMOUS") {
          const unpublished = pieces.filter(
            (p) => p.status === "SCHEDULED" && !scheduled.some((s) => s.contentId === p._id)
          );
          if (unpublished.length > 0) {
            await createPublishJob(ctx, campaign._id, unpublished.slice(0, 2));
            jobsCreated++;
          }
        }

        await updateCampaignHealth(ctx, campaign._id, pieces);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Campaign ${campaign.name}: ${msg}`);
      }
    }

    return {
      campaignsProcessed: campaigns.length,
      jobsCreated,
      errors,
      durationMs: Date.now() - startTime,
    };
  },
});

async function createContentGenerationJob(
  ctx: ActionCtx,
  campaignId: string,
  count: number
) {
  const idempotencyKey = `gen_content_${campaignId}_${Date.now()}`;

  await ctx.runMutation(api.jobs.create, {
    jobType: "generate_content",
    jobKey: `content_${campaignId}`,
    idempotencyKey,
    status: "PENDING",
    campaignId: campaignId,
    priority: 2,
    payload: { campaignId, count },
    attempts: 0,
    maxAttempts: 3,
  });
}

async function createSchedulingJob(
  ctx: ActionCtx,
  campaignId: string,
  pieces: any[]
) {
  const idempotencyKey = `schedule_${campaignId}_${Date.now()}`;

  await ctx.runMutation(api.jobs.create, {
    jobType: "schedule_content",
    jobKey: `schedule_${campaignId}`,
    idempotencyKey,
    status: "PENDING",
    campaignId: campaignId,
    priority: 1,
    payload: { campaignId, pieceIds: pieces.map((p) => p._id) },
    attempts: 0,
    maxAttempts: 3,
  });
}

async function createPublishJob(
  ctx: ActionCtx,
  campaignId: string,
  pieces: any[]
) {
  const idempotencyKey = `publish_${campaignId}_${Date.now()}`;

  await ctx.runMutation(api.jobs.create, {
    jobType: "publish_content",
    jobKey: `publish_${campaignId}`,
    idempotencyKey,
    status: "PENDING",
    campaignId: campaignId,
    priority: 0,
    payload: { campaignId, pieceIds: pieces.map((p) => p._id) },
    attempts: 0,
    maxAttempts: 3,
  });
}

function calculateHealthScore(
  generated: number,
  scheduled: number,
  published: number,
  totalCount: number
): number {
  if (totalCount === 0) return 50;

  const queueScore = Math.min(100, (generated / MIN_QUEUE_SIZE) * 100);
  const scheduledScore = Math.min(100, (scheduled / 3) * 100);
  const publishedScore = Math.min(100, (published / Math.max(totalCount * 0.3, 1)) * 100);

  return Math.round(queueScore * 0.4 + scheduledScore * 0.3 + publishedScore * 0.3);
}

async function updateCampaignHealth(
  ctx: ActionCtx,
  campaignId: string,
  pieces: any[]
) {
  const generated = pieces.filter((p) => p.status === "GENERATED").length;
  const scheduled = pieces.filter((p) => p.status === "SCHEDULED").length;
  const published = pieces.filter((p) => p.status === "PUBLISHED").length;

  const healthScore = calculateHealthScore(
    generated,
    scheduled,
    published,
    pieces.length
  );

  await ctx.runMutation(api.campaigns.update, {
    id: campaignId,
    healthScore,
  });
}
