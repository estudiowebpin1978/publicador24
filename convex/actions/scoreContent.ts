"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function callMockScoring(
  content: string,
  platform: string,
  hook: string,
  hashtags: string[],
  cta: string
) {
  await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 800));

  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;
  const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(content);
  const hasHook = hook.length > 10;
  const hasCTA = cta.length > 5;
  const hashtagCount = hashtags.length;

  const platformLimits: Record<string, { maxChars: number; idealHashtags: number }> = {
    tiktok: { maxChars: 150, idealHashtags: 5 },
    instagram: { maxChars: 2200, idealHashtags: 15 },
    x: { maxChars: 280, idealHashtags: 3 },
    facebook: { maxChars: 63206, idealHashtags: 3 },
    linkedin: { maxChars: 3000, idealHashtags: 5 },
    youtube: { maxChars: 5000, idealHashtags: 10 },
  };

  const limits = platformLimits[platform] || platformLimits.instagram;

  const lengthScore = Math.min(100, (charCount / limits.maxChars) * 100);
  const hashtagScore = Math.min(100, (hashtagCount / limits.idealHashtags) * 100);
  const hookScore = hasHook ? Math.min(100, (hook.length / 50) * 100) : 20;
  const ctaScore = hasCTA ? Math.min(100, (cta.length / 20) * 100) : 15;
  const emojiScore = hasEmoji ? 75 : 40;
  const readabilityScore = wordCount > 5 ? Math.min(100, wordCount * 3) : 30;

  const engagementPotential = Number(
    ((hookScore * 0.3 + ctaScore * 0.2 + emojiScore * 0.2 + readabilityScore * 0.3) * 1).toFixed(1)
  );

  const brandAlignment = Number(
    ((readabilityScore * 0.4 + ctaScore * 0.3 + lengthScore * 0.3) * 1).toFixed(1)
  );

  const viralCoefficient = Number(
    ((hookScore * 0.35 + hashtagScore * 0.25 + emojiScore * 0.2 + ctaScore * 0.2) * 1).toFixed(1)
  );

  const spamRisk = Math.min(100,
    (hashtagCount > limits.idealHashtags * 2 ? 40 : 0) +
    (wordCount < 3 ? 30 : 0) +
    (hasEmoji && charCount < 20 ? 25 : 0) +
    (/[A-Z]{5,}/.test(content) ? 20 : 0)
  );

  const overall = Number(
    (engagementPotential * 0.3 + brandAlignment * 0.25 + viralCoefficient * 0.3 + (100 - spamRisk) * 0.15).toFixed(1)
  );

  const suggestions: string[] = [];
  if (!hasHook) suggestions.push("Add an attention-grabbing hook at the start");
  if (!hasCTA) suggestions.push("Include a clear call-to-action");
  if (hashtagCount < 3) suggestions.push("Add more relevant hashtags");
  if (hashtagCount > limits.idealHashtags * 2) suggestions.push("Reduce hashtag count for this platform");
  if (charCount < 30) suggestions.push("Content seems too short - add more detail");
  if (!hasEmoji) suggestions.push("Consider adding emojis for better engagement");
  if (spamRisk > 50) suggestions.push("Review content for spam indicators");

  return {
    overall_score: Math.min(100, Math.max(0, overall)),
    breakdown: {
      engagement_potential: Math.min(100, Math.max(0, engagementPotential)),
      brand_alignment: Math.min(100, Math.max(0, brandAlignment)),
      viral_coefficient: Math.min(100, Math.max(0, viralCoefficient)),
      spam_risk: Math.min(100, Math.max(0, spamRisk)),
    },
    spam_risk_score: Math.min(100, Math.max(0, spamRisk)),
    suggestions,
  };
}

export const scoreContent = action({
  args: {
    content: v.string(),
    platform: v.string(),
    hook: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    cta: v.optional(v.string()),
    contentId: v.optional(v.id("content")),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const hook = args.hook || "";
    const hashtags = args.hashtags || [];
    const cta = args.cta || "";

    try {
      const result = await callMockScoring(args.content, args.platform, hook, hashtags, cta);

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-scoring",
        operation: "score_content",
        inputTokens: args.content.split(/\s+/).length,
        outputTokens: 100,
        cost: 0.0004,
        durationMs: Date.now() - startTime,
        success: true,
      });

      if (args.contentId) {
        await ctx.runMutation(api.content.update, {
          id: args.contentId,
          aiScore: result.overall_score,
          aiScoreBreakdown: result.breakdown,
        });
      }

      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-scoring",
        operation: "score_content",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs,
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});
