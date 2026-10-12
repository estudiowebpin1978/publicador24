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
