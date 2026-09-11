import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByPost = query({
  args: { scheduledPostId: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("publishAttempts")
      .withIndex("by_post", (q) =>
        q.eq("scheduledPostId", args.scheduledPostId)
      )
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    scheduledPostId: v.id("scheduledPosts"),
    attemptNumber: v.number(),
    status: v.string(),
    requestPayload: v.optional(v.any()),
    responsePayload: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("publishAttempts", args);
  },
});
