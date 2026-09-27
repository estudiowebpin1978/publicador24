import { getSupabaseAdmin } from "@/lib/supabase/server";

const PLATFORM = "cleanup_gate";
const USER_ID = "00000000-0000-0000-0000-000000000000";

type Gates = Record<string, number>;

async function readGates(): Promise<Gates> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", PLATFORM)
      .eq("user_id", USER_ID)
      .limit(10);

    const merged: Gates = {};
    for (const row of data || []) {
      try {
        const parsed = JSON.parse(row.access_token || "{}") as Gates;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "number") merged[k] = Math.max(merged[k] || 0, v);
        }
      } catch {}
    }
    return merged;
  } catch {
    return {};
  }
}

async function writeGates(gates: Gates): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("social_accounts")
      .delete()
      .eq("platform", PLATFORM)
      .eq("user_id", USER_ID);

    const active: Gates = {};
    const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
    for (const [k, v] of Object.entries(gates)) {
      if (v > cutoff) active[k] = v;
    }

    if (Object.keys(active).length > 0) {
      await supabase.from("social_accounts").insert({
        platform: PLATFORM,
        user_id: USER_ID,
        channel_name: "Cleanup throttle",
        access_token: JSON.stringify(active),
        status: "active",
        connected_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  } catch {}
}

/**
 * Reserva la corrida de un cleanup. Los providers gratuitos tienen cuota diaria
 * de API calls (BulkPublish: 30/día) y el cron corre cada 15 min: sin este
 * gate la limpieza se come toda la cuota y no queda para publicar.
 *
 * Devuelve { run: true } si este llamado debe ejecutar la limpieza.
 */
export async function claimCleanupRun(
  key: string,
  minIntervalMs: number
): Promise<{ run: boolean; nextRunInMs: number }> {
  const gates = await readGates();
  const last = gates[key] || 0;
  const now = Date.now();

  if (now - last < minIntervalMs) {
    return { run: false, nextRunInMs: last + minIntervalMs - now };
  }

  gates[key] = now;
  await writeGates(gates);
  return { run: true, nextRunInMs: minIntervalMs };
}

export async function releaseCleanupRun(key: string): Promise<void> {
  const gates = await readGates();
  if (!gates[key]) return;
  delete gates[key];
  await writeGates(gates);
}
