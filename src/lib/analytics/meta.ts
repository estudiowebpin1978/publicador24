import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Meta Insights (Instagram) -> analytics_daily
 *
 * Es la fuente de engagement real del sistema. Buffer esta rate-limited 30
 * dias y BulkPublish no expone analitica (404), pero el Graph API de Meta si
 * devuelve metricas reales por publicacion con el mismo Page token que ya
 * usamos para publicar en Instagram.
 *
 * Notas de la API (verificadas contra v21):
 * - `impressions` se elimino a partir de la v22: no se pide y la columna
 *   queda en 0; el alcance real se mide con `reach`.
 * - `link_clicks` solo aplica a ciertos tipos de producto: tampoco se pide
 *   para que el batch no falle entero.
 * - `date` de cada fila guarda el timestamp EXACTO de la publicacion (no
 *   medianoche): smart-scheduler deriva la HORA de engagement de esa fecha.
 *   Con fechas a medianoche siempre aprendia la hora 0.
 * - `campaign_id` es NOT NULL en el esquema: se asocia a la primera campaña
 *   activa (mismo criterio que el autopilot) para que autoImproveCampaign()
 *   pueda leer estas filas.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

// Metricas validas para IG media insights en todos los tipos de producto
// (IMAGE/VIDEO/REELS). Verificado: reach/views/likes/comments/shares/saved
// responden OK; impressions da error (#100 v22+) y link_clicks no aplica a
// FEED, por eso no se piden.
const IG_MEDIA_METRICS = "reach,views,likes,comments,shares,saved";

const BATCH_SIZE = 50; // limite documentado de sub-requests por batch
const MAX_MEDIA_PAGES = 6; // 100 media por pagina -> hasta 600 posts
const MAX_MEDIA = 400; // techo de posts consultados por pasada
const INDIVIDUAL_FALLBACK_LIMIT = 150; // requests sueltas si el batch falla

interface IgMetric {
  name: string;
  values: { value: number }[];
}

interface MediaItem {
  id: string;
  ts: number;
}

export interface MetaSyncResult {
  platform: "instagram";
  /** posts de Instagram consultados dentro de la ventana */
  posts: number;
  /** filas nuevas insertadas en analytics_daily */
  inserted: number;
  /** filas existentes actualizadas (las metricas lifetime crecen) */
  updated: number;
  /** filas sin cambios (no se toco la base) */
  unchanged: number;
  /** posts consultados sin insights (borrados o formato no soportado) */
  skipped: number;
  /** true si al menos un batch devolvio datos (diagnostico) */
  batchWorked: boolean;
  campaignId: string | null;
}

function pageToken(): string {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN no configurado");
  return token;
}

async function graphGet<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(
    `${GRAPH}${path}${sep}access_token=${encodeURIComponent(pageToken())}`,
    { cache: "no-store" }
  );
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || json?.error) {
    throw new Error(`Meta Graph ${path}: ${json?.error?.message || `HTTP ${res.status}`}`);
  }
  return json;
}

/**
 * ID de la cuenta de Instagram empresarial. Se resuelve desde la Page
 * vinculada (el entorno no siempre tiene META_INSTAGRAM_BUSINESS_ID seteado).
 */
export async function resolveInstagramAccountId(): Promise<string> {
  const envId = (process.env.META_INSTAGRAM_BUSINESS_ID || "").trim();
  if (envId) return envId;
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new Error("META_PAGE_ID no configurado");
  const data = await graphGet<{ instagram_business_account?: { id: string } }>(
    `/${pageId}?fields=instagram_business_account{id}`
  );
  const id = data.instagram_business_account?.id;
  if (!id) throw new Error("La Page no tiene cuenta de Instagram empresarial vinculada");
  return id;
}

/** Media reciente (id + timestamp epoch ms) dentro de la ventana, paginada. */
async function fetchRecentMedia(igId: string, sinceMs: number): Promise<MediaItem[]> {
  const out: MediaItem[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_MEDIA_PAGES && out.length < MAX_MEDIA; page++) {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
    const data = await graphGet<{
      data: { id: string; timestamp: string }[];
      paging?: { cursors?: { after?: string } };
    }>(`/${igId}/media?fields=id,timestamp&limit=100${cursor}`);

    let reachedSince = false;
    for (const media of data.data || []) {
      const ts = new Date(media.timestamp).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts < sinceMs) {
        reachedSince = true;
        break;
      }
      out.push({ id: media.id, ts });
    }
    const next = data.paging?.cursors?.after;
    if (reachedSince || !next || (data.data || []).length === 0) break;
    after = next;
  }
  return out;
}

