import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface TrendingTopic {
  title: string;
  source: string;
  volume: string;
  category: string;
  url?: string;
}

export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  const googleTrendsPromise = fetchGoogleTrends().catch(() => []);
  const tiktokTrendsPromise = fetchTikTokTrends().catch(() => []);
  const instagramTrendsPromise = fetchInstagramTrends().catch(() => []);

  const [googleTrends, tiktokTrends, instagramTrends] = await Promise.all([
    googleTrendsPromise,
    tiktokTrendsPromise,
    instagramTrendsPromise,
  ]);

  topics.push(...googleTrends, ...tiktokTrends, ...instagramTrends);

  if (topics.length === 0) {
    const fallbackTopics = await generateFallbackTrends();
    topics.push(...fallbackTopics);
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("trends_cache").insert({
    topics: JSON.stringify(topics),
    fetched_at: Date.now(),
  });

  return topics;
}

async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    const res = await fetch("https://trends.google.com/trending?geo=AR&hours=24", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return topics;

    const html = await res.text();
    const trendMatches = html.matchAll(
      /<a[^>]*class="[^"]*mjjYud[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
    );

    for (const match of trendMatches) {
      const title = match[1]?.trim();
      if (title && title.length > 2 && title.length < 100) {
        topics.push({
          title,
          source: "google_trends",
          volume: "N/A",
          category: "general",
        });
      }
      if (topics.length >= 10) break;
    }
  } catch {
    // Silent fallback
  }

  return topics;
}

async function fetchTikTokTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    const res = await fetch("https://www.tiktok.com/discover", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return topics;

    const html = await res.text();
    const hashtagMatches = html.matchAll(/#[a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]*/g);

    const seen = new Set<string>();
    for (const match of hashtagMatches) {
      const tag = match[0];
      if (!seen.has(tag) && tag.length > 2) {
        seen.add(tag);
        topics.push({
          title: tag,
          source: "tiktok",
          volume: "N/A",
          category: "social",
        });
      }
      if (topics.length >= 10) break;
    }
  } catch {
    // Silent fallback
  }

  return topics;
}

async function fetchInstagramTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    const res = await fetch("https://www.instagram.com/explore/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) return topics;

    const html = await res.text();
    const tagMatches = html.matchAll(/"tag_name":"([^"]+)"/g);

    const seen = new Set<string>();
    for (const match of tagMatches) {
      const tag = match[1];
      if (!seen.has(tag) && tag.length > 2) {
        seen.add(tag);
        topics.push({
          title: `#${tag}`,
          source: "instagram",
          volume: "N/A",
          category: "social",
        });
      }
      if (topics.length >= 10) break;
    }
  } catch {
    // Silent fallback
  }

  return topics;
}

async function generateFallbackTrends(): Promise<TrendingTopic[]> {
  const systemPrompt = `Sos un analista de tendencias en redes sociales para Argentina. Respondé SIEMPRE con JSON válido, sin texto adicional.`;

  const prompt = `Generá 5 tendencias actuales en Argentina que sean relevantes para marketing en redes sociales en 2026.

Para cada tendencia incluí:
- título (tema específico)
- categoría (entretenimiento, tecnología, deportes, política, lifestyle, gastronomía, etc.)
- fuente (dónde está trending)

Respondé con JSON:
{
  "trends": [
    { "title": "...", "category": "...", "source": "..." }
  ]
}`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    const parsed = JSON.parse(jsonStr.trim());

    return (parsed.trends || []).map((t: { title: string; category: string; source: string }) => ({
      title: t.title || "",
      source: t.source || "ai_generated",
      volume: "N/A",
      category: t.category || "general",
    }));
  } catch {
    return [];
  }
}

export async function generateContentFromTrend(
  topic: TrendingTopic,
  platform: string
): Promise<{ hook: string; body: string; cta: string }> {
  const systemPrompt = `Sos un experto en copywriting para redes sociales en español argentino (voseo). Creá contenido viral conectando tendencias con marca personal. Respondé SIEMPRE con JSON válido, sin texto adicional.`;

  const prompt = `Generá contenido para ${platform} aprovechando esta tendencia:

TENDENCIA: ${topic.title}
FUENTE: ${topic.source}
CATEGORÍA: ${topic.category}

Creá un post que:
1. Conecte la tendencia con un tema de negocio/emprendimiento
2. Sea relevante y oportuno
3. Genere engagement
4. Incluya un CTA que lleve a acción

Respondé con JSON:
{
  "hook": "Primera línea que engancha",
  "body": "Cuerpo del post (2-3 párrafos cortos)",
  "cta": "Call to action"
}`;

  const result = await generateTextWithFallback(prompt, systemPrompt);

  try {
    const match = result.text.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : result.text;
    return JSON.parse(jsonStr.trim());
  } catch {
    return {
      hook: result.text.substring(0, 100),
      body: result.text,
      cta: "Link en bio",
    };
  }
}
