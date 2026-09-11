import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("contentPlatformVariants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentPlatformVariants")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
  },
});

export const getByPlatform = query({
  args: {
    contentId: v.id("content"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentPlatformVariants")
      .withIndex("by_content_platform", (q) =>
        q.eq("contentId", args.contentId).eq("platform", args.platform)
      )
      .first();
  },
});

export const create = mutation({
  args: {
    contentId: v.id("content"),
    platform: v.string(),
    hook: v.optional(v.string()),
    caption: v.string(),
    hashtags: v.array(v.string()),
    mentions: v.array(v.string()),
    cta: v.optional(v.string()),
    adaptedForPlatform: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentPlatformVariants", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("contentPlatformVariants"),
    hook: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    cta: v.optional(v.string()),
    adaptedForPlatform: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return id;
  },
});