/**
 * POST a la Graph batch API. Devuelve el HTTP y el JSON crudo para poder
 * diagnosticar desde la sonda (?test=metainsights) cuando algo falla.
 */
async function postBatch(relativeUrls: string[]): Promise<{
  http: number;
  json: unknown;
  error: string | null;
}> {
  const batch = relativeUrls.map((u) => ({ method: "GET", relative_url: u }));
  try {
    const res = await fetch(`${GRAPH}/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageToken()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ batch: JSON.stringify(batch) }),
      cache: "no-store",
    });
    const json = (await res.json()) as unknown;
    const topError =
      json && typeof json === "object" && !Array.isArray(json) && "error" in json;
    if (!res.ok || topError) {
      return {
        http: res.status,
        json,
        error: `batch HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
      };
    }
    return { http: res.status, json, error: null };
  } catch (e) {
    return { http: 0, json: null, error: e instanceof Error ? e.message : "batch fetch error" };
  }
}

/** Extrae metrics por id de una respuesta batch (formatos array y objeto). */
function collectBatchResults(
  json: unknown,
  ids: string[],
  target: Map<string, IgMetric[]>
): number {
  if (!Array.isArray(json)) return 0;
  let hits = 0;
  ids.forEach((id, idx) => {
    const entry = json[idx];
    if (!entry || typeof entry !== "object") return;
    let body: unknown;
    if (Array.isArray(entry)) {
      // Formato historico: [status, body, headers]
      body = entry[1];
    } else {
      // Formato actual: { code, headers, body }
      const obj = entry as { code?: number; body?: unknown };
      if (typeof obj.code === "number" && obj.code >= 400) return;
      body = obj.body;
    }
    let parsed: { data?: IgMetric[] } | null = null;
    try {
      parsed = typeof body === "string" ? JSON.parse(body) : (body as { data?: IgMetric[] });
    } catch {
      parsed = null;
    }
    if (Array.isArray(parsed?.data)) {
      target.set(id, parsed.data);
      hits++;
    }
  });
  return hits;
}

/**
 * Insights por media. Primero la Graph batch API (hasta 50 sub-requests por
 * llamada) y luego repara los ids que falten con requests individuales.
 */
async function fetchInsightsMap(mediaIds: string[]): Promise<{
  map: Map<string, IgMetric[]>;
  batchWorked: boolean;
}> {
  const result = new Map<string, IgMetric[]>();
  let batchWorked = false;

  for (let i = 0; i < mediaIds.length; i += BATCH_SIZE) {
    const chunk = mediaIds.slice(i, i + BATCH_SIZE);
    const urls = chunk.map((id) => `${id}/insights?metric=${IG_MEDIA_METRICS}`);
    const res = await postBatch(urls);
    if (res.error) continue;
    const hits = collectBatchResults(res.json, chunk, result);
    if (hits > 0) batchWorked = true;
  }

  // Repara ids sin insights (batch parcial o completo).
  const missing = mediaIds.filter((id) => !result.has(id));
  for (const id of missing.slice(0, INDIVIDUAL_FALLBACK_LIMIT)) {
    try {
      const data = await graphGet<{ data: IgMetric[] }>(
        `/${id}/insights?metric=${IG_MEDIA_METRICS}`
      );
      if (Array.isArray(data.data)) result.set(id, data.data);
    } catch {
      // Media sin insights (borrado, privado o tipo no soportado): se omite.
    }
  }
  return { map: result, batchWorked };
}

