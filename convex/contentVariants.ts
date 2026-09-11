import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentVariants")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("contentVariants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    contentId: v.id("content"),
    variantLabel: v.string(),
    hook: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.array(v.string()),
    mentions: v.array(v.string()),
    cta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contentVariants", {
      ...args,
      aiScore: undefined,
      isWinner: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contentVariants"),
    hook: v.optional(v.string()),
    caption: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    mentions: v.optional(v.array(v.string())),
    cta: v.optional(v.string()),
    aiScore: v.optional(v.number()),
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

export const setWinner = mutation({
  args: {
    contentId: v.id("content"),
    variantId: v.id("contentVariants"),
  },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("contentVariants")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
    for (const variant of variants) {
      await ctx.db.patch(variant._id, {
        isWinner: variant._id === args.variantId,
      });
    }
    return args.variantId;
  },
});
