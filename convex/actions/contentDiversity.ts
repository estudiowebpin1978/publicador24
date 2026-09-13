"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// CONTENT DIVERSITY ENGINE
// Prevents repetition across hooks, visuals,
// CTAs, formats, hashtags
// ============================================

interface DiversityCheck {
  isDiverse: boolean;
  similarityScore: number;
  conflicts: string[];
  suggestions: string[];
}

export const checkDiversity = action({
  args: {
    campaignId: v.id("campaigns"),
    newHook: v.string(),
    newContentType: v.string(),
    newCta: v.string(),
    newHashtags: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<DiversityCheck> => {
    const existingPieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const conflicts: string[] = [];
    const suggestions: string[] = [];
    let totalSimilarity = 0;
    let checksCount = 0;

    const hookSimilarity = checkHookDiversity(args.newHook, existingPieces.map((p) => p.hook));
    totalSimilarity += hookSimilarity.score;
    checksCount++;
    if (hookSimilarity.score > 0.7) {
      conflicts.push(`Hook too similar to existing content (${Math.round(hookSimilarity.score * 100)}%)`);
      suggestions.push(`Try a different angle: ${hookSimilarity.suggestion}`);
    }

    const formatDiversity = checkFormatDiversity(args.newContentType, existingPieces.map((p) => p.contentType));
    totalSimilarity += formatDiversity.score;
    checksCount++;
    if (formatDiversity.score > 0.6) {
      conflicts.push(`Format "${args.newContentType}" overused (${Math.round(formatDiversity.score * 100)}%)`);
      suggestions.push(`Consider using: ${formatDiversity.suggestion}`);
    }

    const ctaSimilarity = checkCtaDiversity(args.newCta, existingPieces.map((p) => p.cta));
    totalSimilarity += ctaSimilarity.score;
    checksCount++;
    if (ctaSimilarity.score > 0.7) {
      conflicts.push(`CTA too similar to existing ones`);
      suggestions.push(`Try a different CTA: ${ctaSimilarity.suggestion}`);
    }

    const hashtagOverlap = checkHashtagDiversity(args.newHashtags, existingPieces.map((p) => p.hashtags));
    totalSimilarity += hashtagOverlap.score;
    checksCount++;
    if (hashtagOverlap.score > 0.6) {
      conflicts.push(`Hashtag overlap too high (${Math.round(hashtagOverlap.score * 100)}%)`);
      suggestions.push(`Add unique hashtags: ${hashtagOverlap.suggestion}`);
    }

    const avgSimilarity = checksCount > 0 ? totalSimilarity / checksCount : 0;

    return {
      isDiverse: avgSimilarity < 0.6,
      similarityScore: avgSimilarity,
      conflicts,
      suggestions,
    };
  },
});

function checkHookDiversity(newHook: string, existingHooks: string[]) {
  if (existingHooks.length === 0) return { score: 0, suggestion: "" };

  const newWords = new Set(newHook.toLowerCase().split(/\s+/));
  let maxOverlap = 0;

  for (const hook of existingHooks) {
    const existingWords = new Set(hook.toLowerCase().split(/\s+/));
    const intersection = [...newWords].filter((w) => existingWords.has(w));
    const union = new Set([...newWords, ...existingWords]);
    const overlap = intersection.length / union.size;
    maxOverlap = Math.max(maxOverlap, overlap);
  }

  const suggestions = [
    "Try a question hook",
    "Use a statistic or number",
    "Tell a short story",
    "Be provocative",
    "Create curiosity",
  ];

  return {
    score: maxOverlap,
    suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
  };
}

function checkFormatDiversity(newFormat: string, existingFormats: string[]) {
  if (existingFormats.length === 0) return { score: 0, suggestion: "" };

  const count = existingFormats.filter((f) => f === newFormat).length;
  const ratio = count / existingFormats.length;

  const allFormats = ["post", "reel", "carousel", "story", "thread"];
  const underused = allFormats.filter((f) => {
    const formatCount = existingFormats.filter((ef) => ef === f).length;
    return formatCount < existingFormats.length / allFormats.length;
  });

  return {
    score: ratio,
    suggestion: underused.length > 0 ? underused[0] : "reel",
  };
}

function checkCtaDiversity(newCta: string, existingCtas: string[]) {
  if (existingCtas.length === 0) return { score: 0, suggestion: "" };

  const newWords = new Set(newCta.toLowerCase().split(/\s+/));
  let maxOverlap = 0;

  for (const cta of existingCtas) {
    const existingWords = new Set(cta.toLowerCase().split(/\s+/));
    const intersection = [...newWords].filter((w) => existingWords.has(w));
    const union = new Set([...newWords, ...existingWords]);
    const overlap = intersection.length / union.size;
    maxOverlap = Math.max(maxOverlap, overlap);
  }

  const suggestions = [
    "Contactanos ahora",
    "Descubrí más",
    "Empezá hoy",
    "Unite a la comunidad",
    "Reservá tu consulta",
  ];

  return {
    score: maxOverlap,
    suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
  };
}

function checkHashtagDiversity(newHashtags: string[], existingHashtagArrays: string[][]) {
  if (existingHashtagArrays.length === 0) return { score: 0, suggestion: "" };

  const allExisting = new Set(existingHashtagArrays.flat().map((h) => h.toLowerCase()));
  const overlap = newHashtags.filter((h) => allExisting.has(h.toLowerCase())).length;
  const ratio = newHashtags.length > 0 ? overlap / newHashtags.length : 0;

  const suggestions = [
    "#nuevaseries",
    "#contenidofresco",
    "#tipsdiarios",
    "#estrategia2024",
    "#resultados",
  ];

  return {
    score: ratio,
    suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
  };
}
