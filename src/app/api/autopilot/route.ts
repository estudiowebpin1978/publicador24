import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, type BufferChannel } from "@/lib/buffer/client";
import { getSmartSchedule, getOptimalTimeSlots } from "@/lib/smart-scheduler";
import { repurposeToReels, repurposeToCarousel, repurposeToStory, repurposeToThread } from "@/lib/ai/repurpose";
import { notifyPostPublished } from "@/lib/whatsapp";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  imagesGenerated: number;
  errors: string[];
  details: string[];
  posts: { platform: string; id: string; status: string; scheduledAt?: string }[];
  abVariants?: { platform: string; variant: string; hook: string }[];
  repurposed?: { platform: string; formats: string[] }[];
}

const TIME_SLOTS_UTC: number[] = [
  15, 16, 17, 20, 21, 23, 0, 1,
];

const PLATFORM_DAYS: Record<string, number[]> = {
  tiktok: [2, 3, 4, 5],
  instagram: [2, 3, 4, 5],
  facebook: [2, 3, 4, 5],
};

const PLATFORM_PROMPTS: Record<string, string> = {
  tiktok: `Generá un post para TikTok sobre lotería/quinela.
ESTILO: Entretenimiento, hooks rápidos, humor, tendencias, audios virales.
INCLUYE: Emojis, llamado a la acción directo, gancho en primera línea.
Tono: Joven, informal, argentino.
Máximo 150 caracteres para el hook.`,
  instagram: `Generá un post para Instagram sobre lotería/quinela.
ESTILO: Prueba social, Reels, carruseles educativos, capturas de ganadores.
INCLUYE: Paso a paso, sorteos inminentes, comprobantes de pago.
Tono: Profesional pero cercano, argentino.
Formato: Carrusel o Reel.`,
  facebook: `Generá un post para Facebook sobre lotería/quinela.
ESTILO: Comunidad, información oficial, extractos, pozos acumulados.
INCLUYE: Enlaces directos, recordatorios, datos concretos.
Tono: Informativo, adulto +35, argentino.
Formato: Texto largo con enlace.`,
};

const IMAGE_STYLES: Record<string, string[]> = {
  tiktok: [
    "vibrant neon lottery balls floating, dynamic energy, dark background, electric blue and magenta",
    "excited crowd celebrating lottery win, confetti, vibrant colors, party atmosphere",
    "futuristic slot machine with glowing numbers, cyberpunk style, neon purple and cyan",
  ],
  instagram: [
    "elegant lottery ticket with gold accents, luxury feel, dark background, premium design",
    "mobile phone showing lottery app, modern UI, clean design, violet gradient",
    "winner celebration with champagne, confetti, luxury lifestyle, gold and purple",
  ],
  facebook: [
    "official lottery results board, clean typography, professional design, blue and white",
    "community of lottery players, friendly atmosphere, warm colors, trust feeling",
    "lottery jackpot counter showing big numbers, attention grabbing, red and gold",
  ],
};

const TRENDING_SOUNDS: Record<string, string[]> = {
  tiktok: [
    "Sonido trending: original sound - quiniela_ia",
    "Musica viral: busca loteria winner en sonidos",
    "Audio popular: dinero facile trending",
    "Sonido en tendencia: ganar es facil",
    "Usa: success music para mas alcance",
  ],
  instagram: [
    "Sound trending: Reels Music 2026 para mas alcance",
    "Audio viral: Upbeat Background popular ahora",
    "Musica en tendencia: Celebration Sound",
    "Usa: Motivational Beat en tu Reel",
    "Sonido popular: Lucky Vibes",
  ],
};

const REPURPOSE_FORMATS: Record<string, string[]> = {
  tiktok: ["reels", "story"],
  instagram: ["carousel", "reels", "story"],
  facebook: ["thread"],
};

const TRENDING_TOPICS_PROMPT = `Buscá temas trending en redes sociales relacionados con lotería, quiniela, apuestas, sorteos, dinero fácil,_finanzas personales. Devolvé 3-5 hashtags trending en formato JSON:
{
  "topics": ["#trend1", "#trend2", "#trend3"]
}`;

const LANGUAGE_VARIANTS: Record<string, string> = {
  es: "Español rioplatense argentino",
  en: "English",
  pt: "Português brasileiro",
};

