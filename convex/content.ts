import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    if (args.status) {
      const results = await ctx.db
        .query("content")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
      return results.slice(offset, offset + limit);
    }

    const all = await ctx.db
      .query("content")
      .withIndex("by_created")
      .order("desc")
      .collect();

    let results = all;
    if (args.platform) {
      results = all.filter((c) => c.targetPlatforms.includes(args.platform!));
    }
    return results.slice(offset, offset + limit);
  },
});

export const get = query({
  args: { id: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    contentType: v.string(),
    language: v.string(),
    targetPlatforms: v.array(v.string()),
    mediaIds: v.optional(v.array(v.id("media"))),
    brandVoice: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("content", {
      ...args,
      status: "DRAFT",
      spamRiskScore: 0,
      version: 1,
      publishedAt: undefined,
      aiScore: undefined,
      aiScoreBreakdown: undefined,
      contentFingerprint: undefined,
      parentContentId: undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("content"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    contentType: v.optional(v.string()),
    language: v.optional(v.string()),
    targetPlatforms: v.optional(v.array(v.string())),
    mediaIds: v.optional(v.array(v.id("media"))),
    brandVoice: v.optional(v.any()),
    metadata: v.optional(v.any()),
    aiScore: v.optional(v.number()),
    aiScoreBreakdown: v.optional(v.any()),
    spamRiskScore: v.optional(v.number()),
    contentFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("content"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "PUBLISHED") {
      updates.publishedAt = Date.now();
    }
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("content") },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("contentVariants")
      .withIndex("by_content", (q) => q.eq("contentId", args.id))
      .collect();
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    const platformVariants = await ctx.db
      .query("contentPlatformVariants")
      .withIndex("by_content", (q) => q.eq("contentId", args.id))
      .collect();
    for (const pv of platformVariants) {
      await ctx.db.delete(pv._id);
    }

    const mentions = await ctx.db
      .query("mentions")
      .withIndex("by_content", (q) => q.eq("contentId", args.id))
      .collect();
    for (const mention of mentions) {
      await ctx.db.delete(mention._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getByFingerprint = query({
  args: { fingerprint: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("content").collect();
    return all.filter((c) => c.contentFingerprint === args.fingerprint);
  },
});
