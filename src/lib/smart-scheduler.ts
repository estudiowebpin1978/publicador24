import { getSupabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_SLOTS: Record<string, number[]> = {
  tiktok: [15, 16, 17, 20, 21],
  instagram: [15, 16, 20, 21, 23],
  facebook: [16, 17, 20, 21, 0],
};

export async function getOptimalTimeSlots(platform: string): Promise<number[]> {
  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const { data } = await supabase
    .from("analytics_daily")
    .select("date, impressions, likes, comments, shares, clicks, views")
    .eq("platform", platform)
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: false });

  if (!data || data.length < 5) {
    return DEFAULT_SLOTS[platform] || DEFAULT_SLOTS.instagram;
  }

  const hourlyEngagement: Record<number, number> = {};

  for (const row of data) {
    const hour = new Date(row.date).getUTCHours();
    const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.clicks || 0);
    const score = engagement * 1 + (row.impressions || 0) * 0.1 + (row.views || 0) * 0.05;
    hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + score;
  }

  const sorted = Object.entries(hourlyEngagement)
    .map(([hour, score]) => ({ hour: parseInt(hour), score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => e.hour);

  return sorted.length >= 3 ? sorted : DEFAULT_SLOTS[platform] || DEFAULT_SLOTS.instagram;
}

export async function shouldPostNow(platform: string): Promise<boolean> {
  const optimalHours = await getOptimalTimeSlots(platform);
  const currentHour = new Date().getUTCHours();

  return optimalHours.includes(currentHour) || optimalHours.includes((currentHour - 1 + 24) % 24);
}

export async function getSmartSchedule(platform: string): Promise<{ hour: number; reason: string }> {
  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const { data } = await supabase
    .from("analytics_daily")
    .select("date, impressions, likes, comments, shares, clicks, views")
    .eq("platform", platform)
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: false });

  if (!data || data.length < 5) {
    const fallback = DEFAULT_SLOTS[platform] || DEFAULT_SLOTS.instagram;
    const hour = fallback[Math.floor(Math.random() * fallback.length)];
    return { hour, reason: "Sin datos suficientes, usando horarios por defecto" };
  }

  const hourlyEngagement: Record<number, { total: number; count: number }> = {};

  for (const row of data) {
    const hour = new Date(row.date).getUTCHours();
    const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.clicks || 0);
    if (!hourlyEngagement[hour]) {
      hourlyEngagement[hour] = { total: 0, count: 0 };
    }
    hourlyEngagement[hour].total += engagement;
    hourlyEngagement[hour].count++;
  }

  const hourlyAverage = Object.entries(hourlyEngagement).map(([hour, data]) => ({
    hour: parseInt(hour),
    avg: data.total / data.count,
  }));

  hourlyAverage.sort((a, b) => b.avg - a.avg);

  const best = hourlyAverage[0];
  if (!best) {
    const fallback = DEFAULT_SLOTS[platform] || DEFAULT_SLOTS.instagram;
    const hour = fallback[Math.floor(Math.random() * fallback.length)];
    return { hour, reason: "Sin engagement suficiente, usando horarios por defecto" };
  }

  const avgEngagement = hourlyAverage.reduce((s, h) => s + h.avg, 0) / hourlyAverage.length;
  const boost = Math.round((best.avg / avgEngagement) * 100);

  return {
    hour: best.hour,
    reason: `Hora óptima según datos: +${boost}% engagement promedio (${Math.round(best.avg)} engagement/hora)`,
  };
}
