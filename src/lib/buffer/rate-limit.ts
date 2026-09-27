import { getSupabaseAdmin } from "@/lib/supabase/server";

const KEY = "buffer_rate_limit";
const DEFAULT_BLOCK_MS = 30 * 60_000;

let localUntil = 0;
let lastRemoteCheck = 0;
let remoteUntil = 0;

export function isRateLimited(): boolean {
  return Date.now() < Math.max(localUntil, remoteUntil);
}

export function markRateLimited(ms: number = DEFAULT_BLOCK_MS) {
  localUntil = Date.now() + ms;
  void persist();
}

export function clearRateLimit() {
  const hadBlock = localUntil > 0 || remoteUntil > 0;
  localUntil = 0;
  remoteUntil = 0;
  if (hadBlock) void persist(0);
}

async function persist(until?: number) {
  try {
    const supabase = getSupabaseAdmin();
    const ts = until ?? localUntil;
    await supabase
      .from("social_accounts")
      .delete()
      .eq("platform", KEY)
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
    if (ts > 0) {
      await supabase.from("social_accounts").insert({
        platform: KEY,
        user_id: "00000000-0000-0000-0000-000000000000",
        access_token: JSON.stringify({ until: ts }),
        connected_at: Date.now(),
      });
    }
  } catch {}
}

export async function refreshRemoteState() {
  const now = Date.now();
  if (now - lastRemoteCheck < 60_000) return;
  lastRemoteCheck = now;
  try {
    const supabase = getSupabaseAdmin();
    // Puede haber más de una fila si dos instancias escribieron a la vez:
    // leemos todas y nos quedamos con el bloqueo más largo.
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", KEY)
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .limit(10);

    const untils = (data || [])
      .map((row) => {
        try {
          const parsed = JSON.parse(row.access_token || "{}");
          return typeof parsed.until === "number" ? parsed.until : 0;
        } catch {
          return 0;
        }
      })
      .filter((t) => t > 0);

    remoteUntil = untils.length ? Math.max(...untils) : 0;
  } catch {}
}
