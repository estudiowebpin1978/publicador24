import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, searchInstagramAudio, type BufferChannel } from "@/lib/buffer/client";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  imagesGenerated: number;
  errors: string[];
  details: string[];
  posts: { platform: string; id: string; status: string; scheduledAt?: string }[];
}

// ============================================
// POOL DE HORARIOS - ARGENTINA (UTC-3)
// ============================================
// El sistema elige al azar de estos slots
// After 3-4 weeks, the system learns which slots perform best

const TIME_SLOTS_UTC: number[] = [
  15,   // 12:30 ARG
  16,   // 13:30 ARG
  17,   // 14:30 ARG
  20,   // 17:00 ARG
  21,   // 18:00 ARG
  23,   // 20:30 ARG
  0,    // 21:30 ARG
  1,    // 22:30 ARG
];

// Plataformas y sus días activos (Mar-Vie para testing)
const PLATFORM_DAYS: Record<string, number[]> = {
  tiktok: [2, 3, 4, 5],    // Mar-Vie
  instagram: [2, 3, 4, 5], // Mar-Vie
  facebook: [2, 3, 4, 5],  // Mar-Vie
};

// Prompts específicos por plataforma
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

// Estilos de imagen por plataforma
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

// Anti-bot: delay aleatorio entre posts (45s - 3min)
function randomDelay(minMs = 45000, maxMs = 180000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Elegir horario del pool (no fijo)
function pickTimeSlot(platform: string): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const days = PLATFORM_DAYS[platform] || [2, 3, 4, 5];

  // Si hoy no es día activo, buscar próximo día
  let dayOffset = 0;
  while (!days.includes((day + dayOffset) % 7)) {
    dayOffset++;
    if (dayOffset > 7) break;
  }

  // Elegir slot aleatorio del pool
  const slot = TIME_SLOTS_UTC[Math.floor(Math.random() * TIME_SLOTS_UTC.length)];

  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + dayOffset);
  target.setUTCHours(slot, Math.floor(Math.random() * 30), 0, 0);

  // Si el horario ya pasó hoy, mañana
  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target;
}

// Generar imagen única por plataforma
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
    };

    // 1. Get active campaigns
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .limit(3);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No hay campañas activas"] });
    }

    // 2. Get Buffer channels
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

    // 3. Process each campaign
    for (const campaign of campaigns) {
      // 3a. Generate content for each platform
      for (const channel of channels) {
        const platform = channel.service;
        const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

        const prompt = `${platformPrompt}
Campaña: ${campaign.name}
Nicho: ${campaign.industry || "lotería/quinela"}
Público: ${campaign.target_audience || "argentino general"}

Generá EXACTAMENTE en este formato JSON (sin texto adicional):
{
  "hook": "Frase gancho para ${platform} (máximo 10 palabras)",
  "body": "Cuerpo del post adaptado para ${platform} en español rioplatense",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

        try {
          // Generate text content
          const response = await generateTextWithFallback(
            prompt,
            `Sos un experto en marketing para ${platform}. Español rioplatense. Respondé SOLO con el JSON, sin texto adicional.`
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

          // Generate platform-specific image
          const imageUrl = await generatePlatformImage(platform);
          result.imagesGenerated++;
          result.details.push(`[${platform}] Imagen generada`);

          // Pick random time from pool
          const scheduledTime = pickTimeSlot(platform);
          const scheduledAt = Math.floor(scheduledTime.getTime() / 1000).toString();

          // Build text
          const text = `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}`;

          // Platform-specific metadata
          let metadata = {};
          let schedulingType: "automatic" | "notification" = "automatic";
          if (platform === "instagram") {
            metadata = { instagram: { type: "post", shouldShareToFeed: true } };
          } else if (platform === "facebook") {
            metadata = { facebook: { type: "post" } };
            schedulingType = "notification";
          }

          // Anti-bot delay
          if (result.contentPublished > 0) {
            const delayMs = Math.floor(Math.random() * 135000) + 45000; // 45-180s
            result.details.push(`Esperando ${Math.round(delayMs / 1000)}s anti-bot...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // Platform-specific audio configuration
          let instagramAudio: { audioId: string; audioVolume: number; videoVolume: number } | undefined;
          let tiktokAutoMusic = false;

          if (platform === "instagram") {
            try {
              const trendingAudio = await searchInstagramAudio(channel.id, "music");
              if (trendingAudio.length > 0) {
                const audio = trendingAudio[0];
                instagramAudio = {
                  audioId: audio.audio_id,
                  audioVolume: 80,
                  videoVolume: 50,
                };
                result.details.push(`[${platform}] Música: ${audio.title} - ${audio.display_artist || "trending"}`);
              }
            } catch (e) {
              result.details.push(`[${platform}] Audio no disponible, usando imagen estática`);
            }
          } else if (platform === "tiktok") {
            tiktokAutoMusic = true;
            result.details.push(`[${platform}] Música automática activada (TikTok elige trending)`);
          }

          // Create post in Buffer
          const post = await createBufferPost({
            channelId: channel.id,
            text,
            schedulingType,
            mode: "addToQueue",
            metadata,
            assets: [{ image: { url: imageUrl } }],
            instagramAudio,
            tiktokAutoMusic,
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

          // Save to Supabase with engagement tracking fields
          const { data: cp } = await supabase.from("content_pieces").insert({
            campaign_id: campaign.id,
            title: content.hook,
            body: content.body,
            cta: content.cta,
            hashtags: content.hashtags || [],
            status: "PUBLISHED",
            platform,
            media_urls: [imageUrl],
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
          }
        } catch (e) {
          result.errors.push(`[${platform}] ${e instanceof Error ? e.message : "error"}`);
        }
      }
    }

    // 4. Save notification
    await supabase.from("notifications").insert({
      type: result.errors.length > 0 ? "warning" : "success",
      title: "Autopilot ejecutado",
      message: `Generados: ${result.contentGenerated} | Imágenes: ${result.imagesGenerated} | Publicados: ${result.contentPublished} | Errores: ${result.errors.length}`,
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
  } catch (error) {
    return NextResponse.json({ recentPosts: [] });
  }
}