function randomDelay(minMs = 45000, maxMs = 180000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function pickTimeSlot(platform: string): Promise<Date> {
  const now = new Date();
  const day = now.getUTCDay();
  const days = PLATFORM_DAYS[platform] || [2, 3, 4, 5];

  let dayOffset = 0;
  while (!days.includes((day + dayOffset) % 7)) {
    dayOffset++;
    if (dayOffset > 7) break;
  }

  let slot: number;
  try {
    const smart = await getSmartSchedule(platform);
    slot = smart.hour;
    console.log(`Smart schedule for ${platform}: ${smart.reason}`);
  } catch {
    slot = TIME_SLOTS_UTC[Math.floor(Math.random() * TIME_SLOTS_UTC.length)];
  }

  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + dayOffset);
  target.setUTCHours(slot, Math.floor(Math.random() * 30), 0, 0);

  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}

async function generatePlatformImage(platform: string): Promise<string> {
  const styles = IMAGE_STYLES[platform] || IMAGE_STYLES.instagram;
  const style = styles[Math.floor(Math.random() * styles.length)];
  const prompt = `Social media post for lottery, ${style}, professional marketing, high quality, no text`;

  try {
    const image = await generateImageWithFallback(prompt, "1:1");
    return image.url;
  } catch {
    const fallback = [
      "quiniela-matematica.png",
      "quiniela-patron.png",
      "quiniela-metodo.png",
      "quiniela-factores.png",
      "quiniela-datos.png",
    ];
    return `https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/${fallback[Math.floor(Math.random() * fallback.length)]}`;
  }
}

async function generateABVariants(platform: string, campaignName: string, targetAudience: string): Promise<{ variantA: { hook: string; body: string; cta: string; hashtags: string[] }; variantB: { hook: string; body: string; cta: string; hashtags: string[] } }> {
  const systemPrompt = `Sos un experto en marketing para ${platform}. Español rioplatense. Respondé SOLO con el JSON, sin texto adicional.`;

  const prompt = `Generá DOS variantes (A y B) para un post sobre lotería/quinela.
Campaña: ${campaignName}
Público: ${targetAudience}
Plataforma: ${platform}

La variante A debe ser más emocional/directa.
La variante B debe ser más educativa/informativa.

Generá EXACTAMENTE en este formato JSON:
{
  "variantA": {
    "hook": "Frase gancho variante A",
    "body": "Cuerpo del post variante A",
    "cta": "CTA variante A con URL quiniela-ia-two.vercel.app",
    "hashtags": ["tag1", "tag2", "tag3"]
  },
  "variantB": {
    "hook": "Frase gancho variante B",
    "body": "Cuerpo del post variante B",
    "cta": "CTA variante B con URL quiniela-ia-two.vercel.app",
    "hashtags": ["tag1", "tag2", "tag3"]
  }
}`;

  try {
    const response = await generateTextWithFallback(prompt, systemPrompt);
    const match = response.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.variantA && parsed.variantB) return parsed;
    }
  } catch {}

  const fallbackResponse = await generateTextWithFallback(
    `${PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram}
Campaña: ${campaignName}
Público: ${targetAudience}

Generá EXACTAMENTE en este formato JSON:
{
  "hook": "Frase gancho (máximo 10 palabras)",
  "body": "Cuerpo del post adaptado para ${platform}",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
    systemPrompt
  );

  let content;
  try {
    const jsonMatch = fallbackResponse.text.match(/\{[\s\S]*\}/);
    content = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    content = null;
  }

  const single = content || { hook: "", body: "", cta: "", hashtags: [] };
  return {
    variantA: single,
    variantB: { ...single, hook: single.hook + " (variante B)" },
  };
}

async function fetchTrendingTopics(): Promise<string[]> {
  try {
    const result = await generateTextWithFallback(
      TRENDING_TOPICS_PROMPT,
      "Sos un analista de tendencias en redes sociales. Español argentino. Respondé SOLO con el JSON."
    );
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.topics || [];
    }
  } catch {}
  return [];
}

async function generateVideoContent(platform: string, campaignName: string, targetAudience: string): Promise<{ hook: string; body: string; cta: string; hashtags: string[]; isVideo: boolean }> {
  const prompt = `Generá contenido optimizado para VIDEO (Reels/TikTok/Short) sobre lotería/quinela.
Campaña: ${campaignName}
Público: ${targetAudience}
Plataforma: ${platform}

ESTILO: Hooks visuales, movimiento, transiciones rápidas.

Generá EXACTAMENTE en este formato JSON:
{
  "hook": "Hook visual para video (máximo 5 segundos)",
  "body": "Descripción del contenido visual del video con transiciones",
  "cta": "CTA con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3"],
  "isVideo": true
}`;

  const result = await generateTextWithFallback(
    prompt,
    `Sos un experto en video content para ${platform}. Español rioplatense. Respondé SOLO con el JSON.`
  );

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    return match ? { ...JSON.parse(match[0]), isVideo: true } : { hook: "", body: "", cta: "", hashtags: [], isVideo: false };
  } catch {
    return { hook: "", body: "", cta: "", hashtags: [], isVideo: false };
  }
}

async function storeAnalytics(supabase: ReturnType<typeof getSupabaseAdmin>, postId: string, platform: string, campaignId: string) {
  await supabase.from("analytics_daily").insert({
    campaign_id: campaignId,
    platform,
    date: Date.now(),
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0,
    views: 0,
    engagement_rate: 0,
    created_at: Date.now(),
  });
}

async function repurposeContent(supabase: ReturnType<typeof getSupabaseAdmin>, contentPieceId: string, campaignId: string, platform: string, content: { hook: string; body: string }) {
  const formats = REPURPOSE_FORMATS[platform] || [];
  if (formats.length === 0) return;

  const results: Record<string, unknown> = {};

  for (const format of formats) {
    try {
      switch (format) {
        case "reels":
          results.reels = await repurposeToReels(content);
          break;
        case "carousel":
          results.carousel = await repurposeToCarousel(content);
          break;
        case "story":
          results.story = await repurposeToStory(content);
          break;
        case "thread":
          results.thread = await repurposeToThread(content);
          break;
      }
    } catch (e) {
      results[format] = { error: e instanceof Error ? e.message : "Failed" };
    }
  }

  await supabase.from("repurposed_content").insert({
    content_piece_id: contentPieceId,
    campaign_id: campaignId,
    formats,
    result: results,
    created_at: Date.now(),
  });
}

export async function POST(request?: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const result: LoopResult = {
      timestamp: Date.now(),
      contentGenerated: 0,
      contentPublished: 0,
      imagesGenerated: 0,
      errors: [],
      details: [],
      posts: [],
      abVariants: [],
      repurposed: [],
    };

    let targetLanguage = "es";
    if (request) {
      try {
        const body = await request.json();
        targetLanguage = body.language || "es";
      } catch {}
    }

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .limit(3);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No hay campañas activas"] });
    }

    let channels: BufferChannel[] = [];
    let orgId = "";
    try {
      const account = await getBufferAccount();
      orgId = account.account.organizations[0]?.id || "";
      if (orgId) {
        channels = await getBufferChannels(orgId);
      }
    } catch (e) {
      result.errors.push(`Buffer: ${e instanceof Error ? e.message : "error"}`);
    }

    if (channels.length === 0) {
      return NextResponse.json({ ...result, errors: [...result.errors, "No hay canales de Buffer conectados"] });
    }

    const trendingTopics = await fetchTrendingTopics();
    if (trendingTopics.length > 0) {
      result.details.push(`Trending topics: ${trendingTopics.join(", ")}`);
    }

    for (const campaign of campaigns) {
      for (const channel of channels) {
        const platform = channel.service;
        const languageName = LANGUAGE_VARIANTS[targetLanguage] || LANGUAGE_VARIANTS.es;
        const trendingText = trendingTopics.length > 0 ? `\nTendencias actuales: ${trendingTopics.join(", ")}` : "";
        const languageText = targetLanguage !== "es" ? `\nIdioma: ${languageName}` : "";

        const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

        const prompt = `${platformPrompt}
