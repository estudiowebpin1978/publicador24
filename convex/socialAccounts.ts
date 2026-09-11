import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("socialAccounts").collect();
  },
});

export const getByPlatform = query({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialAccounts")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    platform: v.string(),
    platformUserId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    status: v.string(),
    permissions: v.optional(v.array(v.string())),
    missingPermissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("socialAccounts", {
      ...args,
      connectedAt: Date.now(),
      lastPostAt: undefined,
      tokenExpiresAt: undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("socialAccounts"),
    status: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    missingPermissions: v.optional(v.array(v.string())),
    lastPostAt: v.optional(v.number()),
    tokenExpiresAt: v.optional(v.number()),
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

export const getToken = query({
  args: { socialAccountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("socialAccountTokens")
      .withIndex("by_account", (q) => q.eq("socialAccountId", args.socialAccountId))
      .order("desc")
      .first();
  },
});

export const remove = mutation({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("socialAccountTokens")
      .withIndex("by_account", (q) => q.eq("socialAccountId", args.id))
      .collect();
    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});
