import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.status) {
      return await ctx.db
        .query("scheduledPosts")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("scheduledPosts")
      .withIndex("by_scheduled")
      .order("desc")
      .take(limit);
  },
});

export const listUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();
    const queued = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_status", (q) => q.eq("status", "QUEUED"))
      .order("asc")
      .take(limit);

    return queued.filter(
      (post) => !post.nextAttemptAt || post.nextAttemptAt <= now
    );
  },
});

export const get = query({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    contentId: v.id("content"),
    socialAccountId: v.id("socialAccounts"),
    platform: v.string(),
    platformVariantId: v.optional(v.id("contentPlatformVariants")),
    variantId: v.optional(v.id("contentVariants")),
    scheduledAt: v.number(),
    priority: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scheduledPosts", {
      ...args,
      status: "QUEUED",
      priority: args.priority ?? 0,
      attempts: 0,
      maxAttempts: args.maxAttempts ?? 3,
      nextAttemptAt: undefined,
      lockedAt: undefined,
      publishedAt: undefined,
      platformPostId: undefined,
      platformPostUrl: undefined,
      errorMessage: undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduledPosts"),
    scheduledAt: v.optional(v.number()),
    priority: v.optional(v.number()),
    platformVariantId: v.optional(v.id("contentPlatformVariants")),
    variantId: v.optional(v.id("contentVariants")),
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

export const lock = mutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Scheduled post not found");
    if (post.lockedAt) throw new Error("Post already locked");

    await ctx.db.patch(args.id, {
      lockedAt: Date.now(),
      status: "PROCESSING",
      attempts: post.attempts + 1,
    });
    return args.id;
  },
});

export const unlock = mutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lockedAt: undefined });
    return args.id;
  },
});

export const markPublished = mutation({
  args: {
    id: v.id("scheduledPosts"),
    platformPostId: v.string(),
    platformPostUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "PUBLISHED",
      publishedAt: Date.now(),
      platformPostId: args.platformPostId,
      platformPostUrl: args.platformPostUrl,
      lockedAt: undefined,
    });
    return args.id;
  },
});

export const markFailed = mutation({
  args: {
    id: v.id("scheduledPosts"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) throw new Error("Scheduled post not found");

    const shouldRetry = post.attempts < post.maxAttempts;

    await ctx.db.patch(args.id, {
      status: shouldRetry ? "RETRY" : "FAILED",
      errorMessage: args.errorMessage,
      lockedAt: undefined,
      nextAttemptAt: shouldRetry
        ? Date.now() + Math.pow(2, post.attempts) * 60000
        : undefined,
    });
    return args.id;
  },
});

export const cancel = mutation({
  args: { id: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "CANCELLED" });
    return args.id;
  },
});

export const getNextToProcess = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const now = Date.now();

    const retryPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_status", (q) => q.eq("status", "RETRY"))
      .order("asc")
      .take(limit);

    const queuedPosts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_status", (q) => q.eq("status", "QUEUED"))
      .order("asc")
      .take(limit);

    const all = [...retryPosts, ...queuedPosts];
    return all
      .filter(
        (post) => !post.nextAttemptAt || post.nextAttemptAt <= now
      )
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);
  },
});
