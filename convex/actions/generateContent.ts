"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function callMockAI(operation: string, input: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

  switch (operation) {
    case "generate_content":
      return {
        title: input.topic as string,
        hooks: [
          "Did you know this changes everything?",
          "Stop scrolling - this is important",
          "The secret nobody talks about",
        ],
        captions: [
          `Here's what you need to know about ${input.topic}. This is a game-changer for ${input.audience}.`,
          `Let's break down ${input.topic} in a way that actually makes sense.`,
          `${input.topic} doesn't have to be complicated. Here's the simple truth.`,
        ],
        hashtags: ["contentcreation", "socialmediatips", "growth", "marketing"],
        platformVariants: (input.platforms as string[]).map((platform: string) => ({
          platform,
          hook: `Tailored hook for ${platform}`,
          caption: `Optimized caption for ${platform} about ${input.topic}`,
          hashtags: [`${platform}tips`, "contentcreator", "growthhacks"],
          mentions: [],
          cta: "Link in bio!",
        })),
        brandVoice: input.brandVoice || { tone: "professional", style: "conversational" },
        metadata: {
          model: "mock-gpt-4o",
          inputTokens: 250,
          outputTokens: 400,
          cost: 0.002,
          durationMs: 1200,
        },
      };

    default:
      throw new Error(`Unknown AI operation: ${operation}`);
  }
}

export const generateFullContent = action({
  args: {
    topic: v.string(),
    audience: v.optional(v.string()),
    platforms: v.array(v.string()),
    tone: v.optional(v.string()),
    language: v.string(),
    brandVoice: v.optional(v.any()),
    additionalInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const aiResult = await callMockAI("generate_content", {
        topic: args.topic,
        audience: args.audience || "general audience",
        platforms: args.platforms,
        tone: args.tone || "professional",
        language: args.language,
        brandVoice: args.brandVoice,
        additionalInstructions: args.additionalInstructions,
      });

      const contentId = await ctx.runMutation(api.content.create, {
        title: aiResult.title,
        description: aiResult.captions[0],
        contentType: "post",
        language: args.language,
        targetPlatforms: args.platforms,
        brandVoice: aiResult.brandVoice,
        metadata: {
          generatedFrom: "ai_generate",
          topic: args.topic,
          audience: args.audience,
          tone: args.tone,
        },
      });

      for (const variant of aiResult.platformVariants) {
        await ctx.runMutation(api.contentPlatformVariants.create, {
          contentId,
          platform: variant.platform,
          hook: variant.hook,
          caption: variant.caption,
          hashtags: variant.hashtags,
          mentions: variant.mentions,
          cta: variant.cta,
          adaptedForPlatform: true,
        });
      }

      const variantId = await ctx.runMutation(api.contentVariants.create, {
        contentId,
        variantLabel: "A",
        hook: aiResult.hooks[0],
        caption: aiResult.captions[0],
        hashtags: aiResult.hashtags,
        mentions: [],
        cta: "Link in bio!",
      });

      await ctx.runMutation(api.contentVariants.setWinner, {
        contentId,
        variantId,
      });

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId,
        model: "mock-gpt-4o",
        operation: "generate_content",
        inputTokens: aiResult.metadata.inputTokens,
        outputTokens: aiResult.metadata.outputTokens,
        cost: aiResult.metadata.cost,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        contentId,
        title: aiResult.title,
        hooks: aiResult.hooks,
        captions: aiResult.captions,
        hashtags: aiResult.hashtags,
        platformVariants: aiResult.platformVariants,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: "mock-gpt-4o",
        operation: "generate_content",
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
