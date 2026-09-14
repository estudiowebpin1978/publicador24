import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("campaigns")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("campaigns").collect();
  },
});

export const getById = query({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
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
    autopilotLevel: v.optional(v.string()),
    pillarConfig: v.optional(v.any()),
    funnelConfig: v.optional(v.any()),
    referenceImages: v.optional(v.array(v.string())),
    queueMinimum: v.optional(v.number()),
    brandProfileId: v.optional(v.id("brandProfiles")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("campaigns", {
      ...args,
      status: "DRAFT",
      contentCount: 0,
      publishedCount: 0,
      scheduledCount: 0,
      healthScore: 50,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("campaigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    idea: v.optional(v.string()),
    objective: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    painPoints: v.optional(v.string()),
    desires: v.optional(v.string()),
    valueProposition: v.optional(v.string()),
    funnelStage: v.optional(v.string()),
    communicationAngle: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    style: v.optional(v.string()),
    offer: v.optional(v.string()),
    url: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.optional(v.string()),
    autopilotLevel: v.optional(v.string()),
    pillarConfig: v.optional(v.any()),
    funnelConfig: v.optional(v.any()),
    referenceImages: v.optional(v.array(v.string())),
    contentCount: v.optional(v.number()),
    publishedCount: v.optional(v.number()),
    scheduledCount: v.optional(v.number()),
    queueMinimum: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    lastGeneratedAt: v.optional(v.number()),
    lastPublishedAt: v.optional(v.number()),
    metrics: v.optional(v.any()),
    brandProfileId: v.optional(v.id("brandProfiles")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { success: true };
  },
});

export const updateContentCount = mutation({
  args: {
    id: v.id("campaigns"),
    contentCount: v.number(),
    publishedCount: v.optional(v.number()),
    scheduledCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      contentCount: args.contentCount,
      ...(args.publishedCount !== undefined && { publishedCount: args.publishedCount }),
      ...(args.scheduledCount !== undefined && { scheduledCount: args.scheduledCount }),
    });
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
