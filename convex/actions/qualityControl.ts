"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

interface QualityResult {
  overallScore: number;
  checks: QualityCheck[];
  passed: boolean;
  summary: string;
}

function checkSpelling(text: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const words = text.split(/\s+/);
  const longWords = words.filter((w) => w.length > 15);
  if (longWords.length > 0) {
    issues.push(`Palabras sospechosamente largas: ${longWords.slice(0, 3).join(", ")}`);
  }

  const repeated = text.match(/(\b\w+\b)\s+\1\b/gi);
  if (repeated && repeated.length > 2) {
    issues.push("Palabras repetidas consecutivamente");
    suggestions.push("Revisá la repetición de palabras");
  }

  const score = issues.length === 0 ? 95 : Math.max(50, 95 - issues.length * 15);

  return {
    name: "Ortografía",
    passed: score >= 70,
    score,
    issues,
    suggestions,
  };
}

function checkClarity(text: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgLength =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  if (avgLength > 20) {
    issues.push("Oraciones demasiado largas");
    suggestions.push("Dividí las oraciones largas en partes más cortas");
  }

  if (sentences.length > 0 && avgLength < 3) {
    issues.push("Oraciones demasiado cortas");
    suggestions.push("Agregá más contexto a las oraciones");
  }

  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 5) {
    suggestions.push("Considerá usar menos párrafos para mejor legibilidad");
  }

  const score = issues.length === 0 ? 90 : Math.max(50, 90 - issues.length * 20);

  return {
    name: "Claridad",
    passed: score >= 70,
    score,
    issues,
    suggestions,
  };
}

function checkCTAPresence(text: string, cta: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!cta || cta.length < 5) {
    issues.push("CTA ausente o demasiado corto");
    suggestions.push("Agregá un call-to-action claro y directo");
  }

  const hasQuestion = /\?|¿/.test(text);
  if (!hasQuestion && cta) {
    suggestions.push("Considerá agregar una pregunta para aumentar engagement");
  }

  const score = issues.length === 0 ? 85 : 40;

  return {
    name: "CTA",
    passed: score >= 60,
    score,
    issues,
    suggestions,
  };
}

function checkRepetition(text: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const words = text.toLowerCase().split(/\s+/);
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 4) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  }

  const repeated = Object.entries(wordCount).filter(([, count]) => count > 3);
  if (repeated.length > 0) {
    issues.push(`Palabras repetidas: ${repeated.map(([w]) => w).join(", ")}`);
    suggestions.push("Usá sinónimos para evitar repetición");
  }

  const score = issues.length === 0 ? 90 : Math.max(50, 90 - issues.length * 20);

  return {
    name: "Repetición",
    passed: score >= 70,
    score,
    issues,
    suggestions,
  };
}

function checkCoherence(text: string, topic: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const textLower = text.toLowerCase();
  const found = topicWords.filter((w) => textLower.includes(w));

  if (topicWords.length > 0 && found.length === 0) {
    issues.push("El contenido no parece relacionado con el tema");
    suggestions.push("Agregá palabras clave del tema al contenido");
  }

  const score = found.length > 0 || topicWords.length === 0 ? 85 : 50;

  return {
    name: "Coherencia",
    passed: score >= 60,
    score,
    issues,
    suggestions,
  };
}

function checkPlatformFormat(text: string, platform: string): QualityCheck {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const limits: Record<string, number> = {
    instagram: 2200,
    facebook: 63206,
    tiktok: 2200,
    x: 280,
    youtube: 5000,
    linkedin: 3000,
  };

  const limit = limits[platform] || 2200;
  if (text.length > limit) {
    issues.push(`Excede límite de ${platform}: ${text.length}/${limit}`);
    suggestions.push(`Acortá el texto a ${limit} caracteres o menos`);
  }

  const score = issues.length === 0 ? 90 : 30;

  return {
    name: "Formato",
    passed: score >= 60,
    score,
    issues,
    suggestions,
  };
}

export const validateContentQuality = action({
  args: {
    contentPieceId: v.id("contentPieces"),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.get, { id: args.contentPieceId });
    if (!piece) throw new Error("Content piece not found");

    const fullText = `${piece.hook}\n\n${piece.body}`;

    const checks: QualityCheck[] = [
      checkSpelling(fullText),
      checkClarity(piece.body),
      checkCTAPresence(piece.body, piece.cta),
      checkRepetition(fullText),
      checkCoherence(fullText, piece.title),
      checkPlatformFormat(fullText, piece.platform),
    ];

    const overallScore = Math.round(
      checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    );

    const passed = overallScore >= 70;
    const allIssues = checks.flatMap((c) => c.issues);
    const allSuggestions = checks.flatMap((c) => c.suggestions);

    const summary = passed
      ? `Contenido de calidad (${overallScore}/100)`
      : `Requiere mejoras: ${allIssues.join("; ")}`;

    return {
      overallScore,
      checks,
      passed,
      summary,
      issues: allIssues,
      suggestions: allSuggestions,
    } as QualityResult;
  },
});

export const batchQualityCheck = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const results: { pieceId: any; score: number; passed: boolean; issues: string[] }[] = [];

    for (const piece of pieces) {
      try {
        const fullText = `${piece.hook}\n\n${piece.body}`;

        const checks: QualityCheck[] = [
          checkSpelling(fullText),
          checkClarity(piece.body),
          checkCTAPresence(piece.body, piece.cta),
          checkRepetition(fullText),
          checkCoherence(fullText, piece.title),
          checkPlatformFormat(fullText, piece.platform),
        ];

        const overallScore = Math.round(
          checks.reduce((sum, c) => sum + c.score, 0) / checks.length
        );

        results.push({
          pieceId: piece._id,
          score: overallScore,
          passed: overallScore >= 70,
          issues: checks.flatMap((c) => c.issues),
        });
      } catch (error) {
        console.error(`Quality check failed for ${piece._id}:`, error);
      }
    }

    return {
      campaignId: args.campaignId,
      results,
      totalChecked: results.length,
      passed: results.filter((r) => r.passed).length,
      needsImprovement: results.filter((r) => !r.passed).length,
      averageScore: Math.round(
        results.reduce((sum, r) => sum + r.score, 0) / Math.max(results.length, 1)
      ),
    };
  },
});
