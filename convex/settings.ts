import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("userSettings").first();
    return settings?.profile || {};
  },
});

export const saveProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { profile: args });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { profile: args, workspace: {}, brandVoice: {} });
  },
});

export const getWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("userSettings").first();
    return settings?.workspace || {};
  },
});

export const saveWorkspace = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { workspace: args });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { profile: {}, workspace: args, brandVoice: {} });
  },
});

export const getBrandVoice = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("userSettings").first();
    return settings?.brandVoice || {};
  },
});

export const saveBrandVoice = mutation({
  args: {
    tone: v.string(),
    values: v.string(),
    personality: v.string(),
    writingStyle: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("userSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { brandVoice: args });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { profile: {}, workspace: {}, brandVoice: args });
  },
});