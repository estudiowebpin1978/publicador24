import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels } from "@/lib/buffer/client";
import { syncInstagramInsights, type MetaSyncResult } from "@/lib/analytics/meta";
import { aggregateDaily } from "@/lib/analytics/daily";

async function bufferGraphQL<T>(query: string): Promise<T> {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER_API_KEY not configured");

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Buffer API error");
  }
  return json.data;
}

interface BufferPostMetric {
  type: string;
  value: number;
}

interface BufferPost {
  id: string;
  status: string;
  sentAt?: string;
  channelId: string;
  metrics?: BufferPostMetric[] | null;
}

async function fetchChannelsWithPosts(organizationId: string): Promise<{
  channels: { id: string; service: string; name: string }[];
  posts: BufferPost[];
}> {
  const channels = await getBufferChannels(organizationId);
  const postsData = await bufferGraphQL<{
    posts: { edges: { node: BufferPost }[] };
  }>(
    `{ posts(first: 100, input: { organizationId: "${organizationId}", filter: { status: [sent] } }) { edges { node { id status sentAt channelId metrics { type value } } } } }`
  );

  return {
    channels: channels.map((ch) => ({ id: ch.id, service: ch.service, name: ch.name })),
    posts: postsData.posts.edges.map((e) => e.node),
  };
}

/**
 * Mapea los metrics de Buffer al esquema de analytics_daily. Buffer expone
 * reactions (no likes), comments, shares, saves, views, reach, impressions,
 * clicks, engagementRate y follows. `metrics` null = post sin metricas aun.
 */
