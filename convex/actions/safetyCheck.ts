"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { maxSimilarityVs } from "../../shared/text-similarity";
import { findProhibitedClaims } from "../../shared/prohibited-claims";

interface SafetyCheck {
  name: string;
  passed: boolean;
  score: number;
  reason: string;
}

interface SafetyResult {
  overallScore: number;
  level: "safe" | "low_risk" | "review" | "high_risk" | "blocked";
  checks: SafetyCheck[];
  approved: boolean;
  reason: string;
}

function checkDuplication(text: string, existingTexts: string[]): SafetyCheck {
  // Único algoritmo del sistema (compartido con src/): shared/text-similarity.ts
  const { similarity: maxSimilarity, isDuplicate } = maxSimilarityVs(text, existingTexts);

  const passed = !isDuplicate;
  const score = Math.round((1 - maxSimilarity) * 100);

  return {
    name: "Duplicación",
    passed,
    score,
    reason: passed
      ? `Contenido único (similitud máxima: ${Math.round(maxSimilarity * 100)}%)`
      : `Posible duplicado detectado (similitud: ${Math.round(maxSimilarity * 100)}%)`,
  };
}

function checkFrequency(
  platform: string,
  postsLast24h: number,
  postsLastWeek: number
): SafetyCheck {
  const dailyLimits: Record<string, number> = {
    instagram: 5,
    facebook: 5,
    tiktok: 5,
    x: 10,
    youtube: 2,
    linkedin: 3,
  };

  const weeklyLimits: Record<string, number> = {
    instagram: 25,
    facebook: 25,
    tiktok: 25,
    x: 50,
    youtube: 10,
    linkedin: 15,
  };

  const dailyLimit = dailyLimits[platform] || 5;
  const weeklyLimit = weeklyLimits[platform] || 25;

  const dailyRatio = postsLast24h / dailyLimit;
  const weeklyRatio = postsLastWeek / weeklyLimit;
  const worstRatio = Math.max(dailyRatio, weeklyRatio);

  const passed = worstRatio < 0.9;
  const score = Math.round((1 - worstRatio) * 100);

  return {
    name: "Frecuencia",
    passed,
    score,
    reason: passed
      ? `Dentro de límites (${postsLast24h}/${dailyLimit} hoy, ${postsLastWeek}/${weeklyLimit} semana)`
      : `Frecuencia alta (${postsLast24h}/${dailyLimit} hoy, ${postsLastWeek}/${weeklyLimit} semana)`,
  };
}

function checkContentSafety(text: string): SafetyCheck {
  const riskyPatterns = [
    { pattern: /\b(gratis|100%|sin costo|dinero fácil|hazte rico)\b/gi, risk: "spam", weight: 0.3 },
    { pattern: /\b(compra ahora|no esperes|última oportunidad|urgente)\b/gi, risk: "urgency", weight: 0.2 },
    { pattern: /\b(garantizado|resultados seguros|sin riesgo)\b/gi, risk: "claims", weight: 0.25 },
    { pattern: /\b(testimonio falso|reseña falsa)\b/gi, risk: "fraud", weight: 0.5 },
  ];

  let riskScore = 0;
  const risks: string[] = [];

  for (const { pattern, risk, weight } of riskyPatterns) {
    if (pattern.test(text)) {
      riskScore += weight;
      risks.push(risk);
    }
  }

  const score = Math.round((1 - riskScore) * 100);
  const passed = riskScore < 0.5;

  return {
    name: "Contenido",
    passed,
    score,
    reason: passed
      ? "Contenido dentro de parámetros normales"
      : `Riesgos detectados: ${risks.join(", ")}`,
  };
}

function checkLength(text: string, platform: string): SafetyCheck {
  const limits: Record<string, number> = {
    instagram: 2200,
    facebook: 63206,
    tiktok: 2200,
    x: 280,
    youtube: 5000,
    linkedin: 3000,
  };

  const limit = limits[platform] || 2200;
  const ratio = text.length / limit;
  const passed = ratio <= 1;
  const score = passed ? Math.round((1 - ratio) * 100) : 0;

  return {
    name: "Longitud",
    passed,
    score,
    reason: passed
      ? `${text.length}/${limit} caracteres (${Math.round(ratio * 100)}%)`
      : `Excede límite: ${text.length}/${limit} caracteres`,
  };
}

function checkHashtags(hashtags: string[], platform: string): SafetyCheck {
  const limits: Record<string, number> = {
    instagram: 30,
    facebook: 10,
    tiktok: 30,
    x: 10,
    youtube: 15,
    linkedin: 10,
  };

  const limit = limits[platform] || 15;
  const count = hashtags.length;
  const passed = count <= limit && count >= 1;
  const score = passed ? Math.round((1 - Math.abs(count - 5) / limit) * 100) : 0;

  return {
    name: "Hashtags",
    passed,
    score,
    reason: passed
      ? `${count} hashtags (límite: ${limit})`
      : `${count} hashtags excede límite de ${limit}`,
  };
}

