import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = args.projectId
      ? await ctx.db
          .query("businessProfiles")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
          .first()
      : null;
    if (existing) return existing._id;
    return ctx.db.insert("businessProfiles", {
      ...args,
      analyzedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("businessProfiles"),
    businessType: v.optional(v.string()),
    offerings: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    location: v.optional(v.string()),
    contactChannels: v.optional(v.array(v.string())),
    keyPages: v.optional(v.array(v.string())),
    brandTone: v.optional(v.string()),
    verifiedFacts: v.optional(v.array(v.string())),
    assumptions: v.optional(v.array(v.string())),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("businessProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});
