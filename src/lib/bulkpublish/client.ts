const BASE_URL = "https://app.bulkpublish.com";

import { getSupabaseAdmin } from "@/lib/supabase/server";

const RL_KEY = "bulkpublish_rate_limit";
let localUntil = 0;
let lastRemoteCheck = 0;
let remoteUntil = 0;

export function isBulkPublishRateLimited(): boolean {
  return Date.now() < Math.max(localUntil, remoteUntil);
}

function markRateLimited(ms: number = 60 * 60_000) {
  localUntil = Date.now() + ms;
  void persist();
}

// BulkPublish limita por día (resetea a medianoche UTC): conviene bloquear hasta entonces.
function msUntilDailyReset(): number {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60_000, nextUtcMidnight - now.getTime());
}

function clearRateLimit() {
  const had = localUntil > 0 || remoteUntil > 0;
  localUntil = 0;
  remoteUntil = 0;
  if (had) void persist(0);
}

async function persist(until?: number) {
  try {
    const supabase = getSupabaseAdmin();
    const ts = until ?? localUntil;
    await supabase.from("social_accounts").delete().eq("platform", RL_KEY).eq("user_id", "00000000-0000-0000-0000-000000000000");
    if (ts > 0) {
      await supabase.from("social_accounts").insert({
        platform: RL_KEY,
        user_id: "00000000-0000-0000-0000-000000000000",
        access_token: JSON.stringify({ until: ts }),
        connected_at: Date.now(),
      });
    }
  } catch {}
}

async function refreshRemoteState() {
  const now = Date.now();
  if (now - lastRemoteCheck < 60_000) return;
  lastRemoteCheck = now;
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", RL_KEY)
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

export async function bpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = process.env.BULKPUBLISH_API_KEY;
  if (!apiKey) throw new Error("BULKPUBLISH_API_KEY not configured");

  await refreshRemoteState();
  if (isBulkPublishRateLimited()) {
    throw new Error("BulkPublish rate limited — skipping");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 429) {
    const body429 = await res.text().catch(() => "");
    markRateLimited(msUntilDailyReset());
    throw new Error(`BulkPublish rate limited (429${body429 ? `: ${body429.slice(0, 160)}` : ""})`);
  }

  if (!res.ok) {
    const body = await res.text();
    if (/DAILY_QUOTA_EXCEEDED|quota exceeded/i.test(body)) {
      markRateLimited(msUntilDailyReset());
      throw new Error(`BulkPublish rate limited (cuota: ${body.slice(0, 160)})`);
    }
    // Límite del plan (p.ej. 3 posts/día gratis): reintentar hoy solo gasta
    // llamadas de la cuota diaria, así que cortamos hasta mañana.
    if (/plan limit|upgrade|not available in your plan|maximum (of )?\d+ post|post limit|reached your limit/i.test(body)) {
      markRateLimited(msUntilDailyReset());
      throw new Error(`BulkPublish rate limited (plan: ${body.slice(0, 160)})`);
    }
    throw new Error(`BulkPublish ${res.status}: ${body}`);
  }

  clearRateLimit();
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export interface BulkPublishChannel {
  id: number;
  platform: string;
  username?: string;
  name?: string;
  status?: string;
}

let channelsCache: { at: number; channels: BulkPublishChannel[] } | null = null;
// Las instancias serverless son volátiles: sin cache remota cada cold start
// gastaba 1 de los 30 requests diarios solo por listar canales.
const CHANNELS_CACHE_MS = 30 * 60_000;
const CHANNELS_REMOTE_TTL_MS = 6 * 60 * 60_000;
const CHANNELS_KEY = "bulkpublish_channels";

async function loadRemoteChannels(): Promise<BulkPublishChannel[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", CHANNELS_KEY)
      .eq("user_id", "00000000-0000-0000-0000-000000000000")
      .limit(1);
    const parsed = JSON.parse(data?.[0]?.access_token || "{}");
    if (
      typeof parsed?.at === "number" &&
      Date.now() - parsed.at < CHANNELS_REMOTE_TTL_MS &&
      Array.isArray(parsed.channels) &&
      parsed.channels.length > 0
    ) {
      return parsed.channels as BulkPublishChannel[];
    }
  } catch {}
  return null;
}

