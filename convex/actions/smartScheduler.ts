"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// SMART SCHEDULER
// Optimal posting times, platform-specific
// windows, performance-based timing
// ============================================

interface ScheduleSlot {
  platform: string;
  scheduledAt: number;
  score: number;
  reason: string;
}

const PLATFORM_WINDOWS: Record<string, { hours: number[]; days: number[] }> = {
  instagram: {
    hours: [7, 8, 12, 13, 17, 18, 19, 20],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  facebook: {
    hours: [9, 10, 12, 13, 15, 16, 19, 20],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  tiktok: {
    hours: [7, 8, 12, 13, 17, 18, 19, 20, 21, 22],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  linkedin: {
    hours: [7, 8, 12, 17, 18],
    days: [1, 2, 3, 4, 5],
  },
  x: {
    hours: [8, 9, 12, 13, 17, 18, 20, 21],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
};

const MIN_HOURS_BETWEEN_POSTS = 4;
const MAX_POSTS_PER_DAY = 3;

export const findOptimalSlots = action({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ScheduleSlot[]> => {
    const campaign = await ctx.runQuery(api.campaigns.getById, { id: args.campaignId });
    if (!campaign) return [];

    const existingPosts = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const scheduled = existingPosts.filter((p) => p.status === "SCHEDULED");
    const windows = PLATFORM_WINDOWS[args.platform] || PLATFORM_WINDOWS.instagram;
    const count = args.count || 3;

    const now = new Date();
    const slots: ScheduleSlot[] = [];

    for (let dayOffset = 0; dayOffset < 14 && slots.length < count; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + dayOffset);

      const dayOfWeek = checkDate.getDay();
      if (!windows.days.includes(dayOfWeek)) continue;

      for (const hour of windows.hours) {
        if (slots.length >= count) break;

        const slotTime = new Date(checkDate);
        slotTime.setHours(hour, 0, 0, 0);

        if (slotTime <= now) continue;

        if (isSlotOccupied(slotTime, scheduled, args.platform)) continue;

        const score = calculateSlotScore(slotTime, args.platform, scheduled);

        slots.push({
          platform: args.platform,
          scheduledAt: slotTime.getTime(),
          score,
          reason: getScoreReason(score, hour, dayOfWeek),
        });
      }
    }

    return slots.sort((a, b) => b.score - a.score).slice(0, count);
  },
});

export const scheduleContentPiece = action({
  args: {
    contentPieceId: v.id("contentPieces"),
    platform: v.string(),
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const piece = await ctx.runQuery(api.contentPieces.getById, { id: args.contentPieceId });
    if (!piece) throw new Error("Content piece not found");

    const socialAccounts = await ctx.runQuery(api.socialAccounts.getByPlatform, {
      platform: args.platform,
    });

    if (socialAccounts.length === 0) {
      throw new Error(`No social account connected for ${args.platform}`);
    }

    const account = socialAccounts[0];

    const idempotencyKey = `sched_${args.contentPieceId}_${args.platform}_${args.scheduledAt}`;

    await ctx.runMutation(api.scheduledPosts.create, {
      contentPieceId: args.contentPieceId,
      socialAccountId: account._id,
      platform: args.platform,
      scheduledAt: args.scheduledAt,
      priority: 1,
      idempotencyKey,
    });

    await ctx.runMutation(api.contentPieces.update, {
      id: args.contentPieceId,
      status: "SCHEDULED",
    });

    return { success: true, scheduledAt: args.scheduledAt };
  },
});

function isSlotOccupied(
  slotTime: Date,
  scheduled: any[],
  platform: string
): boolean {
  const slotMs = slotTime.getTime();

  return scheduled.some((post) => {
    if (!post.metadata?.scheduledAt) return false;
    const postTime = new Date(post.metadata.scheduledAt).getTime();
    const diff = Math.abs(slotMs - postTime);
    return diff < MIN_HOURS_BETWEEN_POSTS * 60 * 60 * 1000;
  });
}

function calculateSlotScore(
  slotTime: Date,
  platform: string,
  scheduled: any[]
): number {
  let score = 50;

  const hour = slotTime.getHours();
  const day = slotTime.getDay();

  const peakHours: Record<string, number[]> = {
    instagram: [12, 13, 17, 18, 19, 20],
    facebook: [12, 13, 15, 16, 19, 20],
    tiktok: [12, 13, 17, 18, 19, 20, 21],
    linkedin: [8, 12, 17],
    x: [12, 13, 17, 18, 20],
  };

  const platformPeaks = peakHours[platform] || peakHours.instagram;
  if (platformPeaks.includes(hour)) {
    score += 20;
  }

  const dayOfWeek = slotTime.getDay();
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    score += 10;
  }

  const postsOnDay = scheduled.filter((p) => {
    if (!p.metadata?.scheduledAt) return false;
    const postDate = new Date(p.metadata.scheduledAt);
    return (
      postDate.getFullYear() === slotTime.getFullYear() &&
      postDate.getMonth() === slotTime.getMonth() &&
      postDate.getDate() === slotTime.getDate()
    );
  }).length;

  if (postsOnDay < MAX_POSTS_PER_DAY) {
    score += 10;
  } else {
    score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

function getScoreReason(score: number, hour: number, day: number): string {
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  if (score >= 70) return `Horario pico - ${dayNames[day]} ${hour}:00`;
  if (score >= 50) return `Buen horario - ${dayNames[day]} ${hour}:00`;
  return `Horario aceptable - ${dayNames[day]} ${hour}:00`;
}
