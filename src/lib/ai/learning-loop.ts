import { ConvexHttpClient } from "convex/browser";
import type { Id } from "@convex/_generated/dataModel";
import { getAIProvider } from "./provider";
import { wrapProviderWithCostTracking } from "./cost-tracker";
import { getSmartSchedule } from "@/lib/smart-scheduler";

// Lazy: el cliente solo se crea al primer uso, así importar este módulo nunca
// rompe aunque falte NEXT_PUBLIC_CONVEX_URL.
let convexClient: ConvexHttpClient | null = null;
function convex(): ConvexHttpClient {
  if (!convexClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL no configurada");
    convexClient = new ConvexHttpClient(url);
  }
  return convexClient;
}

interface PostMetrics {
  postId: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagementRate: number;
}

interface LearningInsight {
  type: "topic" | "hook" | "format" | "time" | "platform";
  insight: string;
  confidence: number;
  action: string;
}

interface LearningResult {
  metricsCollected: number;
  scoresUpdated: number;
  insightsGenerated: number;
  strategyAdjustments: string[];
}

async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER NOT CONFIGURED");

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "Buffer error");
  return data.data;
}

async function getBufferPosts(channelId: string): Promise<Array<{
  id: string;
  text: string;
  status: string;
  createdAt: string;
  counts: { likes: number; comments: number; shares: number; Reach: number; impressions: number };
}>> {
  try {
    const data = await callBuffer(
      `{ posts(input: { channelIds: ["${channelId}"], profiles: [] }) { edges { node { id text status createdAt counts { likes comments shares Reach impressions } } } } }`
    );
    return data.posts?.edges?.map((e: { node: unknown }) => e.node) || [];
  } catch {
    return [];
  }
}

function calculateEngagementScore(post: PostMetrics): number {
  const engagement = post.likes + post.comments * 2 + post.shares * 3;
  const rate = post.impressions > 0 ? (engagement / post.impressions) * 100 : 0;
  return Math.min(100, Math.round(rate * 10 + (post.reach > 100 ? 10 : 0)));
}

export async function collectMetrics(): Promise<LearningResult> {
  const result: LearningResult = {
    metricsCollected: 0,
    scoresUpdated: 0,
    insightsGenerated: 0,
    strategyAdjustments: [],
  };

  try {
    const { api } = await import("@convex/_generated/api");

    // Get all published posts
    const publishedPosts = await convex().query(api.publishedPosts.list, {});
    if (!publishedPosts || publishedPosts.length === 0) return result;

    // Get Buffer channels
    const accountData = await callBuffer(`{ account { id organizations { id } } }`);
    const orgId = accountData.account.organizations[0]?.id;
    if (!orgId) return result;

    const channelsData = await callBuffer(
      `{ channels(input: { organizationId: "${orgId}" }) { id service } }`
    );
    const channels = channelsData.channels || [];

    // Collect metrics for each post
    for (const post of publishedPosts) {
      if (!post.platformPostId) continue;

      const channel = channels.find((c: { service: string }) => c.service === post.platform);
      if (!channel) continue;

      try {
        const posts = await getBufferPosts(channel.id);
        const bufferPost = posts.find((p) => p.id === post.platformPostId);

        if (bufferPost && bufferPost.counts) {
          const metrics: PostMetrics = {
            postId: post.platformPostId,
            platform: post.platform,
            likes: bufferPost.counts.likes || 0,
            comments: bufferPost.counts.comments || 0,
            shares: bufferPost.counts.shares || 0,
            impressions: bufferPost.counts.impressions || 0,
            reach: bufferPost.counts.Reach || 0,
            engagementRate: 0,
          };

          metrics.engagementRate = metrics.impressions > 0
            ? ((metrics.likes + metrics.comments + metrics.shares) / metrics.impressions) * 100
            : 0;

          // Save analytics
          try {
            await convex().mutation(api.analytics.createPostAnalytics, {
              publishedPostId: post._id,
              platform: post.platform,
              metrics,
            });
            result.metricsCollected++;
          } catch {
            // Best effort
          }
        }
      } catch {
        // Best effort per post
      }
    }

    return result;
  } catch (error) {
    console.warn("Metrics collection failed:", error);
    return result;
  }
}