async function saveRemoteChannels(channels: BulkPublishChannel[]): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("social_accounts")
      .delete()
      .eq("platform", CHANNELS_KEY)
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("social_accounts").insert({
      platform: CHANNELS_KEY,
      user_id: "00000000-0000-0000-0000-000000000000",
      channel_name: "BulkPublish channels cache",
      access_token: JSON.stringify({ at: Date.now(), channels }),
      status: "active",
      connected_at: Date.now(),
      updated_at: Date.now(),
    });
  } catch {}
}

export async function getChannels(): Promise<BulkPublishChannel[]> {
  if (channelsCache && Date.now() - channelsCache.at < CHANNELS_CACHE_MS) {
    return channelsCache.channels;
  }

  const remote = await loadRemoteChannels();
  if (remote) {
    channelsCache = { at: Date.now(), channels: remote };
    return remote;
  }

  const data = await bpFetch<{ channels: BulkPublishChannel[] }>("/api/channels");
  const channels = data.channels || [];
  channelsCache = { at: Date.now(), channels };
  if (channels.length > 0) void saveRemoteChannels(channels);
  return channels;
}

export function invalidateChannelsCache() {
  channelsCache = null;
  try {
    const supabase = getSupabaseAdmin();
    void supabase
      .from("social_accounts")
      .delete()
      .eq("platform", CHANNELS_KEY)
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
  } catch {}
}

export async function createPost(input: {
  text: string;
  channelIds: number[];
  mediaUrls?: string[];
  /**
   * TikTok exige un VIDEO: si el medio no viene marcado como video la API
   * responde 400 "tiktok video requires a video (no media attached)". Solo se
   * envía el tipo cuando se pide explícitamente, para no tocar el camino de
   * imágenes que ya funciona.
   */
  mediaType?: string;
  scheduledAt?: string;
  publishNow?: boolean;
}): Promise<{ id?: string | number; success?: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    content: input.text,
    channels: input.channelIds,
    status: input.scheduledAt ? "scheduled" : "draft",
  };

  if (input.scheduledAt) {
    payload.scheduledAt = input.scheduledAt;
  }

  if (input.mediaUrls && input.mediaUrls.length > 0) {
    payload.media = input.mediaUrls.map((url) =>
      input.mediaType ? { url, type: input.mediaType } : { url }
    );
  }

  let postId: string | number | undefined;
  try {
    const data = await bpFetch<{ id?: string | number; success?: boolean; post?: { id: string | number } }>(
      "/api/posts",
      { method: "POST", body: JSON.stringify(payload) }
    );
    postId = data.id || data.post?.id;
  } catch (e) {
    if (e instanceof Error && /rate limited/i.test(e.message)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/channel|not connected|unauthorized/i.test(msg)) {
      return { success: false, error: msg };
    }
    // Se aclara que falló la CREACIÓN: así un 400 con "requires a video" se
    // sabe que viene del payload del post y no del paso de publicación.
    throw new Error(`create: ${msg}`);
  }

  if (input.publishNow && postId) {
    try {
      await bpFetch(`/api/posts/${postId}/publish`, { method: "POST" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { id: postId, success: false, error: `publish: ${msg}` };
    }
  }

  return { id: postId, success: true };
}

export async function listPosts(channelId?: number, limit: number = 50): Promise<{ id: number | string; status: string }[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (channelId) params.set("channels", String(channelId));
  const data = await bpFetch<{ posts?: { id: number | string; status: string }[] }>(`/api/posts?${params}`);
  return data.posts || [];
}

export async function deletePost(postId: number | string): Promise<boolean> {
  try {
    await bpFetch(`/api/posts/${postId}`, { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}

export async function normalizeMedia(url: string): Promise<string> {
  try {
    const data = await bpFetch<{ url?: string; id?: string | number }>(
      `/api/media?url=${encodeURIComponent(url)}`,
      { method: "POST" }
    );
    return (data.url as string) || url;
  } catch {
    return url;
  }
}

/**
 * Borra el bloqueo de rate limit tanto en memoria como en la fila persistida.
 * Importante: la instancia serverless arranca "limpia" (localUntil=0), así que
 * clearRateLimit() por sí solo no haría nada y el bloqueo volvería a cargarse
 * desde Supabase en el próximo ciclo.
 */
export function resetRateLimit() {
  localUntil = 0;
  remoteUntil = 0;
  lastRemoteCheck = 0;
  void persist(0);
}
