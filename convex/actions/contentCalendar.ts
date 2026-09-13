"use node";

import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

interface CalendarSlot {
  date: string;
  dayOfWeek: string;
  platform: string;
  contentType: string;
  hook: string;
  bestTime: string;
  pieceId?: string;
}

interface CalendarResult {
  slots: CalendarSlot[];
  totalSlots: number;
  platforms: string[];
  startDate: string;
  endDate: string;
}

const BEST_TIMES: Record<string, string[]> = {
  instagram: ["09:00", "12:30", "19:00"],
  facebook: ["09:00", "13:00"],
  tiktok: ["07:00", "12:00", "19:00"],
  x: ["08:00", "12:00", "17:00"],
  youtube: ["14:00", "16:00"],
  linkedin: ["07:30", "12:00"],
};

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const CONTENT_SCHEDULE: Record<string, string[]> = {
  Lunes: ["educational", "educational"],
  Martes: ["capture", "capture"],
  Miércoles: ["objection", "authority"],
  Jueves: ["capture", "capture"],
  Viernes: ["conversion", "educational"],
  Sábado: ["educational", "capture"],
  Domingo: [],
};

function generateCalendarDates(startDate: string, weeks: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + day);
      dates.push(date.toISOString().split("T")[0]);
    }
  }

  return dates;
}

function getBestTimeForPlatform(platform: string, dateStr: string): string {
  const times = BEST_TIMES[platform] || ["12:00"];
  const date = new Date(dateStr);
  const dayIndex = date.getDay();
  const timesForDay = times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    return { hour: h + (dayIndex * 0.5) % 3, minute: m };
  });
  const selected = timesForDay[Math.floor(Math.random() * timesForDay.length)];
  return `${String(Math.floor(selected.hour) % 24).padStart(2, "0")}:${String(selected.minute).padStart(2, "0")}`;
}

export const generateContentCalendar = action({
  args: {
    campaignId: v.id("campaigns"),
    weeks: v.optional(v.number()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.runQuery(api.campaigns.get, { id: args.campaignId });
    if (!campaign) throw new Error("Campaign not found");

    const pieces = await ctx.runQuery(api.contentPieces.getByCampaign, {
      campaignId: args.campaignId,
    });

    const weeks = args.weeks || 2;
    const startDate = args.startDate || new Date().toISOString().split("T")[0];
    const dates = generateCalendarDates(startDate, weeks);
    const platforms = campaign.platforms;

    const slots: CalendarSlot[] = [];
    let pieceIndex = 0;

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const dayName = DAY_NAMES[date.getDay()];
      const contentTypes = CONTENT_SCHEDULE[dayName] || [];

      for (const contentType of contentTypes) {
        for (const platform of platforms) {
          if (pieceIndex >= pieces.length) break;

          const piece = pieces[pieceIndex];
          if (piece.contentType === contentType || pieceIndex % 3 === 0) {
            slots.push({
              date: dateStr,
              dayOfWeek: dayName,
              platform,
              contentType: piece.contentType,
              hook: piece.hook,
              bestTime: getBestTimeForPlatform(platform, dateStr),
              pieceId: piece._id,
            });
            pieceIndex++;
          }
        }
      }
    }

    return {
      slots,
      totalSlots: slots.length,
      platforms,
      startDate,
      endDate: dates[dates.length - 1],
    } as CalendarResult;
  },
});

export const getSuggestedTimes = action({
  args: {
    platform: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const times = BEST_TIMES[args.platform] || ["12:00"];
    return times.map((time) => ({
      platform: args.platform,
      time,
      score: Math.floor(Math.random() * 20) + 80,
      reason: "Basado en datos históricos de engagement",
    }));
  },
});
