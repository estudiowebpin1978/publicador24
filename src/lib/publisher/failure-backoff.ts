import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isBufferRateLimited } from "@/lib/buffer/client";

const PLATFORM_KEY = "publish_failure";
const USER_ID = "00000000-0000-0000-0000-000000000000";

type Failures = Record<string, { until: number; reason: string; count: number }>;

const DEFAULT_BLOCK_MS = 30 * 60_000;
const PERMANENT_ERROR_BLOCK_MS = 2 * 60 * 60_000;

/** Milisegundos hasta la medianoche UTC (cuando BulkPublish resetea su cuota). */
function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60_000, next - now.getTime());
}

function blockMsFor(reason: string): number {
  if (/#?\s*200\b|#?\s*240\b|too many requests|\b429\b|rate limit|quota|not allowed|insufficient|permission/i.test(reason)) {
    if (/bulkpublish/i.test(reason)) return msUntilUtcMidnight();
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

/**
 * Detecta si un error de backoff es "estale" (de una causa ya corregida).
 * Estos se limpian automáticamente sin esperar a que venza el tiempo.
 */
export function isStaleBackoff(platform: string, reason: string): boolean {
  // "no media attached" era un error del flujo viejo (antes de normalizeMedia + waitForPostMedia).
  // Si el fix está desplegado, este backoff ya no tiene sentido.
  if (platform === "tiktok" && /no media attached|video requires a video/i.test(reason)) {
    return true;
  }
  // "All providers in rate limit" era por Buffer rate-limited (temporal).
  // Si Buffer ya se recuperó, este backoff es estale.
  if (/all providers in rate limit|Todos los proveedores en rate limit/i.test(reason)) {
    return true;
  }
  // "tiktok video requires a video (no media attached)" — error pre-fix
  if (platform === "tiktok" && /VALIDATION_ERROR.*no media/i.test(reason)) {
    return true;
  }
  return false;
}

/**
 * Limpia automáticamente los backoffs estales. Se llama al inicio del autopilot
 * para que un fix desplegado se propague sin intervención manual.
 */
export async function autoClearStaleBackoffs(): Promise<string[]> {
  const failures = await readFailures();
  const cleared: string[] = [];
  const now = Date.now();
  const bufferRecovered = !(await isBufferRateLimited());
  for (const [platform, entry] of Object.entries(failures)) {
    if (!entry || entry.until <= now) continue;
    if (isStaleBackoff(platform, entry.reason)) {
      cleared.push(platform);
      delete failures[platform];
      continue;
    }
    // Si Buffer se recuperó y el error era por Buffer rate limit, limpiar.
    if (bufferRecovered && /buffer.*rate limit|too many requests/i.test(entry.reason)) {
      cleared.push(platform);
      delete failures[platform];
      continue;
    }
  }
  if (cleared.length > 0) {
    await writeFailures(failures);
  }
  return cleared;
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

  let backoff: number;
  if (/bulkpublish/i.test(reason)) {
    backoff = msUntilUtcMidnight();
  } else {
    const base = blockMsFor(reason);
    backoff = Math.min(base * Math.pow(2, Math.max(0, count - 1)), 6 * 60 * 60_000);
  }

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

// Re-export for compatibility
export { readFailures, writeFailures };
