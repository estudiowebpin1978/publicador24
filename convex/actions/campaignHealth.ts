"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// CAMPAIGN HEALTH + COST CONTROL + KILL SWITCH
// ============================================

interface HealthReport {
  campaignId: string;
  name: string;
  healthScore: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "STOPPED";
  issues: string[];
  recommendations: string[];
  metrics: {
    contentGenerated: number;
    contentScheduled: number;
    contentPublished: number;
    averageEngagement: number;
    costToDate: number;
  };
}

export const getCampaignHealth = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args): Promise<HealthReport> => {
    const campaign = await ctx.runQuery(api.campaigns.getById, { id: args.campaignId });
    if (!campaign) throw new Error("Campaign not found");

    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const generated = pieces.filter((p) => p.status === "GENERATED");
    const scheduled = pieces.filter((p) => p.status === "SCHEDULED");
    const published = pieces.filter((p) => p.status === "PUBLISHED");

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (generated.length < 3) {
      issues.push("Cola de contenido baja");
      recommendations.push("Generar más contenido para mantener flujo constante");
    }

    if (scheduled.length === 0 && published.length === 0) {
      issues.push("No hay contenido programado ni publicado");
      recommendations.push("Iniciar programación de contenido generado");
    }

    const lastGenerated = campaign.lastGeneratedAt || 0;
    const daysSinceGeneration = (Date.now() - lastGenerated) / (1000 * 60 * 60 * 24);
    if (daysSinceGeneration > 3) {
      issues.push("Contenido no generado en más de 3 días");
      recommendations.push("Verificar que el generador automático esté funcionando");
    }

    const healthScore = calculateDetailedHealth(generated, scheduled, published, pieces.length);

    let status: "HEALTHY" | "WARNING" | "CRITICAL" | "STOPPED" = "HEALTHY";
    if (healthScore < 30) status = "CRITICAL";
    else if (healthScore < 60) status = "WARNING";

    if (campaign.status === "PAUSED") status = "STOPPED";

    return {
      campaignId: args.campaignId,
      name: campaign.name,
      healthScore,
      status,
      issues,
      recommendations,
      metrics: {
        contentGenerated: generated.length,
        contentScheduled: scheduled.length,
        contentPublished: published.length,
        averageEngagement: 0,
        costToDate: 0,
      },
    };
  },
});

export const getGlobalHealth = action({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.runQuery(api.campaigns.list, { status: "ACTIVE" });
    const reports: HealthReport[] = [];

    for (const campaign of campaigns) {
      try {
        const report = await ctx.runAction(api.campaignHealth.getCampaignHealth, {
          campaignId: campaign._id,
        });
        reports.push(report);
      } catch {
        // skip failed campaigns
      }
    }

    const avgScore = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.healthScore, 0) / reports.length
      : 0;

    return {
      overallScore: Math.round(avgScore),
      campaigns: reports,
      criticalCount: reports.filter((r) => r.status === "CRITICAL").length,
      warningCount: reports.filter((r) => r.status === "WARNING").length,
    };
  },
});

function calculateDetailedHealth(
  generated: any[],
  scheduled: any[],
  published: any[],
  total: number
): number {
  if (total === 0) return 0;

  const queueScore = Math.min(100, (generated.length / 7) * 100) * 0.3;
  const scheduleScore = Math.min(100, (scheduled.length / 3) * 100) * 0.3;
  const publishScore = Math.min(100, (published.length / Math.max(total * 0.3, 1)) * 100) * 0.4;

  return Math.round(queueScore + scheduleScore + publishScore);
}

// ============================================
// COST CONTROL
// ============================================

interface CostStatus {
  date: string;
  tokensUsed: number;
  tokensLimit: number;
  costUsd: number;
  costLimit: number;
  operationsCount: number;
  withinLimits: boolean;
  warningMessage: string | null;
}

export const checkCostLimits = action({
  args: {},
  handler: async (ctx): Promise<CostStatus> => {
    const today = new Date().toISOString().split("T")[0];

    const usage = await ctx.runQuery(api.aiUsage.getByDate, { date: today });

    const TOKEN_LIMIT = 100000;
    const COST_LIMIT = 1.0;

    const tokensUsed = usage?.totalTokens || 0;
    const costUsd = usage?.totalCost || 0;
    const operationsCount = usage?.operationsCount || 0;

    let warningMessage: string | null = null;
    if (tokensUsed > TOKEN_LIMIT * 0.8) {
      warningMessage = `Alerta: ${Math.round((tokensUsed / TOKEN_LIMIT) * 100)}% de tokens utilizados hoy`;
    } else if (costUsd > COST_LIMIT * 0.8) {
      warningMessage = `Alerta: $${costUsd.toFixed(2)} de $${COST_LIMIT} de costo diario`;
    }

    return {
      date: today,
      tokensUsed,
      tokensLimit: TOKEN_LIMIT,
      costUsd,
      costLimit: COST_LIMIT,
      operationsCount,
      withinLimits: tokensUsed < TOKEN_LIMIT && costUsd < COST_LIMIT,
      warningMessage,
    };
  },
});

// ============================================
// GLOBAL KILL SWITCH
// ============================================

export const setGlobalKillSwitch = action({
  args: {
    paused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.autopilot.getSettings);

    if (settings) {
      await ctx.runMutation(api.autopilot.updateSettings, {
        level: args.paused ? "STOPPED" : "FULL",
      });
    } else {
      await ctx.runMutation(api.autopilot.updateSettings, {
        level: args.paused ? "STOPPED" : "FULL",
        platformFrequencies: {
          instagram: "3-5x por semana",
          x: "1-2x por semana",
          facebook: "2-3x por semana",
          linkedin: "1-2x por semana",
          tiktok: "3-5x por semana",
        },
        topics: "",
        contentPillars: "",
        topicsToAvoid: "",
        timeZone: "America/Argentina/Buenos_Aires",
        preferredTimeSlots: "9-12, 17-21",
        excludedDays: [],
        contentGuidelines: "",
        approvalRequirements: "Sin aprobación requerida",
      });
    }

    return { paused: args.paused };
  },
});

export const getAutomationStatus = action({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.runQuery(api.autopilot.getSettings);
    const costStatus = await ctx.runAction(api.costControl.checkCostLimits, {});

    return {
      isRunning: settings?.level !== "STOPPED",
      level: settings?.level || "OFF",
      costStatus,
    };
  },
});
