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
        .query("campaigns")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("campaigns").order("desc").take(limit);
  },
});

export const get = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    idea: v.optional(v.string()),
    objective: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    painPoints: v.optional(v.string()),
    desires: v.optional(v.string()),
    valueProposition: v.optional(v.string()),
    funnelStage: v.optional(v.string()),
    communicationAngle: v.optional(v.string()),
    platforms: v.array(v.string()),
    style: v.optional(v.string()),
    offer: v.optional(v.string()),
    url: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.string(),
    contentCount: v.number(),
    publishedCount: v.number(),
    metrics: v.optional(v.any()),
    brandProfileId: v.optional(v.id("brandProfiles")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    objective: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    status: v.optional(v.string()),
    metrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, nonUndefined);
  },
});

export const updateContentCount = mutation({
  args: {
    id: v.id("campaigns"),
    contentCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { contentCount: args.contentCount });
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
