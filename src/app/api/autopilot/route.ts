import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import {
  buildPostPrompt,
  buildYouTubePrompt,
  buildImagePrompt,
  ensureSiteUrl,
  isLotteryCampaign,
  AUDIENCE_CONTEXT,
  COPYWRITER_SYSTEM,
  pickContentAngle,
  type CopyCampaignContext,
} from "@/lib/ai/copywriter";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { parseJsonContent, normalizePostContent } from "@/lib/ai/json-content";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, getBufferPosts, deleteBufferPost, isBufferRateLimited, type BufferChannel } from "@/lib/buffer/client";
import { getSmartSchedule, autoImproveCampaign } from "@/lib/ai/autonomous";
import { syncInstagramInsights } from "@/lib/analytics/meta";
import { tryGetSavedToken } from "@/lib/youtube";
import { publishWithRotation, getProviderStatus } from "@/lib/publisher/rotation";
import { humanDelay, humanizeText, pickHumanTimeSlot, checkDailyQuota } from "@/lib/anti-bot";
import { POST as cleanupBufferRoute } from "@/app/api/admin/cleanup-buffer/route";
import { POST as cleanupBulkPublishRoute } from "@/app/api/admin/cleanup-bulkpublish/route";
import {
  getPublishBlock,
  markPublishFailure,
  clearPublishFailure,
} from "@/lib/publisher/failure-backoff";
import { hostImagePublicly, normalizeImageForMeta } from "@/lib/media-hosting";
import { canPublishToFacebook } from "@/lib/meta/graph";
import { getAllCampaignImages, pickCampaignImage } from "@/lib/campaign-images";
import { processPendingRenders, startYouTubeRender, isVideoRenderBlocked } from "@/lib/video/render-queue";
import { buildTikTokVideo, selectTikTokFrames } from "@/lib/video/tiktok-video";
import { checkFFmpeg } from "@/lib/video/ffmpeg";
import { maxSimilarityVs } from "../../../../shared/text-similarity";
import { findProhibitedClaims } from "../../../../shared/prohibited-claims";
import type { SupabaseClient } from "@supabase/supabase-js";

// Render de video con ffmpeg (TikTok/YouTube) dentro del ciclo. En Hobby,
// Vercel permite funciones de hasta 300s (docs de planes): se usa casi todo
// porque una publicaci├│n pesa ~50s (IA + render + publicar) y hay que cubrir
// todas las campa├▒as en una sola pasada del cron.
export const maxDuration = 300;

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  imagesGenerated: number;
  duplicatesBlocked: number;
  claimsBlocked: number;
  errors: string[];
  details: string[];
  posts: { platform: string; id: string; status: string; scheduledAt?: string }[];
  youtubeReady?: number;
  /** Presente cuando YouTube qued├│ sin token: el link de re-autorizaci├│n. */
  youtubeAuthUrl?: string;
}

/** Formatea milisegundos como "12.3s" para los detalles de tiempos. */
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** Link de re-autorizaci├│n de YouTube (Google revoc├│ el token en prod). */
const YOUTUBE_AUTH_URL = "https://autopublicador-zeta.vercel.app/api/auth/youtube/callback";

const TIME_SLOTS_UTC: number[] = [15, 16, 17, 20, 21, 23, 0, 1];

/**
 * Textos publicados recientemente de una campa├▒a/plataforma, para comparar
 * candidatos contra lo ya publicado (anti-duplicados, umbral ├║nico 0.75).
 */
async function loadRecentPublishedTexts(
  supabase: SupabaseClient,
  campaignId: string,
  platform: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("content_pieces")
      .select("title, body")
      .eq("campaign_id", campaignId)
      .eq("platform", platform)
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(50);

    return (data || [])
      .map((row) => `${row.title || ""} ${row.body || ""}`.trim())
      .filter((text) => text.length > 20);
  } catch {
    // Sin historial no bloqueamos nada: preferimos publicar a no publicar.
    return [];
  }
}

/**
 * Devuelve una nota para el prompt con los ├║ltimos textos publicados, para que
 * la IA no repita ganchos, frases ni estructuras ya usadas.
 */
function avoidRepetitionNote(recentTexts: string[]): string {
  if (recentTexts.length === 0) return "";
  const samples = recentTexts
    .slice(0, 8)
    .map((text) => `- ${text.replace(/\s+/g, " ").slice(0, 90)}`)
    .join("\n");
  return `Ya publicaste esto en este canal (NO repitas ganchos, frases, estructuras ni ideas; cambi├í el ├íngulo):\n${samples}`;
}

/**
 * Cuenta los posts ya publicados de esa campaña+plataforma para rotar el
 * ángulo de marketing: cada publicación toma un ángulo distinto a los últimos
 * (educación, curiosidad, mito...), en vez de dejar que la IA varíe al azar y
 * converge siempre al mismo gancho. Se usa el conteo total real, no la muestra
 * de recientes (que está cortada a 50 y rompería la rotación).
 */
async function countPublishedForAngle(
  supabase: SupabaseClient,
  campaignId: string,
  platform: string
): Promise<number> {
  try {
    const { count } = await supabase
      .from("content_pieces")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("platform", platform)
      .eq("status", "PUBLISHED");
    return count || 0;
  } catch {
    return 0;
  }
}

