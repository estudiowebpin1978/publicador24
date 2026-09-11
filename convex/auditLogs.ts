import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.action) {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("auditLogs")
      .order("desc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    action: v.string(),
    platform: v.optional(v.string()),
    contentId: v.optional(v.id("content")),
    postId: v.optional(v.id("publishedPosts")),
    result: v.string(),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});
