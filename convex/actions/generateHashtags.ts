"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function callMockHashtagAI(content: string, platform: string, count: number) {
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 900));

  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 3);

  const nicheHashtags = words.slice(0, Math.min(count, words.length)).map((w: string) => ({
    tag: w,
    category: "niche" as const,
    relevance: Number((0.7 + Math.random() * 0.3).toFixed(2)),
    popularity: Number((0.4 + Math.random() * 0.5).toFixed(2)),
    competition: Number((0.3 + Math.random() * 0.6).toFixed(2)),
  }));

  const generalPool = [
    "contentcreator", "socialmediamarketing", "digitalmarketing",
    "growthhacks", "marketingtips", "branding", "entrepreneurship",
    "smallbusiness", "onlinebusiness", "contentmarketing",
  ];
  const generalHashtags = generalPool.slice(0, Math.min(3, count)).map((tag) => ({
    tag,
    category: "general" as const,
    relevance: Number((0.5 + Math.random() * 0.3).toFixed(2)),
    popularity: Number((0.6 + Math.random() * 0.4).toFixed(2)),
    competition: Number((0.5 + Math.random() * 0.5).toFixed(2)),
  }));

  const trendingPool: Record<string, string[]> = {
    tiktok: ["fyp", "viral", "trending", "foryou", "blowthisup"],
    instagram: ["instagood", "photooftheday", "explore", "reels", "instadaily"],
    x: ["tweet", "trending", "breaking", "news", "discussion"],
    facebook: ["facebook", "community", "friends", "share", "viral"],
    linkedin: ["professional", "career", "leadership", "business", "networking"],
    youtube: ["youtube", "subscribe", "newvideo", "tutorial", "howto"],
  };
  const platformTrending = trendingPool[platform] || trendingPool.tiktok;
  const trendingHashtags = platformTrending.slice(0, Math.min(2, count)).map((tag) => ({
    tag,
    category: "trending" as const,
    relevance: Number((0.3 + Math.random() * 0.4).toFixed(2)),
    popularity: Number((0.7 + Math.random() * 0.3).toFixed(2)),
    competition: Number((0.6 + Math.random() * 0.4).toFixed(2)),
  }));

  const all = [...nicheHashtags, ...generalHashtags, ...trendingHashtags]
    .slice(0, count)
    .map((h) => ({
      ...h,
      finalScore: Number(
        ((h.relevance * 0.4 + h.popularity * 0.3 + (1 - h.competition) * 0.3) * 100).toFixed(1)
      ),
    }))
    .sort((a, b) => b.finalScore - a.finalScore);

  return all;
}

export const generateHashtags = action({
  args: {
    content: v.string(),
    platform: v.string(),
    language: v.optional(v.string()),
    count: v.optional(v.number()),
    contentId: v.optional(v.id("content")),
  },
  handler: async (ctx, args) => {
    const count = args.count ?? 10;
    const startTime = Date.now();

    try {
      const hashtags = await callMockHashtagAI(args.content, args.platform, count);

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-hashtag",
        operation: "generate_hashtags",
        inputTokens: args.content.split(/\s+/).length,
        outputTokens: hashtags.length * 3,
        cost: 0.0003,
        durationMs: Date.now() - startTime,
        success: true,
      });

      for (const tag of hashtags) {
        await ctx.runMutation(api.hashtags.upsert, {
          tag: tag.tag,
          category: tag.category,
          language: args.language || "en",
          platform: args.platform,
          popularityScore: tag.popularity,
          competitionScore: tag.competition,
          relevanceScore: tag.relevance,
          trendScore: tag.category === "trending" ? 0.9 : 0.5,
          finalScore: tag.finalScore,
          isEstimated: true,
          dataSource: "mock_ai",
        });
      }

      return {
        hashtags,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "mock-hashtag",
        operation: "generate_hashtags",
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
