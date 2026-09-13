"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

interface ImageResult {
  url: string;
  width: number;
  height: number;
  aspectRatio: string;
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
};

async function generateWithPollinations(
  prompt: string,
  aspectRatio: string = "4:5",
  seed?: number
): Promise<ImageResult> {
  const dims = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS["4:5"];
  const encodedPrompt = encodeURIComponent(prompt);
  const randomSeed = seed || Math.floor(Math.random() * 999999);

  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${randomSeed}&nologo=true`;

  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status}`);
  }

  return {
    url,
    width: dims.width,
    height: dims.height,
    aspectRatio,
  };
}

export const generateImage = action({
  args: {
    prompt: v.string(),
    aspectRatio: v.optional(v.string()),
    contentPieceId: v.optional(v.id("contentPieces")),
    campaignId: v.optional(v.id("campaigns")),
    seed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const result = await generateWithPollinations(
        args.prompt,
        args.aspectRatio || "4:5",
        args.seed
      );

      const imageId = await ctx.runMutation(api.generatedImages.create, {
        contentPieceId: args.contentPieceId || undefined,
        campaignId: args.campaignId || undefined,
        prompt: args.prompt,
        imageUrl: result.url,
        aspectRatio: result.aspectRatio,
        width: result.width,
        height: result.height,
        provider: "pollinations",
        metadata: { seed: args.seed },
      });

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: "pollinations-flux",
        operation: "generate_image",
        inputTokens: args.prompt.length,
        outputTokens: 0,
        cost: 0,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return {
        imageId,
        url: result.url,
        width: result.width,
        height: result.height,
        aspectRatio: result.aspectRatio,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: "pollinations-flux",
        operation: "generate_image",
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

export const generateImagePack = action({
  args: {
    contentPieceId: v.id("contentPieces"),
    aspectRatios: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.get, { id: args.contentPieceId });
    if (!piece) throw new Error("Content piece not found");
    if (!piece.imagePrompt) throw new Error("No image prompt for this piece");

    const ratios = args.aspectRatios || ["1:1", "4:5", "9:16"];
    const results: { imageId: any; url: string; width: number; height: number; aspectRatio: string }[] = [];

    for (const ratio of ratios) {
      try {
        const result = await generateWithPollinations(piece.imagePrompt, ratio);

        const imageId = await ctx.runMutation(api.generatedImages.create, {
          contentPieceId: args.contentPieceId,
          campaignId: piece.campaignId,
          prompt: piece.imagePrompt,
          imageUrl: result.url,
          aspectRatio: result.aspectRatio,
          width: result.width,
          height: result.height,
          provider: "pollinations",
        });

        results.push({ imageId, ...result });
      } catch (error) {
        console.error(`Failed to generate image for ${ratio}:`, error);
      }
    }

    return {
      pieceId: args.contentPieceId,
      images: results,
      totalGenerated: results.length,
    };
  },
});

export const generateCampaignImages = action({
  args: {
    campaignId: v.id("campaigns"),
    aspectRatios: v.optional(v.array(v.string())),
    maxPieces: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const ratios = args.aspectRatios || ["4:5"];
    const maxPieces = args.maxPieces || 10;
    const piecesWithPrompts = pieces
      .filter((p) => p.imagePrompt)
      .slice(0, maxPieces);

    const results: { pieceId: any; imageId: any; url: string; width: number; height: number; aspectRatio: string }[] = [];

    for (const piece of piecesWithPrompts) {
      for (const ratio of ratios) {
        try {
          if (!piece.imagePrompt) continue;
          const result = await generateWithPollinations(piece.imagePrompt, ratio);

          const imageId = await ctx.runMutation(api.generatedImages.create, {
            contentPieceId: piece._id,
            campaignId: args.campaignId,
            prompt: piece.imagePrompt,
            imageUrl: result.url,
            aspectRatio: result.aspectRatio,
            width: result.width,
            height: result.height,
            provider: "pollinations",
          });

          results.push({ pieceId: piece._id, imageId, ...result });
        } catch (error) {
          console.error(`Failed for piece ${piece._id}:`, error);
        }
      }
    }

    return {
      campaignId: args.campaignId,
      images: results,
      totalGenerated: results.length,
    };
  },
});
