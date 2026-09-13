"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function callMockAnalysis(text: string) {
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1000));

  const wordCount = text.split(/\s+/).length;
  const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(text);
  const hasQuestion = /\?/.test(text);
  const hasExclamation = /!/.test(text);

  const sentimentScore = 0.5 + (hasEmoji ? 0.15 : 0) + (hasQuestion ? -0.1 : 0) + (hasExclamation ? 0.1 : 0);
  const clampedSentiment = Math.min(1, Math.max(0, sentimentScore));

  const entities: string[] = [];
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
  entities.push(...capitalizedWords.slice(0, 5));

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];

  const hashtags = text.match(/#(\w+)/g)?.map((h: string) => h.slice(1)) || [];

  const keywords = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 4)
    .slice(0, 8);

  return {
    topic: keywords.slice(0, 3).join(", ") || "general",
    entities,
    keywords,
    hashtags,
    urls,
    sentiment: {
      score: Number(clampedSentiment.toFixed(2)),
      label: clampedSentiment > 0.6 ? "positive" : clampedSentiment < 0.4 ? "negative" : "neutral",
    },
    readability: {
      wordCount,
      avgWordLength: text.length > 0 ? Number((text.length / wordCount).toFixed(1)) : 0,
      hasQuestion,
      hasExclamation,
      hasEmoji,
    },
    suggestedAudience: wordCount > 50 ? "professionals" : "general audience",
    category: keywords.includes("tech") || keywords.includes("ai") ? "technology"
      : keywords.includes("marketing") || keywords.includes("growth") ? "marketing"
      : "general",
  };
}

export const analyzeContent = action({
  args: {
    text: v.string(),
    contentId: v.optional(v.id("content")),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const analysis = await callMockAnalysis(args.text);

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-analysis",
        operation: "analyze_content",
        inputTokens: args.text.split(/\s+/).length,
        outputTokens: 150,
        cost: 0.0005,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        ...analysis,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-analysis",
        operation: "analyze_content",
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
