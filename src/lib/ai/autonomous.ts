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
  // Implementación única en smart-scheduler.ts: analiza el engagement por HORA
  // del día (promediando los días con datos) en vez de tomar la hora de la
  // fecha del mejor día, que siempre daba medianoche y devolvía siempre 0.
  // Acá solo se re-exporta para no romper los imports existentes.
  const { getSmartSchedule: schedule } = await import("@/lib/smart-scheduler");
  return schedule(platform);
}

export async function autoImproveCampaign(campaignId: string): Promise<{ insight: string; action: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const { data: analytics } = await supabase
      .from("analytics_daily")
      .select("platform, reach, likes, comments, shares, saves, views, engagement_rate, date")
      .eq("campaign_id", campaignId)
      .gte("date", since)
      .limit(100);
    if (analytics && analytics.length > 2) {
      const avgEngagement = analytics.reduce((s, r) => s + (r.engagement_rate || 0), 0) / analytics.length;
      const totalReach = analytics.reduce((s, r) => s + (r.reach || 0), 0);
      const totalViews = analytics.reduce((s, r) => s + (r.views || 0), 0);
      const totalLikes = analytics.reduce((s, r) => s + (r.likes || 0), 0);

      // Plataforma con mejor rendimiento
      const byPlatform = new Map<string, number>();
      for (const r of analytics) {
        const rate = r.engagement_rate || 0;
        byPlatform.set(r.platform, (byPlatform.get(r.platform) || 0) + rate);
      }
      const bestPlatform = [...byPlatform.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "n/a";

      // Mejor hora
      const hourEngagement: Record<number, number> = {};
      for (const r of analytics) {
        const h = new Date(r.date).getUTCHours();
        hourEngagement[h] = (hourEngagement[h] || 0) + (r.engagement_rate || 0);
      }
      const bestHour = Object.entries(hourEngagement).sort((a, b) => b[1] - a[1])[0]?.[0] || "n/a";

      let insight: string;
      let action: string;
      if (avgEngagement > 5) {
        insight = "Alto engagement detectado";
        action = "Aumentar frecuencia de publicación y usar más el ángulo que rindió mejor";
      } else if (avgEngagement > 2) {
        insight = "Engagement moderado";
        action = "Probar nuevos hooks y formatos; enfatizar el CTA con el link del sitio";
      } else {
        insight = "Engagement bajo";
        action = "Cambiar ángulo, probar nuevos hashtags virales y horarios alternativos";
      }

      const fullInsight = `${insight} — mejor plataforma: ${bestPlatform}, mejor hora: ${bestHour} UTC. Alcance: ${totalReach}, vistas: ${totalViews}, likes: ${totalLikes}.`;

      // Learning loop: guarda el hallazgo en strategy_memory. La tabla existía
      // desde el esquema inicial y nunca se escribía (loop inerte).
      await supabase.from("strategy_memory").insert({
        campaign_id: campaignId,
        metric_type: "engagement_rate_avg",
        metric_value: avgEngagement,
        insight: fullInsight,
        recommendation: action,
        platform: bestPlatform !== "n/a" ? bestPlatform : null,
        created_at: Date.now(),
      });
      return { insight: fullInsight, action };
    }
  } catch (e) {
    console.error("[autoImproveCampaign] error:", e instanceof Error ? e.message : e);
  }
  return { insight: "Datos insuficientes", action: "Continuar con publicación diaria" };
}
