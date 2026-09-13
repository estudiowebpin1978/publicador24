import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("brandProfiles").collect();
  },
});

export const get = query({
  args: { id: v.id("brandProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("brandProfiles").collect();
    return all[0] || null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colors: v.optional(v.any()),
    fonts: v.optional(v.any()),
    visualStyle: v.optional(v.string()),
    tone: v.optional(v.string()),
    defaultCtas: v.array(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    socialLinks: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("brandProfiles", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("brandProfiles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    colors: v.optional(v.any()),
    fonts: v.optional(v.any()),
    visualStyle: v.optional(v.string()),
    tone: v.optional(v.string()),
    defaultCtas: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    socialLinks: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const nonUndefined = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, nonUndefined);
  },
});

export const remove = mutation({
  args: { id: v.id("brandProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
