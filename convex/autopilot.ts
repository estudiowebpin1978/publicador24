import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const defaultAutopilotSettings = {
  level: "assisted",
  platformFrequencies: {
    instagram: "daily",
    x: "daily",
    facebook: "daily",
    linkedin: "daily",
    tiktok: "daily",
  },
  topics: "Marketing, Technology, AI",
  contentPillars: "Industry insights\nTips and tutorials\nProduct updates\nCompany news",
  topicsToAvoid: "Politics",
  timeZone: "est",
  preferredTimeSlots: "optimal",
  excludedDays: [],
  contentGuidelines: "Always include a call to action\nUse brand hashtags\nKeep tone professional\nInclude relevant emojis",
  approvalRequirements: "review",
};

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("autopilotSettings").first();
    if (!settings) {
      return defaultAutopilotSettings;
    }
    return settings;
  },
});

export const saveSettings = mutation({
  args: {
    level: v.string(),
    platformFrequencies: v.object({
      instagram: v.string(),
      x: v.string(),
      facebook: v.string(),
      linkedin: v.string(),
      tiktok: v.string(),
    }),
    topics: v.string(),
    contentPillars: v.string(),
    topicsToAvoid: v.string(),
    timeZone: v.string(),
    preferredTimeSlots: v.string(),
    excludedDays: v.array(v.string()),
    contentGuidelines: v.string(),
    approvalRequirements: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("autopilotSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("autopilotSettings", args);
  },
});