import { getSupabaseAdmin } from "@/lib/supabase/server";

const PLATFORM_KEY = "publish_failure";
const USER_ID = "00000000-0000-0000-0000-000000000000";

type Failures = Record<string, { until: number; reason: string; count: number }>;

const DEFAULT_BLOCK_MS = 30 * 60_000;
const PERMANENT_ERROR_BLOCK_MS = 2 * 60 * 60_000;

function blockMsFor(reason: string): number {
  // Errores de permisos/quotea: reintentar en seguida no cambia nada y solo
  // gasta IA, así que espaciamos el reintento.
  if (/#?\s*200\b|#?\s*240\b|too many requests|\b429\b|rate limit|quota|not allowed|insufficient|permission/i.test(reason)) {
    return PERMANENT_ERROR_BLOCK_MS;
  }
  return DEFAULT_BLOCK_MS;
}

async function readFailures(): Promise<Failures> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", PLATFORM_KEY)
      .eq("user_id", USER_ID)
      .limit(10);

    const merged: Failures = {};
    for (const row of data || []) {
      try {
        const parsed = JSON.parse(row.access_token || "{}") as Failures;
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v.until === "number") {
            if (!merged[k] || merged[k].until < v.until) merged[k] = v;
          }
        }
      } catch {}
    }
    return merged;
  } catch {
    return {};
  }
}

async function writeFailures(failures: Failures): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("social_accounts")
      .delete()
      .eq("platform", PLATFORM_KEY)
      .eq("user_id", USER_ID);

    const active: Failures = {};
    for (const [k, v] of Object.entries(failures)) {
      if (v && v.until > Date.now()) active[k] = v;
    }

    if (Object.keys(active).length > 0) {
      await supabase.from("social_accounts").insert({
        platform: PLATFORM_KEY,
        user_id: USER_ID,
        channel_name: "Publish failure backoff",
        access_token: JSON.stringify(active),
        status: "active",
        connected_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  } catch {}
}

/** Devuelve el motivo si la plataforma está en pausa por fallos recientes. */
export async function getPublishBlock(platform: string): Promise<string | null> {
  const failures = await readFailures();
  const entry = failures[platform];
  if (!entry) return null;
  if (entry.until <= Date.now()) return null;
  return entry.reason;
}

/** Registra un fallo de publicación y pausa esa plataforma un rato. */
export async function markPublishFailure(platform: string, reason: string): Promise<void> {
  const failures = await readFailures();
  const previous = failures[platform];
  const now = Date.now();
  const count = (previous?.count || 0) + 1;
  const base = blockMsFor(reason);
  // Cada repetición duplica la espera (30min → 1h → 2h → 4h, tope 6h).
  const backoff = Math.min(base * Math.pow(2, Math.max(0, count - 1)), 6 * 60 * 60_000);

  failures[platform] = {
    until: now + backoff,
    reason: reason.slice(0, 300),
    count,
  };
  await writeFailures(failures);
}

/** Limpia el backoff cuando vuelve a publicar bien. */
export async function clearPublishFailure(platform: string): Promise<void> {
  const failures = await readFailures();
  if (!failures[platform]) return;
  delete failures[platform];
  await writeFailures(failures);
}