Campaña: ${campaign.name}
Nichos: ${campaign.industry || "lotería/quinela"}
Público: ${campaign.target_audience || "argentino general"}${languageText}${trendingText}

Generá EXACTAMENTE en este formato JSON:
{
  "hook": "Frase gancho para ${platform} (máximo 10 palabras)",
  "body": "Cuerpo del post adaptado para ${platform} en ${languageName}",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

        try {
          const response = await generateTextWithFallback(
            prompt,
            `Sos un experto en marketing para ${platform}. ${languageName}. Respondé SOLO con el JSON, sin texto adicional.`
          );

          let content;
          try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            content = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          } catch {
            content = null;
          }

          if (!content || !content.hook) {
            result.errors.push(`IA no generó contenido para ${platform}: ${campaign.name}`);
            continue;
          }

          result.contentGenerated++;
          result.details.push(`[${platform}] Contenido: ${content.hook}`);

          const useVideo = Math.random() > 0.6;
          let mediaUrl: string;
          let finalContent = content;

          if (useVideo) {
            try {
              const videoContent = await generateVideoContent(platform, campaign.name, campaign.target_audience || "argentino general");
              if (videoContent.hook) {
                finalContent = videoContent;
                const videoImage = await generatePlatformImage(platform);
                mediaUrl = videoImage;
                result.details.push(`[${platform}] Video content generado`);
              } else {
                mediaUrl = await generatePlatformImage(platform);
              }
            } catch {
              mediaUrl = await generatePlatformImage(platform);
            }
          } else {
            mediaUrl = await generatePlatformImage(platform);
          }
          result.imagesGenerated++;

          const scheduledTime = await pickTimeSlot(platform);
          const scheduledAt = Math.floor(scheduledTime.getTime() / 1000).toString();

          const sounds = TRENDING_SOUNDS[platform];
          const soundSuggestion = sounds ? sounds[Math.floor(Math.random() * sounds.length)] : "";
          const trendingText2 = trendingTopics.length > 0 ? `\n\n🔥 ${trendingTopics.slice(0, 3).join(" ")}` : "";
          const text = `${finalContent.hook}\n\n${finalContent.body}\n\n${finalContent.cta}\n\n${(finalContent.hashtags || []).join(" ")}${soundSuggestion ? "\n\n\uD83C\uDFB5 " + soundSuggestion : ""}${trendingText2}`;

          let metadata = {};
          let schedulingType: "automatic" | "notification" = "automatic";
          if (platform === "instagram") {
            metadata = { instagram: { type: "post", shouldShareToFeed: true } };
          } else if (platform === "facebook") {
            metadata = { facebook: { type: "post" } };
            schedulingType = "notification";
          }

          if (result.contentPublished > 0) {
            const delayMs = Math.floor(Math.random() * 135000) + 45000;
            result.details.push(`Esperando ${Math.round(delayMs / 1000)}s anti-bot...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          const post = await createBufferPost({
            channelId: channel.id,
            text,
            schedulingType,
            mode: "addToQueue",
            metadata,
            assets: [{ image: { url: mediaUrl } }],
          });

          result.contentPublished++;
          result.posts.push({
            platform,
            id: post.id,
            status: post.status,
            scheduledAt: scheduledTime.toISOString(),
          });
          result.details.push(
            `[${platform}] Publicado: ${post.id} | Programado: ${scheduledTime.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`
          );

          const { data: cp } = await supabase.from("content_pieces").insert({
            campaign_id: campaign.id,
            title: finalContent.hook,
            body: finalContent.body,
            cta: finalContent.cta,
            hashtags: finalContent.hashtags || [],
            status: "PUBLISHED",
            platform,
            media_urls: [mediaUrl],
            external_post_id: post.id,
            published_at: Date.now(),
          }).select("id").single();

          if (cp) {
            await supabase.from("scheduled_posts").insert({
              campaign_id: campaign.id,
              content_piece_id: cp.id,
              platform,
              channel_id: channel.id,
              status: "pending",
              scheduled_at: Math.floor(scheduledTime.getTime() / 1000),
              external_post_id: post.id,
            });

            await storeAnalytics(supabase, post.id, platform, campaign.id);

            try {
              await repurposeContent(supabase, cp.id, campaign.id, platform, { hook: finalContent.hook, body: finalContent.body });
              result.repurposed?.push({ platform, formats: REPURPOSE_FORMATS[platform] || [] });
            } catch (e) {
              result.details.push(`[${platform}] Repurpose error: ${e instanceof Error ? e.message : "unknown"}`);
            }
          }

          try {
            await notifyPostPublished({
              platform,
              content: finalContent.hook,
              scheduledAt: scheduledTime.toISOString(),
            });
          } catch {}

          if (Math.random() > 0.5) {
            try {
              const variants = await generateABVariants(platform, campaign.name, campaign.target_audience || "argentino general");
              result.abVariants?.push(
                { platform, variant: "A", hook: variants.variantA.hook },
                { platform, variant: "B", hook: variants.variantB.hook }
              );
              result.details.push(`[${platform}] A/B test: "${variants.variantA.hook}" vs "${variants.variantB.hook}"`);
            } catch {}
          }
        } catch (e) {
          result.errors.push(`[${platform}] ${e instanceof Error ? e.message : "error"}`);
        }
      }
    }

    await supabase.from("notifications").insert({
      type: result.errors.length > 0 ? "warning" : "success",
      title: "Autopilot ejecutado",
      message: `Generados: ${result.contentGenerated} | Imágenes: ${result.imagesGenerated} | Publicados: ${result.contentPublished} | Errores: ${result.errors.length} | A/B: ${result.abVariants?.length || 0} | Repurposed: ${result.repurposed?.length || 0}`,
      read: false,
      created_at: Date.now(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: posts } = await supabase
      .from("scheduled_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ recentPosts: posts || [] });
  } catch {
    return NextResponse.json({ recentPosts: [] });
  }
}