const PLATFORM_DAYS: Record<string, number[]> = {
  tiktok: [1, 2, 3, 4, 5, 6, 0],
  instagram: [1, 2, 3, 4, 5, 6, 0],
  facebook: [1, 2, 3, 4, 5],
  youtube: [2, 3, 4, 5, 6],
};

// Estilos calibrados contra las referencias del usuario (fotos reales de
// agencias argentinas de quiniela: boleto impreso en el mostrador, billetes de
// $100 frente a la cartelera de resultados, calendario con la fecha marcada).
// Predominan las tomas SIN cara (manos, papeles, cartelera): se parecen m├ís a
// lo que ya se publica y, de paso, eliminan el problema de rasgos que no son
// los de la audiencia. La gu├¡a de audiencia se agrega igual en todos los casos.
const IMAGE_STYLES: Record<string, string[]> = {
  tiktok: [
    "Photorealistic close-up of a hand receiving a printed quiniela lottery ticket across a lottery agency counter, POS terminal and peso bills on the counter, warm indoor light, real photo",
    "Fan of Argentine peso bills held up in front of a colourful quiniela results board with red and yellow signage and large printed numbers, Argentine lottery shop, warm light, photorealistic close-up",
    "Wall of an Argentine quiniela results board with rows of printed winning numbers on red green and white panels, slightly worn paper, photorealistic, no people",
    "Printed quiniela betting slip on a wooden table with a pen resting on the marked numbers and peso bills beside it, natural window light, photorealistic macro photo",
    "Wall calendar with one date circled in red marker, morning sunlight through a window, a hand holding the marker, photorealistic close-up",
    "Stack of printed quiniela tickets and peso bills on a lottery agency counter, shallow depth of field, warm tones, photorealistic",
  ],
  instagram: [
    "Close-up of a printed quiniela lottery ticket held in a hand at a lottery agency, blurred colourful results board behind, warm indoor light, photorealistic",
    "Fan of Argentine peso bills in front of a colourful quiniela results board with large printed numbers, Argentine lottery shop wall, photorealistic close-up",
    "Printed quiniela betting slip on a table with a pen and a phone showing numbers, natural light, photorealistic flat lay",
    "Argentine quiniela results board wall with rows of printed numbers and red signage, slightly worn, photorealistic, no people",
    "Young Argentine man (Latino, dark hair, olive skin) talking on the phone with a surprised expression against a plain coloured background, editorial photo",
  ],
  facebook: [
    "Wall of an Argentine quiniela results board with rows of printed winning numbers on red and green panels, photorealistic, no people",
    "Argentine friends (Latinos, dark hair) looking at quiniela results on a smartphone at home, warm indoor light, lifestyle photo",
    "Hand holding a printed quiniela ticket in front of a colourful results board, warm light, photorealistic close-up",
    "Stack of Argentine peso bills next to printed quiniela tickets on a counter, golden light, photorealistic",
    "Close-up of a quiniela ticket with a pen marking numbers, dramatic side light, photorealistic",
  ],
  youtube: [
    "YouTube thumbnail style: Split screen with a printed quiniela ticket on the left and a phone showing predictions on the right, bold contrasting colours, dramatic lighting, 16:9 aspect ratio",
    "YouTube thumbnail style: Giant red arrow pointing at winning numbers on an Argentine quiniela results board, bright yellow and red colours, 16:9 aspect ratio",
    "YouTube thumbnail style: Stack of Argentine peso bills next to printed quiniela tickets, golden lighting, 16:9 aspect ratio",
    "YouTube thumbnail style: Close-up of a phone screen showing quiniela predictions on a dark background with glowing accents, 16:9 aspect ratio",
    "YouTube thumbnail style: Hand circling a date on a calendar with a red marker, dramatic lighting, 16:9 aspect ratio",
  ],
};