function bufferMetricsToRow(metrics: BufferPostMetric[]): {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  reach: number;
  impressions: number;
  clicks: number;
  followers_gained: number;
  engagement_rate: number;
} {
  const m = new Map(metrics.map((x) => [x.type, x.value]));
  const num = (k: string) => {
    const v = m.get(k);
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  const likes = num("reactions");
  const comments = num("comments");
  const shares = num("shares");
  const saves = num("saves");
  const reach = num("reach");
  const rateFromBuffer = num("engagementRate");
  const engagementRate =
    rateFromBuffer > 0
      ? rateFromBuffer
      : reach > 0
        ? Math.round(((likes + comments + shares + saves) / reach) * 10000) / 100
        : 0;
  return {
    likes,
    comments,
    shares,
    saves,
    views: num("views"),
    reach,
    impressions: num("impressions"),
    clicks: num("clicks"),
    followers_gained: num("follows"),
    engagement_rate: engagementRate,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = Math.min(Math.max(daysParam, 1), 90);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    // 1) Meta Insights: fuente principal de engagement real. Instagram es la
    //    plataforma que mas publica y el Graph API responde con metricas por
    //    post sin depender de Buffer.
    let meta: MetaSyncResult | null = null;
    let metaError: string | null = null;
    try {
      meta = await syncInstagramInsights(days);
    } catch (e) {
      metaError = e instanceof Error ? e.message : "error desconocido";
    }

    // campaign_id NOT NULL: la primera activa por antigüedad (mismo criterio
    // que el sync de Meta) para que las filas de Buffer tampoco fallen en la
    // FK (antes usaban un placeholder 0000... que ya no existe y los inserts
    // fallaban en silencio igual que los updates).
    let campaignId: string | null = meta?.campaignId ?? null;
    if (!campaignId) {
      const { data: camps } = await supabase
        .from("campaigns")
        .select("id")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: true })
        .limit(1);
      campaignId = camps?.[0]?.id ?? null;
    }

    // 2) Buffer: metricas REALES por post (el campo `metrics` de Buffer, no el
    //    `counts` que ya no existe en su API). Instagram se omite a proposito:
    //    Meta ya cubre esa plataforma con los datos oficiales del Graph API y
    //    duplicaria la misma publicacion con timestamps distintos.
    let bufferInserted = 0;
    let bufferUpdated = 0;
    let bufferSkipped = 0;
    let channelsProcessed = 0;
    let bufferError: string | null = null;
    try {
      const accountRes = await getBufferAccount();
      const orgId = accountRes.account.organizations[0]?.id;
      if (!orgId) throw new Error("No se encontró organización de Buffer");

      const { channels, posts } = await fetchChannelsWithPosts(orgId);
      channelsProcessed = channels.length;
      const serviceByChannel = new Map(channels.map((ch) => [ch.id, ch.service]));

      const recent = posts.filter((p) => p.sentAt && new Date(p.sentAt).getTime() >= since);
      if (recent.length > 0) {
        if (!campaignId) {
          throw new Error("Sin campaña activa para asociar las métricas de Buffer");
        }

        // Filas existentes de Buffer en la ventana (una sola consulta).
        const existingRes = await supabase
          .from("analytics_daily")
          .select("id, date, platform, reach, likes, comments, shares, saves, views, impressions, clicks, engagement_rate")
          .gte("date", since)
          .in("platform", [...new Set(recent.map((p) => serviceByChannel.get(p.channelId) || "unknown"))]);
        if (existingRes.error) throw new Error(`analytics_daily: ${existingRes.error.message}`);
        const existingByKey = new Map<string, (typeof existingRes.data)[number]>();
        for (const row of existingRes.data || []) {
          existingByKey.set(`${row.platform}|${row.date}`, row);
        }

        const toInsert: Record<string, unknown>[] = [];
        for (const post of recent) {
          const platform = serviceByChannel.get(post.channelId) || "unknown";
          // Instagram: Meta Insights es la fuente oficial (evita duplicados).
          if (platform === "instagram") {
            bufferSkipped++;
            continue;
          }
          if (!post.metrics) {
            bufferSkipped++;
            continue;
          }
          const ts = new Date(post.sentAt as string).getTime();
          const metrics = bufferMetricsToRow(post.metrics);
          const prev = existingByKey.get(`${platform}|${ts}`);

          if (!prev) {
            toInsert.push({
              campaign_id: campaignId,
              platform,
              date: ts,
              ...metrics,
              watch_time: 0,
              created_at: Date.now(),
            });
            bufferInserted++;
            continue;
          }
          const changed =
            (prev.reach || 0) !== metrics.reach ||
            (prev.likes || 0) !== metrics.likes ||
            (prev.comments || 0) !== metrics.comments ||
            (prev.shares || 0) !== metrics.shares ||
            (prev.saves || 0) !== metrics.saves ||
            (prev.views || 0) !== metrics.views ||
            (prev.impressions || 0) !== metrics.impressions ||
            (prev.clicks || 0) !== metrics.clicks ||
            (prev.engagement_rate || 0) !== metrics.engagement_rate;
          if (!changed) continue;
          const { error: updErr } = await supabase
            .from("analytics_daily")
            .update(metrics)
            .eq("id", prev.id);
          if (updErr) throw new Error(`analytics_daily update: ${updErr.message}`);
          bufferUpdated++;
        }

        if (toInsert.length > 0) {
          const { error: insErr } = await supabase.from("analytics_daily").insert(toInsert);
          if (insErr) throw new Error(`analytics_daily insert: ${insErr.message}`);
        }
      }
    } catch (e) {
      bufferError = e instanceof Error ? e.message : "error desconocido";
    }

    // 3) Nada sincronizado: mismo contrato que antes (rate limit -> 200
    //    degradado para que el dashboard siga mostrando datos previos).
    const bufferSyncedAny = bufferInserted > 0 || bufferUpdated > 0;
    if (!meta && !bufferSyncedAny) {
      const combined = `${metaError || ""} ${bufferError || ""}`;
      const isRate = /rate limited|too many requests|\b429\b/i.test(combined);
      return NextResponse.json(
        {
          error: metaError && bufferError ? `${metaError} / ${bufferError}` : metaError || bufferError,
          metaError,
          degraded: isRate,
          synced: 0,
          summary: null,
        },
        { status: isRate ? 200 : 500 }
      );
    }

    const { data: recent, error: recentErr } = await supabase
      .from("analytics_daily")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: true });

    const isMissingTable = recentErr?.message?.includes("does not exist") || recentErr?.message?.includes("relation");
    const rows = isMissingTable ? [] : recent || [];

    const daily = aggregateDaily(rows);

    const summary = {
      totalImpressions: daily.reduce((s, d) => s + d.impressions, 0),
      totalReach: daily.reduce((s, d) => s + d.reach, 0),
      totalLikes: daily.reduce((s, d) => s + d.likes, 0),
      totalComments: daily.reduce((s, d) => s + d.comments, 0),
      totalShares: daily.reduce((s, d) => s + d.shares, 0),
      totalClicks: daily.reduce((s, d) => s + d.clicks, 0),
      totalViews: daily.reduce((s, d) => s + d.views, 0),
      totalEngagement: daily.reduce((s, d) => s + d.engagement, 0),
    };

    return NextResponse.json({
      synced: (meta?.inserted ?? 0) + bufferInserted,
      updated: (meta?.updated ?? 0) + bufferUpdated,
      channelsProcessed,
      meta, // desglose del sync de Meta (posts/inserted/updated/...)
      metaError, // motivo si Meta no pudo sincronizar
      buffer: {
        inserted: bufferInserted,
        updated: bufferUpdated,
        skipped: bufferSkipped, // instagram (Meta ya la cubre) o sin metricas
        error: bufferError,
      },
      summary,
      daily,
      count: daily.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Un rate limit de Buffer no es un error del servidor: responde 200 para
    // que el dashboard pueda seguir mostrando los datos que ya tenia.
    const isRate = /rate limited|too many requests|\b429\b/i.test(msg);
    return NextResponse.json(
      { error: msg, degraded: isRate, synced: 0, summary: null },
      { status: isRate ? 200 : 500 }
    );
  }
}