function metricValue(metrics: IgMetric[], name: string): number {
  const found = metrics.find((m) => m.name === name);
  const value = found?.values?.[0]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Sonda de diagnostico (?test=metainsights): ejecuta un batch real con `count`
 * ids y devuelve HTTP, formato de las entradas y codigos por entrada, para
 * ver exactamente que responde Meta desde el entorno de produccion.
 */
export async function runBatchProbe(count = 3): Promise<Record<string, unknown>> {
  const igId = await resolveInstagramAccountId();
  const media = await fetchRecentMedia(igId, Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ids = media.slice(0, Math.min(count, 50)).map((m) => m.id);
  if (ids.length === 0) return { error: "sin media reciente" };

  const res = await postBatch(ids.map((id) => `${id}/insights?metric=${IG_MEDIA_METRICS}`));
  const entries = Array.isArray(res.json)
    ? (res.json as unknown[]).map((e) => {
        if (Array.isArray(e)) return { shape: "array", code: e[0] };
        const obj = e as { code?: number; body?: unknown };
        return {
          shape: "object",
          code: obj.code,
          bodySnippet: String(obj.body ?? "").slice(0, 160),
        };
      })
    : null;
  return {
    ids: ids.length,
    http: res.http,
    error: res.error,
    topShape: Array.isArray(res.json) ? "array" : typeof res.json,
    entries,
    raw: entries ? undefined : JSON.stringify(res.json).slice(0, 300),
  };
}

/**
 * Sincroniza los insights de los posts de Instagram publicados en los ultimos
 * `days` dias hacia analytics_daily (una fila por post, con su hora exacta).
 */
export async function syncInstagramInsights(days = 30): Promise<MetaSyncResult> {
  const supabase = getSupabaseAdmin();
  const windowDays = Math.min(Math.max(days, 1), 90);
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  // campaign_id NOT NULL: la primera activa por antigüedad (igual que el
  // autopilot toma campaigns[0]), para que autoImproveCampaign() lea estas filas.
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1);
  if (campErr) throw new Error(`campaigns: ${campErr.message}`);
  const campaignId: string | null = campaigns?.[0]?.id ?? null;
  if (!campaignId) throw new Error("No hay campañas activas para asociar las metricas");

  const igId = await resolveInstagramAccountId();
  const media = await fetchRecentMedia(igId, since);
  const base: MetaSyncResult = {
    platform: "instagram",
    posts: media.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    batchWorked: false,
    campaignId,
  };
  if (media.length === 0) return base;

  const { map: insights, batchWorked } = await fetchInsightsMap(media.map((m) => m.id));
  base.batchWorked = batchWorked;

  // Filas existentes de la ventana en una sola consulta.
  const { data: existingRows, error: rowsErr } = await supabase
    .from("analytics_daily")
    .select("id, date, reach, likes, comments, shares, saves, views, engagement_rate")
    .eq("platform", "instagram")
    .gte("date", since);
  if (rowsErr) throw new Error(`analytics_daily: ${rowsErr.message}`);
  const byDate = new Map<number, (typeof existingRows)[number]>();
  for (const row of existingRows || []) {
    byDate.set(Number(row.date), row);
  }

  const toInsert: Record<string, unknown>[] = [];
  for (const item of media) {
    const metrics = insights.get(item.id);
    if (!metrics) {
      base.skipped++;
      continue;
    }
    const reach = metricValue(metrics, "reach");
    const views = metricValue(metrics, "views");
    const likes = metricValue(metrics, "likes");
    const comments = metricValue(metrics, "comments");
    const shares = metricValue(metrics, "shares");
    const saves = metricValue(metrics, "saved");
    const engagementRate =
      reach > 0
        ? Math.round(((likes + comments + shares + saves) / reach) * 10000) / 100
        : 0;

    const prev = byDate.get(item.ts);
    if (!prev) {
      toInsert.push({
        campaign_id: campaignId,
        platform: "instagram",
        date: item.ts,
        impressions: 0, // Meta elimino impressions en v22: no se inventa
        reach,
        likes,
        comments,
        shares,
        saves,
        views,
        clicks: 0, // link_clicks no aplica a todos los formatos
        engagement_rate: engagementRate,
        created_at: Date.now(),
      });
      base.inserted++;
      continue;
    }

    const changed =
      (prev.reach || 0) !== reach ||
      (prev.likes || 0) !== likes ||
      (prev.comments || 0) !== comments ||
      (prev.shares || 0) !== shares ||
      (prev.saves || 0) !== saves ||
      (prev.views || 0) !== views ||
      (prev.engagement_rate || 0) !== engagementRate;
    if (!changed) {
      base.unchanged++;
      continue;
    }
    const { error: updErr } = await supabase
      .from("analytics_daily")
      .update({
        reach,
        likes,
        comments,
        shares,
        saves,
        views,
        engagement_rate: engagementRate,
      })
      .eq("id", prev.id);
    if (updErr) throw new Error(`analytics_daily update: ${updErr.message}`);
    base.updated++;
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("analytics_daily").insert(toInsert);
    if (insErr) throw new Error(`analytics_daily insert: ${insErr.message}`);
  }

  return base;
}