const TRENDING_SOUNDS: Record<string, string[]> = {
  tiktok: [
    "Sonido trending: original sound",
    "Musica viral: el audio que est├® subiendo ahora",
    "Audio popular: el que est├í sonando en todos lados",
    "Sonido en tendencia: upbeat r├ípido",
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

async function generatePlatformImage(
  platform: string,
  campaign?: CopyCampaignContext | null
): Promise<string> {
  const aspectRatio = platform === "youtube" ? "16:9" : "1:1";
  // Im├ígenes curadas s├│lo para campa├▒as de quiniela/loter├¡a; para cualquier
  // otro nicho el prompt sale de la campa├▒a (o se omite el asset).
  const lottery = isLotteryCampaign(campaign);
  const campaignPrompt = lottery ? null : buildImagePrompt(platform, campaign);
  const styles = IMAGE_STYLES[platform] || IMAGE_STYLES.instagram;
  // Nunca usar estilos de quiniela en campa├▒as de otros nichos (p. ej. cuando
  // la campa├▒a no tiene texto para derivar un prompt): prompt neutro gen├®rico.
  const neutralStyle = `Foto realista y natural para ${platform}, escena cotidiana de persona usando su tel├®fono, luz natural, sin texto ni logos, sin est├®tica publicitaria`;
  const style = campaignPrompt
    ? campaignPrompt
    : lottery
      ? styles[Math.floor(Math.random() * styles.length)]
      : neutralStyle;

  let url = "";
  try {
    // La gu├¡a de audiencia va a TODOS los prompts: sin ella el modelo devuelve
    // caras que no son de la audiencia de la campa├▒a (rasgos asi├íticos).
    const image = await generateImageWithFallback(
      `${style}. ${AUDIENCE_CONTEXT}`,
      aspectRatio
    );
    url = image.url;
  } catch {
    if (lottery) {
      const fallback = [
        "quiniela-matematica.png",
        "quiniela-patron.png",
        "quiniela-metodo.png",
        "quiniela-factores.png",
        "quiniela-datos.png",
      ];
      url = `https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/${fallback[Math.floor(Math.random() * fallback.length)]}`;
    } else {
      // Sin imagen de respaldo no publicamos una foto de otro nicho: el caller
      // decide (si hay assets de la campa├▒a se usan; si no, se omite el asset).
      return "";
    }
  }

  if (!url) return "";

  // Re-hostear en Supabase Storage: URL publica estable que Meta/Buffer/BulkPublish
  // pueden descargar sin depender de proveedores externos lentos.
  return hostImagePublicly(url, platform);
}

export async function POST(request?: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const result: LoopResult = {
      timestamp: Date.now(),
      contentGenerated: 0,
      contentPublished: 0,
      imagesGenerated: 0,
      duplicatesBlocked: 0,
      claimsBlocked: 0,
      errors: [],
      details: [],
      posts: [],
    };

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true })
      .limit(50);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No hay campa├▒as activas"] });
    }

    // Im├ígenes propias de cada campa├▒a: se usan antes de generar con IA.
    const campaignImages = await getAllCampaignImages();
    const imagesFor = (campaignId: string): string[] => campaignImages[campaignId] || [];

    let channels: BufferChannel[] = [];
    let orgId = "";
    let bufferSkipped = false;
    let providerStatus;
    try {
      providerStatus = await getProviderStatus();
      result.details.push(`[Rotaci├│n] Orden: ${providerStatus.activeOrder.join(" ÔåÆ ")}`);

      if (providerStatus.buffer === "rate_limited") {
        bufferSkipped = true;
        result.details.push("[Buffer] Rate limit ÔÇö usando alternativas");
      } else {
        const account = await getBufferAccount();
        orgId = account.account.organizations[0]?.id || "";
        if (orgId) {
          channels = (await getBufferChannels(orgId)).filter(
            // Facebook deshabilitado a pedido del usuario (permiso #240 no
            // disponible). Para reactivar: quitar este filter.
            (ch) => ch.service !== "facebook"
          );
        }
      }
    } catch (e) {
      result.errors.push(`Buffer: ${e instanceof Error ? e.message : "error"}`);
      if (/too many requests/i.test(e instanceof Error ? e.message : "")) bufferSkipped = true;
    }

    if (channels.length === 0 && !bufferSkipped) {
      return NextResponse.json({ ...result, errors: [...result.errors, "No hay canales de Buffer conectados"] });
    }

    // Check slot availability ONCE before loops (avoids repeated Buffer calls)
    const fullChannels = new Set<string>();
    if (!bufferSkipped) {
      for (const ch of channels) {
        try {
          const posts = await getBufferPosts(ch.id, 10);
          // Solo la cola real cuenta: los "sent" (historial) no ocupan lugar.
          const active = posts.filter((p) => !["sent", "error", "failed"].includes(p.status));
          if (active.length >= 10) fullChannels.add(ch.id);
          else if (active.length >= 8) result.details.push(`[${ch.service}] ${active.length}/10 posts (cerca del l├¡mite)`);
        } catch {}
      }
      await humanDelay("before_buffer");
    }
    await humanDelay("before_bulkpublish");

    // Analytics: engagement real de Instagram (Meta Insights) ANTES de decidir
    // horarios. Best-effort: si falla, getSmartSchedule sigue usando las
    // franjas de audiencia argentina por defecto.
    try {
      const metaSync = await syncInstagramInsights(30);
      result.details.push(
        `[Analytics] Meta Insights IG: +${metaSync.inserted} filas, ${metaSync.updated} actualizadas, ${metaSync.unchanged} sin cambios (${metaSync.posts} posts / 30 días)`
      );
    } catch (e) {
      result.details.push(
        `[Analytics] Meta Insights no disponible: ${e instanceof Error ? e.message : "error"} — se usan horarios por defecto`
      );
    }

    // Learning loop: registra el hallazgo de engagement en strategy_memory
    // (la tabla existía desde el esquema inicial y nunca se escribía).
    try {
      const improve = await autoImproveCampaign(campaigns[0].id);
      result.details.push(`[Aprendizaje] ${improve.insight} -> ${improve.action}`);
    } catch {}

    for (const campaign of campaigns) {
      for (const channel of channels) {
        const platform = channel.service;

        // Smart schedule: learns from analytics data
        let smartHour = 15;
        try {
          const smart = await getSmartSchedule(platform);
          smartHour = smart.hour;
          result.details.push(`[${platform}] ${smart.reason}`);
        } catch {}

        // Skip full channels
        if (fullChannels.has(channel.id)) {
          result.details.push(`[${platform}] Canal lleno (10/10). Cleanup lo libera en pr├│ximo ciclo.`);
          continue;
        }

        // Anti-bot: check daily quota
        const quotaOk = await checkDailyQuota(platform, supabase);
        if (!quotaOk) {
          result.details.push(`[${platform}] Cuota diaria alcanzada. Se retoma ma├▒ana.`);
          continue;
        }

        // Backoff: si este canal fall├│ hace poco, no gastes IA.
        const bufferBlock = await getPublishBlock(platform);
        if (bufferBlock) {
          result.details.push(
            `[${platform}] Pausado por fallos recientes (${bufferBlock.slice(0, 60)}) ÔÇö reintento autom├ítico`
          );
          continue;
        }

        const recentTexts = await loadRecentPublishedTexts(supabase, campaign.id, platform);
        // Ángulo de marketing rotativo: cada post aborda una perspectiva
        // distinta (educación, curiosidad, mito...) en lugar de dejar que la
        // IA varíe al azar y termine siempre con el mismo gancho.
        const bufferAngle = pickContentAngle(
          await countPublishedForAngle(supabase, campaign.id, platform),
          recentTexts
        );
        const prompt = buildPostPrompt(
          platform,
          campaign,
          avoidRepetitionNote(recentTexts),
          bufferAngle
        );
        result.details.push(`[${platform}] Ángulo: ${bufferAngle.label}`);

        try {
          const response = await generateTextWithFallback(prompt, COPYWRITER_SYSTEM);

          let content;
          try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            content = normalizePostContent(jsonMatch ? JSON.parse(jsonMatch[0]) : null);
          } catch {
            content = null;
          }

          if (!content || !content.hook) {
            result.errors.push(`IA no gener├│ contenido para ${platform}: ${campaign.name}`);
            result.details.push(`[${platform}] IA devolvi├│ JSON sin "hook" ÔÇö se reintenta en el pr├│ximo ciclo`);
            continue;
          }

          result.contentGenerated++;
          result.details.push(`[${platform}] Contenido: ${content.hook}`);

          // Anti-duplicados: si ya publicamos algo casi igual, no gastamos
          // imagen ni mandamos el post (se reintenta en el pr├│ximo ciclo).
          const duplicateCheck = maxSimilarityVs(
            `${content.hook} ${content.body || ""}`,
            recentTexts
          );
          if (duplicateCheck.isDuplicate) {
            result.duplicatesBlocked++;
            result.details.push(
              `[${platform}] Duplicado probable (${Math.round(duplicateCheck.similarity * 100)}%) ÔÇö se descarta sin publicar`
            );
            continue;
          }

          // Promesas prohibidas (ganancia garantizada / estad├¡sticas de
          // ganancias inventadas): se descarta antes de gastar imagen.
          const claimIssue = findProhibitedClaims(
            `${content.hook} ${content.body || ""} ${content.cta || ""}`
          );
          if (claimIssue.length > 0) {
            result.claimsBlocked++;
            result.details.push(
              `[${platform}] Promesa prohibida (${claimIssue.join(", ")}) ÔÇö se descarta sin publicar`
            );
            continue;
          }

          const ownImage = pickCampaignImage(imagesFor(campaign.id));
          const imageUrl = ownImage || (await generatePlatformImage(platform, campaign));
          if (!ownImage && imageUrl) result.imagesGenerated++;
          result.details.push(
            `[${platform}] Imagen: ${ownImage ? "de la campa├▒a" : imageUrl ? "generada con IA" : "omitida (sin asset propio)"}`
          );

          // Anti-bot: human time slot + humanized text. La hora sale del
          // scheduler con datos de engagement (si lo hay); sin datos cae en
          // las franjas de audiencia argentina.
          const scheduledTime = pickHumanTimeSlot(platform, true, smartHour);
          const humanText = humanizeText(
            `${ensureSiteUrl(
              `${content.hook || ""}\n\n${content.body || ""}\n\n${content.cta || ""}`.trim(),
              campaign
            )}\n\n${(content.hashtags || []).join(" ")}`
          );

          const sounds = TRENDING_SOUNDS[platform];
          // Sonido trending: s├│lo sugerencia interna (nunca se publica en el texto
          // del post ÔÇö se ver├¡a como ruido/bot en la descripci├│n publicada).
          if (sounds?.length) {
            result.details.push(
              `[${platform}] Sonido trending sugerido: ${sounds[Math.floor(Math.random() * sounds.length)]}`
            );
          }
          const text = humanText;

          let metadata = {};
          let schedulingType: "automatic" | "notification" = "automatic";
          if (platform === "instagram") {
            metadata = { instagram: { type: "post", shouldShareToFeed: true } };
          } else if (platform === "facebook") {
            metadata = { facebook: { type: "post" } };
            schedulingType = "notification";
          }

          // Anti-bot delay before Buffer
          await humanDelay("before_buffer");

          const post = await createBufferPost({
            channelId: channel.id,
            text,
            schedulingType,
            mode: "addToQueue",
            metadata,
            assets: imageUrl ? [{ image: { url: imageUrl } }] : undefined,
          });

          result.contentPublished++;
          await clearPublishFailure(platform);
          result.posts.push({
            platform,
            id: post.id,
            status: post.status,
            scheduledAt: scheduledTime.toISOString(),
          });
          result.details.push(
            `[${platform}] Buffer OK: ${post.id} | ${scheduledTime.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`
          );

          const { data: cp } = await supabase.from("content_pieces").insert({
            campaign_id: campaign.id,
            title: content.hook,
            hook: content.hook,
            body: content.body,
            cta: content.cta,
            hashtags: content.hashtags || [],
            status: "PUBLISHED",
            platform,
            media_urls: imageUrl ? [imageUrl] : [],
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
          const msg = e instanceof Error ? e.message : "error";
          result.errors.push(`[${platform}] ${msg}`);
          await markPublishFailure(platform, msg);
        }

        // Anti-bot: delay between posts
        await humanDelay("between_posts");
      }
    }

    // FALLBACK: Rotation (Meta/BulkPublish) for platforms not handled by Buffer.
    // Siempre corre: TikTok no tiene canal en Buffer, as├¡ que antes solo se
    // publicaba cuando Buffer fallaba por completo. Cada plataforma que Buffer
    // S├ì cubre queda salteada por el `channels.find` de adentro.
    {
      // Presupuesto de tiempo: la funci├│n se corta en maxDuration. Si no queda
      // margen para IA + render + publicar, esa campa├▒a se posterga al pr├│ximo
      // ciclo en vez de empezar algo que no va a terminar.
      // Presupuesto de tiempo: la funci├│n se corta en maxDuration (300s). La
      // rotaci├│n usa 225s y el resto queda para YouTube, la limpieza autom├ítica
      // y la notificaci├│n: una corrida medida lleg├│ a 286s y no debe morir a
      // mitad de publicaci├│n.
      const rotationDeadline = Date.now() + 225_000;
      const MIN_REMAINING_MS = 45_000;
      let outOfTime = false;

      // Campa├▒as con la publicaci├│n m├ís vieja primero: si el presupuesto del
      // ciclo no alcanza para todas, no se lo queda siempre la primera de la
      // lista y en pocos d├¡as todas reciben contenido.
      let orderedCampaigns = campaigns;
      try {
        const { data: recentPubs } = await supabase
          .from("content_pieces")
          .select("campaign_id, published_at")
          .eq("status", "PUBLISHED")
          .order("published_at", { ascending: false })
          .limit(100);
        const lastPub: Record<string, number> = {};
        for (const row of recentPubs || []) {
          if (row.campaign_id && lastPub[row.campaign_id] === undefined) {
            lastPub[row.campaign_id] = row.published_at || 0;
          }
        }
        orderedCampaigns = [...campaigns].sort(
          (a, b) => (lastPub[a.id] || 0) - (lastPub[b.id] || 0)
        );
      } catch {
        // Sin historial usable se mantiene el orden original.
      }

      // TikTok va primero: es la plataforma que m├ís se complic├│ (requiere video
      // y BulkPublish Free solo admite 3 posts/d├¡a), as├¡ que se le da prioridad
      // en el presupuesto del ciclo. Instagram entra si queda tiempo.
      // Orden por prioridad: TikTok primero (requiere video y BulkPublish Free
      // solo admite 3 posts/dia), despues Instagram y por ultimo Facebook.
      // Facebook solo entra si el token de Meta tiene pages_manage_posts: sin
      // ese permiso la API responde (#200)/(#240), cada intento gasta una
      // llamada a la IA y deja backoff sin publicar nada.
      const metaCanFacebook = await canPublishToFacebook();
      if (!metaCanFacebook) {
        result.details.push(
          "[facebook] Sin permiso pages_manage_posts en el token de Meta - se omite hasta concederlo"
        );
      }
      const rotationPlan = [
        { platform: "tiktok", max: 3 },
        { platform: "instagram", max: 2 },
        ...(metaCanFacebook ? [{ platform: "facebook", max: 1 }] : []),
      ];
      let tiktokDone = 0;
      let instagramDone = 0;
      let facebookDone = 0;
      // Mejor hora para esta plataforma según los datos de engagement de los
      // últimos 30 días (si no hay datos, cae en la franja de audiencia
      // argentina). Se calcula una sola vez por plataforma, no por post.
      let rotSmartHour: number | null = null;
      for (const rot of rotationPlan) {
        const platform = rot.platform;
        if (platform === "tiktok" && tiktokDone >= rot.max) continue;
        if (platform === "instagram" && instagramDone >= rot.max) continue;
        if (platform === "facebook" && facebookDone >= rot.max) continue;
        if (outOfTime) break;
        try {
          const smart = await getSmartSchedule(platform);
          rotSmartHour = smart.hour;
          result.details.push(`[${platform}] ${smart.reason}`);
        } catch {
          rotSmartHour = null;
        }
        for (const campaign of orderedCampaigns) {
          if (outOfTime) break;
          if (channels.find((c) => c.service === platform)) continue;

          // Sin proveedor libre no tiene sentido generar contenido: se gastar├¡a
          // IA + imagen para tirar el resultado en la rotaci├│n.
          const canMeta =
            (platform === "facebook" || platform === "instagram") &&
            providerStatus?.meta === "configured";
          const canBp = providerStatus?.bulkpublish === "ok";

          if (!canMeta && !canBp) {
            result.details.push(
              `[${platform}] Sin proveedores libres (rate limit) ÔÇö se omite sin gastar IA`
            );
            continue;
          }

          // Backoff: si este proveedor fall├│ hace poco, no gastes IA.
          const publishBlock = await getPublishBlock(platform);
          if (publishBlock) {
            result.details.push(
              `[${platform}] Pausado por fallos recientes (${publishBlock.slice(0, 60)}) ÔÇö reintento autom├ítico`
            );
            continue;
          }

          // Anti-bot: daily quota check
          const quotaOk = await checkDailyQuota(platform, supabase, { direct: canMeta });
          if (!quotaOk) {
            result.details.push(`[${platform}] Cuota diaria alcanzada.`);
            continue;
          }

          // ┬┐Queda tiempo para terminar este post dentro del ciclo?
          if (Date.now() + MIN_REMAINING_MS > rotationDeadline) {
            outOfTime = true;
            result.details.push(
              `[${platform}] ${campaign.name}: sin tiempo en este ciclo ÔÇö se publica en el pr├│ximo`
            );
            break;
          }

          try {
            await humanDelay("between_platforms");
            const tStart = Date.now();

            const rotationRecent = await loadRecentPublishedTexts(
              supabase,
              campaign.id,
              platform
            );
            const prompt = buildPostPrompt(
              platform,
              campaign,
              avoidRepetitionNote(rotationRecent),
              // Ángulo rotativo por campaña+plataforma (mismo criterio que en
              // el camino de Buffer): la IA recibe la perspectiva del día.
              pickContentAngle(
                await countPublishedForAngle(supabase, campaign.id, platform),
                rotationRecent
              )
            );

            const response = await generateTextWithFallback(prompt, COPYWRITER_SYSTEM);
            const tAi = Date.now();

            const content = normalizePostContent(
              parseJsonContent<{
                hook?: string;
                title?: string;
                body?: string;
                caption?: string;
                text?: string;
                cta?: string;
                hashtags?: string[];
                tags?: string[];
              }>(response.text)
            );

            if (!content) {
              // Diagnostico: que devolvio realmente la IA cuando no se pudo
              // armar el post (vacia, JSON con otra forma, texto cortado...).
              const raw = (response.text || "").replace(/\s+/g, " ").trim();
              const shown =
                raw.length > 270 ? `${raw.slice(0, 150)} ... ${raw.slice(-120)}` : raw;
              result.details.push(
                `[${platform}] IA cruda (${raw.length} chars): ${shown || "(respuesta vacia)"}`
              );
              result.details.push(`[${platform}] IA devolvi├│ JSON sin "hook" ÔÇö se reintenta en el pr├│ximo ciclo`);
              continue;
            }

            // Anti-duplicados (mismo umbral 0.75 que el resto del sistema)
            const dupCheck = maxSimilarityVs(
              `${content.hook} ${content.body || ""}`,
              rotationRecent
            );
            if (dupCheck.isDuplicate) {
              result.duplicatesBlocked++;
              result.details.push(
                `[${platform}] Duplicado probable (${Math.round(dupCheck.similarity * 100)}%) ÔÇö se descarta sin publicar`
              );
              continue;
            }

            // Promesas prohibidas (mismo control que en el camino de Buffer)
            const rotationClaimIssue = findProhibitedClaims(
              `${content.hook} ${content.body || ""} ${content.cta || ""}`
            );
            if (rotationClaimIssue.length > 0) {
              result.claimsBlocked++;
              result.details.push(
                `[${platform}] Promesa prohibida (${rotationClaimIssue.join(", ")}) ÔÇö se descarta sin publicar`
              );
              continue;
            }

            const ownImage = pickCampaignImage(imagesFor(campaign.id));
            const imageUrl = ownImage || (await generatePlatformImage(platform, campaign));
            if (!ownImage && imageUrl) result.imagesGenerated++;

            // Meta rechaza fotos con proporciones que no le gustan: el error
            // real en produccion es 36003 "aspect ratio is not supported" y
            // tira la publicacion entera (le pasa a las capturas de la
            // campana). Se normaliza a 4:5 con ffmpeg para Graph.
            let finalImageUrl = imageUrl;
            if (imageUrl && (platform === "instagram" || platform === "facebook")) {
              finalImageUrl = await normalizeImageForMeta(imageUrl, `${platform}-post`);
            }

            // TikTok (BulkPublish) rechaza posts sin video. Se arma un reel
            // vertical con ffmpeg a partir de las im├ígenes de la campa├▒a y se
            // publica ese video en lugar de una foto est├ítica.
            let videoUrl = "";
            if (platform === "tiktok") {
              const frames = selectTikTokFrames(ownImage || "", imageUrl, imagesFor(campaign.id));
              const video = await buildTikTokVideo({ images: frames, audioText: content.hook });
              videoUrl = video.url;
              result.details.push(
                videoUrl
                  ? `[tiktok] Video generado (${video.frames} frames / ${video.seconds}s)`
                  : `[tiktok] Sin video (${video.error}) ÔÇö se omite en vez de publicar sin media`
              );
              if (!videoUrl) continue;
            }

            const humanText = humanizeText(
              `${ensureSiteUrl(
                `${content.hook || ""}\n\n${content.body || ""}\n\n${content.cta || ""}`.trim(),
                campaign
              )}\n\n${(content.hashtags || []).join(" ")}`
            );
            const scheduledTime = pickHumanTimeSlot(platform, true, rotSmartHour);
            const tMedia = Date.now();

            const rotResult = await publishWithRotation({
              text: humanText,
              platform,
              ...(videoUrl ? { videoUrl } : {}),
              ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
            });
            const tPub = Date.now();
            result.details.push(
              `[${platform}] tiempos ${campaign.name}: ia ${secs(tAi - tStart)}` +
                ` ┬À media ${secs(tMedia - tAi)} ┬À publicar ${secs(tPub - tMedia)}` +
                ` ┬À total ${secs(tPub - tStart)}`
            );

            if (rotResult.success) {
              if (platform === "tiktok") tiktokDone++;
              else if (platform === "instagram") instagramDone++;
              else if (platform === "facebook") facebookDone++;
              result.contentPublished++;
              result.contentGenerated++;
              await clearPublishFailure(platform);
              result.posts.push({ platform, id: rotResult.externalId || "", status: "published" });
              result.details.push(`[${platform}] ${rotResult.publisher} OK: ${rotResult.externalId}`);

              await supabase.from("content_pieces").insert({
                campaign_id: campaign.id,
                title: content.hook,
                hook: content.hook,
                body: content.body,
                cta: content.cta,
                hashtags: content.hashtags || [],
                status: "PUBLISHED",
                platform,
                media_urls: videoUrl ? [videoUrl] : imageUrl ? [imageUrl] : [],
                external_post_id: rotResult.externalId || "",
                published_at: Date.now(),
              });
            } else {
              await markPublishFailure(platform, rotResult.error || "rotaci├│n fall├│");
              result.details.push(`[${platform}] Rotaci├│n: ${rotResult.error}`);
            }
          } catch (e) {
            result.errors.push(`[rot-${platform}] ${e instanceof Error ? e.message : "error"}`);
          }
        }
      }
    }

    // AUTO-YOUTUBE: primero retoma renders pendientes; si no hay ninguno, arma uno nuevo.
    // El render corre en Shotstack (gratis) y se retoma en el siguiente ciclo: as├¡ nunca
    // se supera el timeout de 60s de Vercel.
    let youtubeAuthNeeded = false;
    try {
      const youtubeToken = await tryGetSavedToken();
      if (youtubeToken) {
        const resumed = await processPendingRenders(supabase, youtubeToken);
        result.details.push(...resumed.details);
        result.contentPublished += resumed.uploaded;
        if (resumed.uploaded > 0) {
          result.posts.push({
            platform: "youtube",
            id: `uploaded-${resumed.uploaded}`,
            status: "published",
          });
        }

        if (resumed.pending > 0) {
          result.details.push(
            `[youtube] ${resumed.pending} render(s) en curso ÔÇö se retoma en el pr├│ximo ciclo`
          );
        } else if ((await isVideoRenderBlocked(supabase)) && !(await checkFFmpeg())) {
          result.details.push(
            `[youtube] Video autom├ítico pausado (Shotstack sin cr├®ditos y sin ffmpeg local) ÔÇö se reintenta solo`
          );
        } else {
          const quotaOk = await checkDailyQuota("youtube", supabase);
          if (!quotaOk) {
            result.details.push("[youtube] Cuota diaria alcanzada. Se retoma ma├▒ana.");
          }

          // El l├¡mite real lo pone la cuota diaria (3/d├¡a): as├¡ cada campa├▒a
          // activa recibe video en el mismo ciclo, no solo las dos primeras.
          const ytStartLimit = campaigns.length;
          let startedThisCycle = 0;
          for (const campaign of campaigns) {
            if (!quotaOk || startedThisCycle >= ytStartLimit) break;

            const ytRecent = await loadRecentPublishedTexts(supabase, campaign.id, "youtube");
            const ytPrompt = `${buildYouTubePrompt(campaign)}

Cada video debe usar un enfoque distinto al anterior (tema, hook y encuadre siempre nuevos).
Estilo: natural y realista (persona real, sin est├®tica publicitaria forzada), formato reel/short.

${avoidRepetitionNote(ytRecent)}`;

            try {
              const response = await generateTextWithFallback(ytPrompt, COPYWRITER_SYSTEM);

              const ytContent = parseJsonContent<{
                title?: string;
                description?: string;
                tags?: string[];
                thumbnail_prompt?: string;
              }>(response.text);

              if (!ytContent?.title) {
                result.details.push(
                  `[youtube] IA devolvi├│ JSON sin "title" para ${campaign.name} ÔÇö se reintenta en el pr├│ximo ciclo`
                );
                continue;
              }

              result.contentGenerated++;
              result.details.push(`[youtube] Contenido: ${ytContent.title}`);

              // Im├ígenes propias de la campa├▒a primero (posts + frames del video).
              const ytOwnImages = imagesFor(campaign.id);
              let thumbnailUrl = ytOwnImages[0] || "";
              if (!thumbnailUrl) {
                try {
                  // Prompt de la campa├▒a (nunca un nicho hardcodeado).
                  const thumbPrompt =
                    ytContent.thumbnail_prompt ||
                    buildImagePrompt("youtube", campaign) ||
                    `Thumbnail de YouTube natural y realista sobre: ${campaign.name}${
                      campaign.description ? ` ÔÇö ${campaign.description.slice(0, 120)}` : ""
                    }`;
                  const thumb = await generateImageWithFallback(thumbPrompt, "16:9");
                  thumbnailUrl = await hostImagePublicly(thumb.url, "youtube");
                  result.imagesGenerated++;
                } catch {}
              }

              const started = await startYouTubeRender(supabase, {
                campaignId: campaign.id,
                title: ytContent.title,
                description: ensureSiteUrl(
                  [
                    (ytContent.description || "").trim(),
                    (ytContent.tags || []).length ? (ytContent.tags || []).join(", ") : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                  campaign
                ),
                tags: ytContent.tags || [],
                thumbnailUrl: thumbnailUrl || undefined,
                images: ytOwnImages,
              });

              if (started.renderId || started.pieceId) {
                startedThisCycle++;
                const isLocal = (started.renderId || "").startsWith("local:");
                result.details.push(
                  isLocal
                    ? `[youtube] Render local encolado (ffmpeg): ${started.renderId}`
                    : `[youtube] Render iniciado: ${started.renderId}`
                );
              } else {
                result.details.push(
                  `[youtube] No se pudo iniciar render: ${started.error || "sin detalle"}`
                );
                await supabase.from("content_pieces").insert({
                  campaign_id: campaign.id,
                  title: ytContent.title,
                  body: ytContent.description,
                  cta: "Suscribit├® y activ├í la campanita",
                  hashtags: ytContent.tags || [],
                  status: "READY",
                  platform: "youtube",
                  media_urls: thumbnailUrl ? [thumbnailUrl] : [],
                  external_post_id: "",
                  published_at: Date.now(),
                });
              }
            } catch (e) {
              result.errors.push(
                `[youtube] ${e instanceof Error ? e.message : "error"}`
              );
            }
          }
        }
      } else {
        youtubeAuthNeeded = true;
        result.youtubeAuthUrl = YOUTUBE_AUTH_URL;
        result.details.push(
          `[youtube] Token de Google no disponible (expirado o revocado). Re-autoriz├í la cuenta para volver a publicar: ${YOUTUBE_AUTH_URL}`
        );
      }
    } catch (e) {
      result.errors.push(`[youtube] ${e instanceof Error ? e.message : "error"}`);
    }

    // LIMPIEZA AUTOM├üTICA (al final: primero se publica, despu├®s se libera
    // espacio). Se ejecuta en proceso (sin HTTP interno) y cada ruta aplica su
    // propio throttling, as├¡ que casi nunca consume cuota de API.
    try {
      const res = await cleanupBufferRoute();
      const data = await res.json();
      result.details.push(
        data.skipped
          ? `[Auto] Buffer: ${data.message}`
          : `[Auto] Buffer limpiado: ${data.cleaned} posts`
      );
    } catch (e) {
      result.details.push(`[Auto] Buffer cleanup: ${e instanceof Error ? e.message : "error"}`);
    }

    try {
      const res = await cleanupBulkPublishRoute();
      const data = await res.json();
      result.details.push(
        data.skipped
          ? `[Auto] BulkPublish: ${data.message}`
          : `[Auto] BulkPublish limpiado: ${data.cleaned} posts`
      );
    } catch (e) {
      result.details.push(`[Auto] BulkPublish cleanup: ${e instanceof Error ? e.message : "error"}`);
    }

    // Aviso visible en el dashboard: sin re-autorizar no se sube ning├║n video.
    if (youtubeAuthNeeded) {
      await supabase.from("notifications").insert({
        type: "warning",
        title: "YouTube desconectado",
        message: `Google expir├│ o revoc├│ el token: no se publican videos hasta volver a conectar la cuenta. Link: ${YOUTUBE_AUTH_URL}`,
        read: false,
        created_at: Date.now(),
      });
    }

    await supabase.from("notifications").insert({
      type: result.errors.length > 0 ? "warning" : "success",
      title: "Autopilot ejecutado",
      message: `Gen: ${result.contentGenerated} | Img: ${result.imagesGenerated} | Pub: ${result.contentPublished} | Err: ${result.errors.length} | Rot: ${providerStatus?.activeOrder.join("ÔåÆ") || "n/a"}`,
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