export async function updateStrategyScores(): Promise<LearningResult> {
  const result: LearningResult = {
    metricsCollected: 0,
    scoresUpdated: 0,
    insightsGenerated: 0,
    strategyAdjustments: [],
  };

  try {
    const { api } = await import("@convex/_generated/api");

    // Get all strategy memory entries
    const memories = await convex().query(api.strategyMemory.list, {});
    if (!memories || memories.length === 0) return result;

    // Get all analytics
    const allAnalytics = await convex().query(api.analytics.getSummary, {
      startDate: "2020-01-01",
      endDate: new Date().toISOString().split("T")[0],
    });

    // Update scores based on real metrics
    for (const memory of memories) {
      try {
        // El esquema guarda publishedPostId como string; el validator de la
        // query exige Id<"publishedPosts">. Los ids de Convex son strings
        // opacos, así que validamos que venga y lo pasamos como Id.
        const rawPostId = memory.publishedPostId;
        if (!rawPostId) continue;
        const postAnalytics = await convex().query(api.analytics.getPostAnalytics, {
          postId: rawPostId as Id<"publishedPosts">,
        });

        if (postAnalytics && postAnalytics.length > 0) {
          const latest = postAnalytics[postAnalytics.length - 1];
          const metrics = latest.metrics as PostMetrics;

          if (metrics) {
            const newScore = calculateEngagementScore(metrics);

            // Update strategy memory with real score
            await convex().mutation(api.strategyMemory.updateScore, {
              id: memory._id,
              score: newScore,
              impressions: metrics.impressions,
              engagement: metrics.likes + metrics.comments + metrics.shares,
            });

            result.scoresUpdated++;

            if (newScore > 70) {
              result.strategyAdjustments.push(
                `HIGH PERFORMER: "${memory.hook.substring(0, 40)}..." (score: ${newScore})`
              );
            } else if (newScore < 20) {
              result.strategyAdjustments.push(
                `LOW PERFORMER: "${memory.hook.substring(0, 40)}..." (score: ${newScore})`
              );
            }
          }
        }
      } catch {
        // Best effort
      }
    }

    return result;
  } catch (error) {
    console.warn("Score update failed:", error);
    return result;
  }
}

export async function generateInsights(campaignId: Id<"campaigns">): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];

  try {
    const { api } = await import("@convex/_generated/api");
    const ai = wrapProviderWithCostTracking(getAIProvider(), "openrouter");

    // Get strategy memory for this campaign
    const memories = await convex().query(api.strategyMemory.getByCampaign, { campaignId });
    if (!memories || memories.length < 3) return insights;

    // Get analytics summary
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const analytics = await convex().query(api.analytics.getSummary, {
      startDate: thirtyDaysAgo,
      endDate: today,
    });

    // Build context for AI
    const memoryData = memories.map((m: {
      hook: string;
      contentType: string;
      platform: string;
      score: number;
      impressions?: number;
      engagement?: number;
    }) => ({
      hook: m.hook?.substring(0, 50) || "",
      format: m.contentType || "post",
      platform: m.platform || "instagram",
      score: m.score || 50,
      impressions: m.impressions || 0,
      engagement: m.engagement || 0,
    }));

    const prompt = `Sos un analista de marketing digital. Analizá estos datos de rendimiento de contenido y generá insights accionables.

DATOS DE CONTENIO (últimos 30 días):
${JSON.stringify(memoryData, null, 2)}

RESUMEN DE MÉTRICAS:
- Total posts: ${analytics?.totals?.postsCount || 0}
- Engagement total: ${analytics?.totals?.engagement || 0}
- Impressions totales: ${analytics?.totals?.impressions || 0}
- Engagement rate promedio: ${analytics?.avgEngagementRate?.toFixed(2) || 0}%

Generá 3-5 insights con esta estructura JSON:
[
  {
    "type": "topic|hook|format|time|platform",
    "insight": "Descripción del insight",
    "confidence": 0.0-1.0,
    "action": "Acción concreta a tomar"
  }
]

Enfocáte en:
1. Qué hooks generan más engagement
2. Qué formatos funcionan mejor en cada plataforma
3. Mejor horario para publicar
4. Temas que conectan con la audiencia
5. Errores a evitar

Respondé SOLO con el JSON, sin markdown.`;

    const result = await ai.generateText({
      prompt,
      system_prompt: "Sos un experto en marketing de contenido para redes sociales. Respondé solo con JSON válido.",
      max_tokens: 2000,
    });

    const parsed = JSON.parse(result.text.replace(/```json\s*([\s\S]*?)```/, "$1"));
    if (Array.isArray(parsed)) {
      insights.push(...parsed);
    }

    return insights;
  } catch (error) {
    console.warn("Insight generation failed:", error);
    return insights;
  }
}

