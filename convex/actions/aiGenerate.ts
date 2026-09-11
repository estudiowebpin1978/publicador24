"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  return await response.json();
}

export const generateContent = action({
  args: {
    contentId: v.optional(v.id("content")),
    topic: v.string(),
    platform: v.string(),
    language: v.string(),
    brandVoice: v.optional(v.any()),
    additionalInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const startTime = Date.now();

    try {
      const brandContext = args.brandVoice
        ? `Brand voice: ${JSON.stringify(args.brandVoice)}`
        : "";

      const prompt = `Generate a ${args.platform} post about: ${args.topic}
Language: ${args.language}
${brandContext}
${args.additionalInstructions ? `Additional instructions: ${args.additionalInstructions}` : ""}

Return JSON with:
{
  "title": "post title",
  "hook": "attention-grabbing first line",
  "caption": "full caption text",
  "hashtags": ["tag1", "tag2"],
  "cta": "call to action"
}`;

      const response = await callOpenAI(apiKey, "gpt-4o", [
        { role: "system", content: "You are a social media content creator. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.8, maxTokens: 800 });

      const content = JSON.parse(response.choices[0].message.content);
      const duration = Date.now() - startTime;

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o",
        operation: "generate_content",
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        cost: ((response.usage?.prompt_tokens ?? 0) * 0.0025 + (response.usage?.completion_tokens ?? 0) * 0.01) / 1000,
        durationMs: duration,
        success: true,
      });

      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o",
        operation: "generate_content",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: duration,
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});

export const scoreContent = action({
  args: {
    contentId: v.id("content"),
    content: v.string(),
    platform: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const startTime = Date.now();

    try {
      const prompt = `Score this social media content on a scale of 0-100 for:
- engagement_potential
- brand_alignment
- viral_coefficient
- spam_risk

Content: ${args.content}
Platform: ${args.platform}
Language: ${args.language}

Return JSON:
{
  "overall_score": 85,
  "breakdown": {
    "engagement_potential": 90,
    "brand_alignment": 85,
    "viral_coefficient": 80,
    "spam_risk": 5
  },
  "spam_risk_score": 5,
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await callOpenAI(apiKey, "gpt-4o-mini", [
        { role: "system", content: "You are a social media content analyst. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.3, maxTokens: 500 });

      const result = JSON.parse(response.choices[0].message.content);
      const duration = Date.now() - startTime;

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o-mini",
        operation: "score_content",
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        cost: ((response.usage?.prompt_tokens ?? 0) * 0.0001 + (response.usage?.completion_tokens ?? 0) * 0.0006) / 1000,
        durationMs: duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o-mini",
        operation: "score_content",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: duration,
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});

export const generateHashtags = action({
  args: {
    content: v.string(),
    platform: v.string(),
    language: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const startTime = Date.now();
    const count = args.count ?? 10;

    try {
      const prompt = `Generate ${count} relevant hashtags for this ${args.platform} post.
Language: ${args.language}

Content: ${args.content}

Return JSON:
{
  "hashtags": [
    {"tag": "hashtag", "category": "niche|general|trending", "relevance": 0.9}
  ]
}`;

      const response = await callOpenAI(apiKey, "gpt-4o-mini", [
        { role: "system", content: "You are a social media hashtag expert. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.7, maxTokens: 800 });

      const result = JSON.parse(response.choices[0].message.content);
      const duration = Date.now() - startTime;

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: "gpt-4o-mini",
        operation: "generate_hashtags",
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        cost: ((response.usage?.prompt_tokens ?? 0) * 0.0001 + (response.usage?.completion_tokens ?? 0) * 0.0006) / 1000,
        durationMs: duration,
        success: true,
      });

      return result.hashtags;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        model: "gpt-4o-mini",
        operation: "generate_hashtags",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: duration,
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});

export const generateVariants = action({
  args: {
    contentId: v.id("content"),
    content: v.string(),
    platform: v.string(),
    language: v.string(),
    variantCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const startTime = Date.now();
    const count = args.variantCount ?? 3;

    try {
      const prompt = `Generate ${count} A/B test variants for this social media post.
Platform: ${args.platform}
Language: ${args.language}

Original: ${args.content}

Return JSON:
{
  "variants": [
    {
      "variant_label": "A",
      "hook": "attention grabber",
      "caption": "full caption",
      "hashtags": ["tag1"],
      "cta": "call to action",
      "angle": "emotional|logical|urgency|social_proof"
    }
  ]
}`;

      const response = await callOpenAI(apiKey, "gpt-4o", [
        { role: "system", content: "You are a social media optimization expert. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.9, maxTokens: 1500 });

      const result = JSON.parse(response.choices[0].message.content);
      const duration = Date.now() - startTime;

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o",
        operation: "generate_variants",
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        cost: ((response.usage?.prompt_tokens ?? 0) * 0.0025 + (response.usage?.completion_tokens ?? 0) * 0.01) / 1000,
        durationMs: duration,
        success: true,
      });

      return result.variants;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(api.aiGenerations.logGeneration, {
        contentId: args.contentId,
        model: "gpt-4o",
        operation: "generate_variants",
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: duration,
        success: false,
        error: errorMessage,
      });

      throw error;
    }
  },
});

export const detectSpam = action({
  args: {
    content: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    try {
      const prompt = `Analyze this content for spam indicators.
Language: ${args.language}

Content: ${args.content}

Return JSON:
{
  "spam_score": 0-100,
  "is_spam": boolean,
  "flags": ["excessive_caps", "excessive_emojis", "misleading", "scam_indicators"],
  "suggestions": ["fix1", "fix2"]
}`;

      const response = await callOpenAI(apiKey, "gpt-4o-mini", [
        { role: "system", content: "You are a content moderation expert. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.2, maxTokens: 400 });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      throw error;
    }
  },
});

export const adaptForPlatform = action({
  args: {
    content: v.string(),
    sourcePlatform: v.string(),
    targetPlatform: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    try {
      const prompt = `Adapt this social media content for ${args.targetPlatform}.
Original platform: ${args.sourcePlatform}
Language: ${args.language}

Original: ${args.content}

Platform requirements:
- TikTok: short, catchy, trend-focused, 150 chars max caption
- Instagram: visual-focused, emoji-rich, 2200 chars max, 30 hashtags max
- Facebook: conversational, longer form, link-friendly
- X/Twitter: 280 chars max, concise, hashtag-light
- YouTube: SEO-optimized title, detailed description
- LinkedIn: professional, thought leadership, article-style

Return JSON:
{
  "adapted_content": "the adapted text",
  "hook": "attention grabber",
  "caption": "full caption",
  "hashtags": ["tag1"],
  "cta": "call to action"
}`;

      const response = await callOpenAI(apiKey, "gpt-4o", [
        { role: "system", content: "You are a social media platform specialist. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ], { temperature: 0.7, maxTokens: 800 });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      throw error;
    }
  },
});
