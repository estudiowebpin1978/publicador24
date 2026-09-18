import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, type BufferChannel } from "@/lib/buffer/client";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  imagesGenerated: number;
  errors: string[];
  details: string[];
  posts: { platform: string; id: string; status: string; scheduledAt?: string }[];
}

const TIME_SLOTS_UTC: number[] = [15, 16, 17, 20, 21, 23, 0, 1];

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
    "Close-up of hands holding a printed lottery ticket with numbers, store counter background, realistic photo, warm lighting, Argentine quiniela ticket",
    "Person holding Argentine peso bills in front of a colorful lottery results board, quiniela locale, realistic photo, vibrant colors",
    "Mobile phone screen showing lottery predictions app with numbers and emojis, dark theme, modern UI, purple and pink accents, realistic mockup",
    "Lottery balls with numbers 0-9 falling into a glass bowl, dramatic lighting, neon purple and magenta glow, cinematic photo",
    "Stack of Argentine peso bills next to a lottery ticket on a wooden table, coffee shop setting, warm tones, realistic photo",
  ],
  instagram: [
    "Elegant lottery ticket with gold foil details on dark background, premium feel, luxury design, close-up macro photo",
    "Smartphone showing quiniela predictions app interface, dark theme with purple gradients, modern UI design, realistic mockup",
    "Person celebrating with lottery ticket in hand, confetti falling, joy expression, party atmosphere, professional photo",
    "Lottery results board with glowing numbers, neon lights, night atmosphere, Argentine quiniela locale, cinematic photo",
    "Flat lay of lottery ticket, Argentine pesos, lucky charm, and phone with predictions app, dark background, professional photo",
  ],
  facebook: [
    "Official lottery results display board with colorful numbers, clean typography, Argentine quiniela results, professional photo",
    "Group of friends checking lottery results on phone, happy expressions, community feel, warm lighting, lifestyle photo",
    "Lottery jackpot counter showing big winning numbers, attention-grabbing display, red and gold colors, dramatic photo",
    "Person pointing at winning lottery numbers on screen, excited expression, celebration moment, professional photo",
    "Lottery ticket close-up with highlighted winning numbers, dramatic lighting, focus on ticket details, professional photo",
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

function pickTimeSlot(platform: string): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const days = PLATFORM_DAYS[platform] || [2, 3, 4, 5];

  let dayOffset = 0;
  while (!days.includes((day + dayOffset) % 7)) {
    dayOffset++;
    if (dayOffset > 7) break;
  }

  const slot = TIME_SLOTS_UTC[Math.floor(Math.random() * TIME_SLOTS_UTC.length)];

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
  const prompt = `Argentine quiniela lottery, ${style}, photorealistic, high quality, detailed, no text overlay, no words, no letters`;

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

    for (const campaign of campaigns) {
      for (const channel of channels) {
        const platform = channel.service;
        const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

        const prompt = `${platformPrompt}
Campaña: ${campaign.name}
Nichos: ${campaign.industry || "lotería/quinela"}
Público: ${campaign.target_audience || "argentino general"}

Generá EXACTAMENTE en este formato JSON:
{
  "hook": "Frase gancho para ${platform} (máximo 10 palabras)",
  "body": "Cuerpo del post adaptado para ${platform} en español rioplatense",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

        try {
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

          const imageUrl = await generatePlatformImage(platform);
          result.imagesGenerated++;

          const scheduledTime = pickTimeSlot(platform);

          const sounds = TRENDING_SOUNDS[platform];
          const soundSuggestion = sounds ? sounds[Math.floor(Math.random() * sounds.length)] : "";
          const text = `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}${soundSuggestion ? "\n\n\uD83C\uDFB5 " + soundSuggestion : ""}`;

          let metadata = {};
          let schedulingType: "automatic" | "notification" = "automatic";
          if (platform === "instagram") {
            metadata = { instagram: { type: "post", shouldShareToFeed: true } };
          } else if (platform === "facebook") {
            metadata = { facebook: { type: "post" } };
            schedulingType = "notification";
          }

          const post = await createBufferPost({
            channelId: channel.id,
            text,
            schedulingType,
            mode: "addToQueue",
            metadata,
            assets: [{ image: { url: imageUrl } }],
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
  } catch {
    return NextResponse.json({ recentPosts: [] });
  }
}