/**
 * Fallback con datos reales cuando Convex no tiene publishedPosts (nada los
 * escribe desde la migracion a Supabase: la publicacion real vive ahi y el
 * autopilot puebla analytics_daily con Meta Insights de Instagram). Convex se
 * conserva y tiene prioridad: si alguna vez contiene datos, este fallback no
 * se usa.
 */
async function supabaseLearningFallback(): Promise<{
  collected: number;
  adjustments: string[];
}> {
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdmin();
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from("analytics_daily")
      .select("platform, date, reach, likes, comments, shares, views")
      .gte("date", since);
    if (error || !data || data.length === 0) return { collected: 0, adjustments: [] };

    const byPlatform = new Map<
      string,
      { posts: number; reach: number; engagement: number; views: number }
    >();
    interface RawRow {
      platform: string;
      date: number;
      reach?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      views?: number;
    }
    for (const row of data as RawRow[]) {
      let s = byPlatform.get(row.platform);
      if (!s) {
        s = { posts: 0, reach: 0, engagement: 0, views: 0 };
        byPlatform.set(row.platform, s);
      }
      const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
      s.posts++;
      s.reach += row.reach || 0;
      s.engagement += engagement;
      s.views += row.views || 0;
    }

    const adjustments: string[] = [];
    for (const [platform, s] of byPlatform) {
      // El horario sale del MISMO motor que usa el autopilot para publicar
      // (getSmartSchedule): si el reporte y el scheduler dicen horas
      // distintas, no hay sistema inteligente.
      let scheduleText = "horario sin calcular";
      try {
        const sched = await getSmartSchedule(platform);
        scheduleText = `${sched.hour} UTC (${sched.reason})`;
      } catch {
        // scheduler sin datos: se deja el horario sin calcular
      }
      adjustments.push(
        `[${platform.toUpperCase()}] 30d: ${s.posts} posts, alcance ${s.reach}, engagement ${s.engagement}, vistas ${s.views}; horario ${scheduleText}`
      );
    }
    return { collected: data.length, adjustments };
  } catch {
    return { collected: 0, adjustments: [] };
  }
}

export async function runLearningLoop(campaignId?: Id<"campaigns">): Promise<LearningResult> {
  const result: LearningResult = {
    metricsCollected: 0,
    scoresUpdated: 0,
    insightsGenerated: 0,
    strategyAdjustments: [],
  };

  // Step 1: Collect metrics
  const metricsResult = await collectMetrics();
  result.metricsCollected = metricsResult.metricsCollected;

  // Step 1b: si Convex no tiene publishedPosts, el loop aprende de
  // analytics_daily (metricas reales de Meta Insights pobladas por el
  // autopilot). El path de Convex tiene prioridad si llega a tener datos.
  if (result.metricsCollected === 0) {
    const fb = await supabaseLearningFallback();
    if (fb.collected > 0) {
      result.metricsCollected = fb.collected;
      result.strategyAdjustments.push(...fb.adjustments);
    }
  }

  // Step 2: Update strategy scores
  const scoresResult = await updateStrategyScores();
  result.scoresUpdated = scoresResult.scoresUpdated;
  result.strategyAdjustments.push(...scoresResult.strategyAdjustments);

  // Step 3: Generate insights for specific campaign
  if (campaignId) {
    const insights = await generateInsights(campaignId);
    result.insightsGenerated = insights.length;

    // Apply insights as strategy adjustments
    for (const insight of insights) {
      result.strategyAdjustments.push(
        `[${insight.type.toUpperCase()}] ${insight.insight} → ${insight.action}`
      );
    }
  }

  return result;
}
