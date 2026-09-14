"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

// ============================================
// SMART SCHEDULER - Argentina Timezone
// Horarios de publicación que parecen humanos
// ============================================

const TZ = "America/Argentina/Buenos_Aires";

interface ScheduleSlot {
  platform: string;
  scheduledAt: number;
  scheduledAtLocal: string;
  score: number;
  reason: string;
}

// Horarios óptimos Argentina (hora local)
const PLATFORM_WINDOWS: Record<string, { hours: number[]; days: number[] }> = {
  instagram: {
    hours: [8, 12, 13, 17, 18, 19, 20, 21],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  facebook: {
    hours: [9, 10, 12, 13, 15, 17, 19, 20],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  tiktok: {
    hours: [8, 12, 13, 17, 18, 19, 20, 21, 22],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  linkedin: {
    hours: [8, 9, 12, 17, 18],
    days: [1, 2, 3, 4, 5],
  },
  x: {
    hours: [9, 12, 13, 17, 18, 20, 21],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
};

const MIN_HOURS_BETWEEN_POSTS = 3;
const MAX_POSTS_PER_DAY = 3;

// Genera minutos aleatorios para que no sea exacto (comportamiento humano)
function randomMinutes(): number {
  const ranges = [0, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55];
  return ranges[Math.floor(Math.random() * ranges.length)];
}

// Offset aleatorio pequeño para variar entre plataformas (5-25 min)
function crossPlatformOffset(): number {
  return 5 + Math.floor(Math.random() * 20);
}

// Obtiene la fecha/hora actual en Argentina
function nowInArgentina(): Date {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  return argentinaTime;
}

// Convierte hora local Argentina a UTC
function argentinaToLocal(year: number, month: number, day: number, hour: number, minute: number): Date {
  const local = new Date(year, month, day, hour, minute, 0, 0);
  // Argentina es UTC-3 fijo (sin DST)
  const utc = local.getTime() + (3 * 60 * 60 * 1000);
  return new Date(utc);
}

export const findOptimalSlots = action({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ScheduleSlot[]> => {
    const existingPosts = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const scheduled = existingPosts.filter((p) => p.status === "SCHEDULED");
    const windows = PLATFORM_WINDOWS[args.platform] || PLATFORM_WINDOWS.instagram;
    const count = args.count || 3;

    const now = nowInArgentina();
    const slots: ScheduleSlot[] = [];

    for (let dayOffset = 0; dayOffset < 14 && slots.length < count; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + dayOffset);

      const dayOfWeek = checkDate.getDay();
      if (!windows.days.includes(dayOfWeek)) continue;

      for (const hour of windows.hours) {
        if (slots.length >= count) break;

        const minute = randomMinutes();
        const slotTime = argentinaToLocal(
          checkDate.getFullYear(),
          checkDate.getMonth(),
          checkDate.getDate(),
          hour,
          minute
        );

        if (slotTime.getTime() <= Date.now()) continue;

        if (isSlotOccupied(slotTime.getTime(), scheduled)) continue;

        const score = calculateSlotScore(slotTime, args.platform, scheduled);

        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const localDate = new Date(slotTime.getTime() - (3 * 60 * 60 * 1000));
        const timeStr = `${localDate.getHours()}:${String(minute).padStart(2, "0")}`;

        slots.push({
          platform: args.platform,
          scheduledAt: slotTime.getTime(),
          scheduledAtLocal: `${dayNames[dayOfWeek]} ${timeStr} (ART)`,
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

// Programa automáticamente contenido para un campaña con horarios humanos
export const autoScheduleForCampaign = action({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const unscheduled = pieces.filter((p) => p.status === "GENERATED");
    const campaign = await ctx.runQuery(api.campaigns.getById, { id: args.campaignId });
    if (!campaign) return { scheduled: 0 };

    const platforms = campaign.platforms;
    let scheduledCount = 0;
    const now = nowInArgentina();

    for (let i = 0; i < unscheduled.length && scheduledCount < 21; i++) {
      const piece = unscheduled[i];
      const platform = platforms[i % platforms.length];

      const dayOffset = Math.floor(scheduledCount / 3) + 1;
      const timeSlot = getHumanTimeSlot(platform, dayOffset, now);

      const crossOffset = crossPlatformOffset() * 60 * 1000;
      const finalTime = new Date(timeSlot.getTime() + crossOffset);

      try {
        const socialAccounts = await ctx.runQuery(api.socialAccounts.getByPlatform, {
          platform,
        });

        if (socialAccounts.length === 0) continue;

        const account = socialAccounts[0];
        const idempotencyKey = `sched_${piece._id}_${platform}_${finalTime.getTime()}`;

        await ctx.runMutation(api.scheduledPosts.create, {
          contentPieceId: piece._id,
          socialAccountId: account._id,
          platform,
          scheduledAt: finalTime.getTime(),
          priority: 1,
          idempotencyKey,
        });

        await ctx.runMutation(api.contentPieces.update, {
          id: piece._id,
          status: "SCHEDULED",
        });

        scheduledCount++;
      } catch {
        // skip failed scheduling
      }
    }

    return { scheduled: scheduledCount };
  },
});

function getHumanTimeSlot(platform: string, dayOffset: number, now: Date): Date {
  const windows = PLATFORM_WINDOWS[platform] || PLATFORM_WINDOWS.instagram;
  const hour = windows.hours[Math.floor(Math.random() * windows.hours.length)];
  const minute = randomMinutes();

  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + dayOffset);

  return argentinaToLocal(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hour,
    minute
  );
}

function isSlotOccupied(slotMs: number, scheduled: any[]): boolean {
  return scheduled.some((post) => {
    const scheduledAt = post.scheduledAt || post.metadata?.scheduledAt;
    if (!scheduledAt) return false;
    const postTime = typeof scheduledAt === "number" ? scheduledAt : new Date(scheduledAt).getTime();
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

  // Argentina time
  const localTime = new Date(slotTime.getTime() - (3 * 60 * 60 * 1000));
  const hour = localTime.getHours();
  const day = localTime.getDay();

  const peakHours: Record<string, number[]> = {
    instagram: [12, 13, 18, 19, 20],
    facebook: [12, 13, 17, 19, 20],
    tiktok: [12, 18, 19, 20, 21],
    linkedin: [8, 12, 17],
    x: [12, 18, 20],
  };

  const platformPeaks = peakHours[platform] || peakHours.instagram;
  if (platformPeaks.includes(hour)) {
    score += 25;
  } else if (hour >= 8 && hour <= 22) {
    score += 10;
  }

  // Lunes a viernes son mejores
  if (day >= 1 && day <= 5) {
    score += 10;
  }

  // No más de 3 posts por día
  const postsOnDay = scheduled.filter((p) => {
    const scheduledAt = p.scheduledAt || p.metadata?.scheduledAt;
    if (!scheduledAt) return false;
    const postDate = typeof scheduledAt === "number" ? new Date(scheduledAt) : new Date(scheduledAt);
    return (
      postDate.getFullYear() === slotTime.getFullYear() &&
      postDate.getMonth() === slotTime.getMonth() &&
      postDate.getDate() === slotTime.getDate()
    );
  }).length;

  if (postsOnDay < MAX_POSTS_PER_DAY) {
    score += 10;
  } else {
    score -= 25;
  }

  // Variación aleatoria pequeña para que no sea siempre el mismo patrón
  score += Math.floor(Math.random() * 10) - 5;

  return Math.min(100, Math.max(0, score));
}

function getScoreReason(score: number, hour: number, day: number): string {
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const h = hour < 12 ? `${hour}AM` : hour === 12 ? "12PM" : `${hour - 12}PM`;

  if (score >= 70) return `Pico de audiencia - ${dayNames[day]} ${h}`;
  if (score >= 50) return `Buen horario - ${dayNames[day]} ${h}`;
  return `Horario aceptable - ${dayNames[day]} ${h}`;
}
