import type { SupabaseClient } from "@supabase/supabase-js";

export interface AntiBotDelay {
  minMs: number;
  maxMs: number;
  reason: string;
}

const DELAY_PROFILES: Record<string, AntiBotDelay> = {
  between_posts: { minMs: 5_000, maxMs: 20_000, reason: "Delay entre publicaciones" },
  between_platforms: { minMs: 3_000, maxMs: 12_000, reason: "Delay entre plataformas" },
  before_buffer: { minMs: 2_000, maxMs: 8_000, reason: "Delay antes de Buffer" },
  before_bulkpublish: { minMs: 1_500, maxMs: 6_000, reason: "Delay antes de BulkPublish" },
  before_meta: { minMs: 2_000, maxMs: 8_000, reason: "Delay antes de Meta Graph" },
};

export function getDelay(profile: keyof typeof DELAY_PROFILES): number {
  const p = DELAY_PROFILES[profile];
  return p.minMs + Math.random() * (p.maxMs - p.minMs);
}

export async function humanDelay(profile: keyof typeof DELAY_PROFILES): Promise<number> {
  const ms = Math.round(getDelay(profile));
  await new Promise((r) => setTimeout(r, ms));
  return ms;
}

// Franjas horarias en UTC pensadas para la audiencia de Argentina (UTC-3):
// se convierten de las ventanas de actividad reales del público, no de una
// lista genérica. La prime time argentina es la noche (19-23 ARG) y ahí es
// donde está el engagement más alto en redes, así que esas horas son pico.
//
//   ARG 7-9  (ida al trabajo)   -> UTC 10-12
//   ARG 12-14 (almuerzo)        -> UTC 15-17
//   ARG 19-23 (noche)           -> UTC 22-02
const TIME_SLOTS_PEAK: number[] = [10, 11, 12, 15, 16, 17, 22, 23, 0, 1, 2];
// Madrugada y primera hora: se publica solo si el azar lo elige (circula
// contenido cuando la competencia no está, pero nunca compite con la noche).
const TIME_SLOTS_OFFPEAK: number[] = [3, 4, 5, 6, 7, 8, 9, 13, 14, 18, 19, 20, 21];

/**
 * Elige un horario "humano" para el post.
 *
 * `preferredHour` (UTC) viene del scheduler con datos de engagement: si se
 * pasa, se respeta la hora y solo se varía el minuto (para que los posts no
 * caigan todos en el mismo minuto y se vea automatizado). Sin preferencia se
 * sortea entre las franjas de la audiencia argentina.
 */
export function pickHumanTimeSlot(
  platform: string,
  preferPeak: boolean = true,
  preferredHour?: number | null
): Date {
  const now = new Date();
  const day = now.getUTCDay();

  const platformDays: Record<string, number[]> = {
    tiktok: [1, 2, 3, 4, 5, 6, 0],
    instagram: [1, 2, 3, 4, 5, 6, 0],
    facebook: [1, 2, 3, 4, 5],
    youtube: [2, 3, 4, 5, 6],
  };
  const days = platformDays[platform] || [1, 2, 3, 4, 5];

  let dayOffset = 0;
  while (!days.includes((day + dayOffset) % 7)) {
    dayOffset++;
    if (dayOffset > 7) break;
  }

  const hasPreferred =
    typeof preferredHour === "number" &&
    Number.isFinite(preferredHour) &&
    preferredHour >= 0 &&
    preferredHour <= 23;

  const slots = preferPeak && Math.random() > 0.3 ? TIME_SLOTS_PEAK : TIME_SLOTS_OFFPEAK;
  const hour = hasPreferred
    ? ((Math.floor(preferredHour as number) % 24) + 24) % 24
    : slots[Math.floor(Math.random() * slots.length)];
  // Minuto aleatorio salvo que la hora venga de datos: ahí se desplaza ±25 min
  // para no publicar siempre en el mismo punto exacto.
  const minute = hasPreferred
    ? Math.min(59, Math.max(0, Math.floor(Math.random() * 51) + Math.floor(Math.random() * 9)))
    : Math.floor(Math.random() * 60);

  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + dayOffset);
  target.setUTCHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}

export function humanizeText(text: string): string {
  let result = text;

  // Sinónimos sólo cuando la frase sigue leyéndose natural después del cambio
  // (nada de reemplazos que rompan la gramática ni palabras de manual de IA).
  const variations: [RegExp, string[]][] = [
    [/\bgratis\b/gi, ["gratis", "sin costo", "gratis posta"]],
    [/\bapp\b/gi, ["app", "aplicación", "la app"]],
    [/\bpágina web\b/gi, ["página web", "web", "sitio"]],
  ];

  for (const [pattern, options] of variations) {
    if (pattern.test(result) && Math.random() > 0.5) {
      const replacement = options[Math.floor(Math.random() * options.length)];
      result = result.replace(new RegExp(pattern.source, pattern.flags.replace("g", "")), replacement);
    }
  }

  // Emojis con moderación: sólo si el texto todavía no tiene ninguno.
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(result);
  if (!hasEmoji && Math.random() > 0.5) {
    const emojiSets = [["🔥", "💰"], ["✅", "🎯"], ["🚀", "💡"], ["⭐", "🎉"]];
    const set = emojiSets[Math.floor(Math.random() * emojiSets.length)];
    result = `${set[0]} ${result} ${set[1]}`;
  }

  return result;
}

export function getDailyPostLimit(platform: string, direct = false): number {
  const limits: Record<string, number> = {
    facebook: 10,
    instagram: 3,
    // BulkPublish (unica via gratis de TikTok) responde en su plan Free:
    // "You've reached the posts per day limit (3/3)". Intentar mas posts no
    // solo falla: gasta tiempo de IA y de render de video por cada intento.
    tiktok: 3,
    youtube: 3,
  };
  const base = limits[platform] || 5;
  // El doble solo aplica a las plataformas que se publican con la API oficial
  // de Meta (Graph): no arriesga bloqueo de navegador/cuenta como si lo hace
  // automatizar la UI. TikTok se publica via BulkPublish, que tiene limite
  // duro de plan, asi que ahi `direct` no habilita margen extra.
  const isMetaPlatform = platform === "facebook" || platform === "instagram";
  return direct && isMetaPlatform ? base * 2 : base;
}

export async function checkDailyQuota(
  platform: string,
  supabase: SupabaseClient,
  opts: { direct?: boolean } = {}
): Promise<boolean> {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("content_pieces")
      .select("id", { count: "exact", head: true })
      .eq("platform", platform)
      .gte("published_at", todayStart.getTime());
    return (count || 0) < getDailyPostLimit(platform, opts.direct === true);
  } catch {
    return true;
  }
}