function checkCTA(cta: string): SafetyCheck {
  if (!cta || cta.length < 5) {
    return {
      name: "CTA",
      passed: false,
      score: 0,
      reason: "CTA ausente o demasiado corto",
    };
  }

  const spammyWords = /\b(gratis|100%|ahora ya|no esperes|hazte rico)\b/gi;
  const isSpammy = spammyWords.test(cta);
  const passed = !isSpammy && cta.length >= 5 && cta.length <= 200;
  const score = passed ? 85 : 40;

  return {
    name: "CTA",
    passed,
    score,
    reason: passed
      ? "CTA apropiado"
      : "CTA potencialmente problemático o fuera de rango",
  };
}

/**
 * Promesas prohibidas (ganancia garantizada, estadísticas de ganancias
 * inventadas). Compartido con src/ via shared/prohibited-claims.ts.
 * NO ponderado por score: si falla, el contenido queda bloqueado igual.
 */
function checkProhibitedClaims(text: string): SafetyCheck {
  const found = findProhibitedClaims(text);
  const passed = found.length === 0;

  return {
    name: "Promesas",
    passed,
    score: passed ? 100 : 0,
    reason: passed
      ? "Sin promesas prohibidas"
      : `Promesa prohibida: ${found.join(", ")}`,
  };
}

function calculateOverallLevel(score: number): SafetyResult["level"] {
  if (score >= 90) return "safe";
  if (score >= 75) return "low_risk";
  if (score >= 55) return "review";
  if (score >= 30) return "high_risk";
  return "blocked";
}

export const checkPublicationSafety = action({
  args: {
    contentPieceId: v.id("contentPieces"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.getById, { id: args.contentPieceId });
    if (!piece) throw new Error("Content piece not found");

    const existingPieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: piece.campaignId,
    });

    const existingTexts = existingPieces
      .filter((p) => p._id !== args.contentPieceId)
      .map((p) => `${p.hook} ${p.body}`);

    const fullText = `${piece.hook}\n\n${piece.body}\n\n${piece.cta}`;

    const claimsCheck = checkProhibitedClaims(fullText);

    const checks: SafetyCheck[] = [
      checkDuplication(fullText, existingTexts),
      checkFrequency(args.platform, 2, 8),
      checkContentSafety(fullText),
      checkLength(piece.body, args.platform),
      checkHashtags(piece.hashtags, args.platform),
      checkCTA(piece.cta),
      claimsCheck,
    ];

    const overallScore = Math.round(
      checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    );

    const level = calculateOverallLevel(overallScore);
    // Una promesa prohibida bloquea aunque el promedio general esté alto.
    const approved = claimsCheck.passed && (level === "safe" || level === "low_risk");

    const result: SafetyResult = {
      overallScore,
      level,
      checks,
      approved,
      reason: approved
        ? "Contenido aprobado para publicación"
        : !claimsCheck.passed
          ? claimsCheck.reason
          : `Requiere revisión: nivel ${level}`,
    };

    await ctx.runMutation(api.publicationSafety.create, {
      contentPieceId: args.contentPieceId,
      platform: args.platform,
      safetyScore: overallScore,
      checks,
      approved,
      reason: result.reason,
    });

    return result;
  },
});

export const batchSafetyCheck = action({
  args: {
    campaignId: v.id("campaigns"),
    platforms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const results: { pieceId: any; platform: string; score: number; level: string; approved: boolean }[] = [];

    for (const piece of pieces) {
      for (const platform of args.platforms) {
        try {
          const fullText = `${piece.hook}\n\n${piece.body}\n\n${piece.cta}`;

          const checks: SafetyCheck[] = [
            checkDuplication(fullText, []),
            checkFrequency(platform, 2, 8),
            checkContentSafety(fullText),
            checkLength(piece.body, platform),
            checkHashtags(piece.hashtags, platform),
            checkCTA(piece.cta),
          ];

          const overallScore = Math.round(
            checks.reduce((sum, c) => sum + c.score, 0) / checks.length
          );

          const level = calculateOverallLevel(overallScore);
          const approved = level === "safe" || level === "low_risk";

          await ctx.runMutation(api.publicationSafety.create, {
            contentPieceId: piece._id,
            platform,
            safetyScore: overallScore,
            checks,
            approved,
            reason: approved ? "Aprobado" : `Requiere revisión: ${level}`,
          });

          results.push({
            pieceId: piece._id,
            platform,
            score: overallScore,
            level,
            approved,
          });
        } catch (error) {
          console.error(`Safety check failed for ${piece._id} on ${platform}:`, error);
        }
      }
    }

    return {
      campaignId: args.campaignId,
      results,
      totalChecked: results.length,
      approved: results.filter((r) => r.approved).length,
      needsReview: results.filter((r) => !r.approved).length,
    };
  },
});
