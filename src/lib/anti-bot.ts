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

const TIME_SLOTS_PEAK: number[] = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const TIME_SLOTS_OFFPEAK: number[] = [8, 9, 10, 11, 23, 0, 1];

export function pickHumanTimeSlot(platform: string, preferPeak: boolean = true): Date {
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

  const slots = preferPeak && Math.random() > 0.3 ? TIME_SLOTS_PEAK : TIME_SLOTS_OFFPEAK;
  const hour = slots[Math.floor(Math.random() * slots.length)];
  const minute = Math.floor(Math.random() * 60);

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

  const variations: [RegExp, string[]][] = [
    [/\b ganar \b/gi, ["ganar", "hacer plata", "increíble"]],
    [/\b gratis \b/gi, ["gratis", "sin costo", "0 pesos"]],
    [/\b app \b/gi, ["app", "aplicación", "la app"]],
  ];

  for (const [pattern, options] of variations) {
    if (Math.random() > 0.7 && pattern.test(result)) {
      const replacement = options[Math.floor(Math.random() * options.length)];
      result = result.replace(pattern, replacement);
    }
  }

  const emojiSets = [["🔥", "💰"], ["✅", "🎯"], ["🚀", "💡"], ["⭐", "🎉"]];
  if (Math.random() > 0.5 && !result.includes("🔥") && !result.includes("✅")) {
    const set = emojiSets[Math.floor(Math.random() * emojiSets.length)];
    result = `${set[0]} ${result} ${set[1]}`;
  }

  return result;
}

export function getDailyPostLimit(platform: string, direct = false): number {
  const limits: Record<string, number> = {
    facebook: 10,
    instagram: 8,
    tiktok: 6,
    youtube: 3,
  };
  const base = limits[platform] || 5;
  // Publicar directo por la API oficial (Meta Graph) no arriesga bloqueo del
  // navegador/cuenta como sí lo hace automatizar la UI: se permite el doble.
  return direct ? base * 2 : base;
}

export async function checkDailyQuota(
  platform: string,
  supabase: { from: (t: string) => Record<string, unknown> },
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
