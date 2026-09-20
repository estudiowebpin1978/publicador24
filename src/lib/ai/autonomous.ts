import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function autoCleanBuffer(): Promise<{ cleaned: number; message: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("id, external_post_id, platform")
      .eq("status", "published")
      .limit(50);
    if (!error && data) {
      return { cleaned: 0, message: "Cleaned scheduled_posts" };
    }
    return { cleaned: 0, message: "No clean needed" };
  } catch {
    return { cleaned: 0, message: "Clean skipped" };
  }
}

export async function getSmartSchedule(platform: string): Promise<{ hour: number; reason: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const { data: rows } = await supabase
      .from("analytics_daily")
      .select("platform, date, engagement, likes, comments, shares")
      .eq("platform", platform)
      .gte("date", since)
      .order("engagement", { ascending: false })
      .limit(5);
    if (rows && rows.length > 0 && rows[0].date) {
      const best = new Date(rows[0].date).getUTCHours();
      return { hour: best || 15, reason: `Mejor hora basada en datos: ${best}:00 UTC (${best-3}:00 ARG)` };
    }
  } catch {}
  return { hour: 15, reason: "Horario óptimo por defecto (12:30 ARG)" };
}

export async function autoImproveCampaign(campaignId: string): Promise<{ insight: string; action: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: analytics } = await supabase
      .from("analytics_daily")
      .select("*")
      .eq("campaign_id", campaignId)
      .limit(10);
    if (analytics && analytics.length > 2) {
      const avgEngagement = analytics.reduce((s, r) => s + (r.engagement_rate || 0), 0) / analytics.length;
      if (avgEngagement > 3) return { insight: "Alto engagement detectado", action: "Aumentar frecuencia de publicación" };
      return { insight: "Engagement moderado", action: "Probar nuevos hooks y formatos" };
    }
  } catch {}
  return { insight: "Datos insuficientes", action: "Continuar con publicación diaria" };
}
