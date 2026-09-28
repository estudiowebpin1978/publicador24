import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, getBufferPosts, deleteBufferPost, isBufferRateLimited, type BufferChannel } from "@/lib/buffer/client";
import { getSmartSchedule, autoImproveCampaign } from "@/lib/ai/autonomous";
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
import { hostImagePublicly } from "@/lib/media-hosting";
import { getAllCampaignImages, pickCampaignImage } from "@/lib/campaign-images";
import { processPendingRenders, startYouTubeRender, isVideoRenderBlocked } from "@/lib/video/render-queue";
import { checkFFmpeg } from "@/lib/video/ffmpeg";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  imagesGenerated: number;
  errors: string[];
  details: string[];
  posts: { platform: string; id: string; status: string; scheduledAt?: string }[];
  youtubeReady?: number;
}

const TIME_SLOTS_UTC: number[] = [15, 16, 17, 20, 21, 23, 0, 1];

function parseJsonContent<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

const PLATFORM_DAYS: Record<string, number[]> = {
  tiktok: [1, 2, 3, 4, 5, 6, 0],
  instagram: [1, 2, 3, 4, 5, 6, 0],
  facebook: [1, 2, 3, 4, 5],
  youtube: [2, 3, 4, 5, 6],
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
  youtube: `Generá contenido para YouTube sobre lotería/quinela.
ESTILO: Video educativo, tutorial, análisis de números, predicciones con IA.
INCLUYE: Título llamativo (max 100 chars), descripción con timestamps, tags SEO.
Tono: Profesional, educativo, argentino.
Formato: Título + Descripción + Tags + Thumbnail prompt.`,
};

const IMAGE_STYLES: Record<string, string[]> = {
  tiktok: [
    "Photorealistic close-up of hands holding an Argentine quiniela lottery ticket with printed numbers, store counter background, warm yellow lighting, real photo style, no text",
    "Hand holding Argentine peso bills in front of a colorful quiniela results board with red yellow green signage, Argentine lottery locale, realistic photo, high detail",
    "Mobile phone displaying Quiniela IA predictions app interface with numbers and emojis, dark purple theme, modern UI, realistic mockup, clean design",
    "Stack of printed quiniela lottery tickets next to peso bills on wooden table, coffee shop setting, warm tones, professional photography",
    "Person holding winning quiniela ticket with excited expression, confetti in foreground, celebration moment, realistic photo",
  ],
  instagram: [
    "Elegant Argentine quiniela lottery ticket close-up on dark background, premium design, gold and white details, macro photography, luxury feel",
    "Smartphone showcasing Quiniela IA app with predicted numbers and fire emojis, dark purple gradient background, professional mockup, clean UI",
    "Winner holding quiniela ticket with voucher, happy celebration, confetti falling, professional lifestyle photo, warm lighting",
    "Quiniela results board with glowing numbers 5829 6135, neon lights, night atmosphere, Argentine locale, cinematic photo",
    "Flat lay of Argentine quiniela ticket, peso bills, phone app mockup, and lucky charm on dark surface, professional product photo",
  ],
  facebook: [
    "Official quiniela results display with colorful numbers 5829 6135, clean typography, Argentine lottery board, professional photo",
    "Friends looking at quiniela results on smartphone, happy expressions, community atmosphere, warm indoor lighting, lifestyle photo",
    "Lottery jackpot numbers displayed prominently with red and gold colors, dramatic lighting, attention grabbing, professional photo",
    "Person pointing excitedly at winning quiniela numbers on phone screen, celebration moment, professional photography",
    "Close-up of quiniela ticket with highlighted winning numbers, dramatic side lighting, focus on paper details, professional photo",
  ],
  youtube: [
    "YouTube thumbnail style: Split screen showing quiniela ticket with winning numbers on left and AI prediction app on right, bold contrasting colors, dramatic lighting, eye-catching composition, 16:9 aspect ratio",
    "YouTube thumbnail style: Giant red arrow pointing at winning quiniela numbers on a results board, shocked face expression, bright yellow and red colors, 16:9 aspect ratio",
    "YouTube thumbnail style: Stack of Argentine peso bills next to quiniela tickets with green checkmarks, wealth concept, golden lighting, 16:9 aspect ratio",
    "YouTube thumbnail style: Before and after comparison showing random numbers vs AI-predicted quiniela numbers, transformation concept, blue and green tones, 16:9 aspect ratio",
    "YouTube thumbnail style: Close-up of phone screen showing Quiniela IA app with fire emojis and winning numbers, dark background with glowing accents, 16:9 aspect ratio",
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

async function generatePlatformImage(platform: string): Promise<string> {
  const styles = IMAGE_STYLES[platform] || IMAGE_STYLES.instagram;
  const style = styles[Math.floor(Math.random() * styles.length)];
  const aspectRatio = platform === "youtube" ? "16:9" : "1:1";

  let url = "";
  try {
    const image = await generateImageWithFallback(style, aspectRatio);
    url = image.url;
  } catch {
    const fallback = [
      "quiniela-matematica.png",
      "quiniela-patron.png",
      "quiniela-metodo.png",
      "quiniela-factores.png",
      "quiniela-datos.png",
    ];
    url = `https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/${fallback[Math.floor(Math.random() * fallback.length)]}`;
  }

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
      errors: [],
      details: [],
      posts: [],
    };

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "ACTIVE")
      .limit(3);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No hay campañas activas"] });
    }

    // Imágenes propias de cada campaña: se usan antes de generar con IA.
    const campaignImages = await getAllCampaignImages();
    const imagesFor = (campaignId: string): string[] => campaignImages[campaignId] || [];

    let channels: BufferChannel[] = [];
    let orgId = "";
    let bufferSkipped = false;
    let providerStatus;
    try {
      providerStatus = await getProviderStatus();
      result.details.push(`[Rotación] Orden: ${providerStatus.activeOrder.join(" → ")}`);

      if (providerStatus.buffer === "rate_limited") {
        bufferSkipped = true;
        result.details.push("[Buffer] Rate limit — usando alternativas");
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
          else if (active.length >= 8) result.details.push(`[${ch.service}] ${active.length}/10 posts (cerca del límite)`);
        } catch {}
      }
      await humanDelay("before_buffer");
    }
    await humanDelay("before_bulkpublish");

    for (const campaign of campaigns) {
      for (const channel of channels) {
        const platform = channel.service;
        const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;

        // Smart schedule: learns from analytics data
        let smartHour = 15;
        try {
          const smart = await getSmartSchedule(platform);
          smartHour = smart.hour;
          result.details.push(`[${platform}] ${smart.reason}`);
        } catch {}

        // Skip full channels
        if (fullChannels.has(channel.id)) {
          result.details.push(`[${platform}] Canal lleno (10/10). Cleanup lo libera en próximo ciclo.`);
          continue;
        }

        // Anti-bot: check daily quota
        const quotaOk = await checkDailyQuota(platform, supabase);
        if (!quotaOk) {
          result.details.push(`[${platform}] Cuota diaria alcanzada. Se retoma mañana.`);
          continue;
        }

        // Backoff: si este canal falló hace poco, no gastes IA.
        const bufferBlock = await getPublishBlock(platform);
        if (bufferBlock) {
          result.details.push(
            `[${platform}] Pausado por fallos recientes (${bufferBlock.slice(0, 60)}) — reintento automático`
          );
          continue;
        }

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
            result.details.push(`[${platform}] IA devolvió JSON sin "hook" — se reintenta en el próximo ciclo`);
            continue;
          }

          result.contentGenerated++;
          result.details.push(`[${platform}] Contenido: ${content.hook}`);

          const ownImage = pickCampaignImage(imagesFor(campaign.id));
          const imageUrl = ownImage || (await generatePlatformImage(platform));
          if (!ownImage) result.imagesGenerated++;
          result.details.push(
            `[${platform}] Imagen: ${ownImage ? "de la campaña" : "generada con IA"}`
          );

          // Anti-bot: human time slot + humanized text
          const scheduledTime = pickHumanTimeSlot(platform);
          const humanText = humanizeText(
            `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}`
          );

          const sounds = TRENDING_SOUNDS[platform];
          const soundSuggestion = sounds ? sounds[Math.floor(Math.random() * sounds.length)] : "";
          const text = soundSuggestion ? `${humanText}\n\n\uD83C\uDFB5 ${soundSuggestion}` : humanText;

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
            assets: [{ image: { url: imageUrl } }],
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
          const msg = e instanceof Error ? e.message : "error";
          result.errors.push(`[${platform}] ${msg}`);
          await markPublishFailure(platform, msg);
        }

        // Anti-bot: delay between posts
        await humanDelay("between_posts");
      }
    }

    // FALLBACK: Rotation (Meta/BulkPublish) for platforms not handled by Buffer
    if (bufferSkipped || result.contentPublished === 0) {
      for (const campaign of campaigns) {
        // Facebook queda fuera a pedido del usuario: no consigue el permiso
        // pages_manage_posts (#240) y no vale la pena gastar IA en fallos.
        // Para reactivarlo: agregar "facebook" a esta lista.
        for (const platform of ["instagram", "tiktok"]) {
          if (channels.find((c) => c.service === platform)) continue;

          // Sin proveedor libre no tiene sentido generar contenido: se gastaría
          // IA + imagen para tirar el resultado en la rotación.
          const canMeta =
            (platform === "facebook" || platform === "instagram") &&
            providerStatus?.meta === "configured";
          const canBp = providerStatus?.bulkpublish === "ok";

          if (!canMeta && !canBp) {
            result.details.push(
              `[${platform}] Sin proveedores libres (rate limit) — se omite sin gastar IA`
            );
            continue;
          }

          // Backoff: si este proveedor falló hace poco, no gastes IA.
          const publishBlock = await getPublishBlock(platform);
          if (publishBlock) {
            result.details.push(
              `[${platform}] Pausado por fallos recientes (${publishBlock.slice(0, 60)}) — reintento automático`
            );
            continue;
          }

          // Anti-bot: daily quota check
          const quotaOk = await checkDailyQuota(platform, supabase, { direct: canMeta });
          if (!quotaOk) {
            result.details.push(`[${platform}] Cuota diaria alcanzada.`);
            continue;
          }

          try {
            await humanDelay("between_platforms");

            const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.instagram;
            const prompt = `${platformPrompt}
Campaña: ${campaign.name}
Generá EXACTAMENTE en este formato JSON:
{
  "hook": "Frase gancho (máximo 10 palabras)",
  "body": "Cuerpo del post en español rioplatense",
  "cta": "CTA con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3"]
}`;

            const response = await generateTextWithFallback(
              prompt,
              `Sos experto en marketing para ${platform}. Respondé SOLO JSON.`
            );

            let content = parseJsonContent<{ hook?: string }>(response.text);

            if (!content?.hook) {
              result.details.push(`[${platform}] IA devolvió JSON sin "hook" — se reintenta en el próximo ciclo`);
              continue;
            }

            const ownImage = pickCampaignImage(imagesFor(campaign.id));
            const imageUrl = ownImage || (await generatePlatformImage(platform));
            if (!ownImage) result.imagesGenerated++;
            const humanText = humanizeText(
              `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}`
            );
            const scheduledTime = pickHumanTimeSlot(platform);

            const rotResult = await publishWithRotation({
              text: humanText,
              platform,
              imageUrl,
            });

            if (rotResult.success) {
              result.contentPublished++;
              result.contentGenerated++;
              result.imagesGenerated++;
              await clearPublishFailure(platform);
              result.posts.push({ platform, id: rotResult.externalId || "", status: "published" });
              result.details.push(`[${platform}] ${rotResult.publisher} OK: ${rotResult.externalId}`);

              await supabase.from("content_pieces").insert({
                campaign_id: campaign.id,
                title: content.hook,
                body: content.body,
                cta: content.cta,
                hashtags: content.hashtags || [],
                status: "PUBLISHED",
                platform,
                media_urls: [imageUrl],
                external_post_id: rotResult.externalId || "",
                published_at: Date.now(),
              });
            } else {
              await markPublishFailure(platform, rotResult.error || "rotación falló");
              result.details.push(`[${platform}] Rotación: ${rotResult.error}`);
            }
          } catch (e) {
            result.errors.push(`[rot-${platform}] ${e instanceof Error ? e.message : "error"}`);
          }
        }
      }
    }

    // AUTO-YOUTUBE: primero retoma renders pendientes; si no hay ninguno, arma uno nuevo.
    // El render corre en Shotstack (gratis) y se retoma en el siguiente ciclo: así nunca
    // se supera el timeout de 60s de Vercel.
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
            `[youtube] ${resumed.pending} render(s) en curso — se retoma en el próximo ciclo`
          );
        } else if ((await isVideoRenderBlocked(supabase)) && !(await checkFFmpeg())) {
          result.details.push(
            `[youtube] Video automático pausado (Shotstack sin créditos y sin ffmpeg local) — se reintenta solo`
          );
        } else {
          const quotaOk = await checkDailyQuota("youtube", supabase);
          if (!quotaOk) {
            result.details.push("[youtube] Cuota diaria alcanzada. Se retoma mañana.");
          }

          let startedThisCycle = 0;
          for (const campaign of campaigns) {
            if (!quotaOk || startedThisCycle >= 2) break;

            const ytPrompt = `Generá contenido para YouTube sobre: ${campaign.name}
Nichos: ${campaign.industry || "lotería/quinela"}
Público: ${campaign.target_audience || "gana-ganar a la quiniela de la ciudad (ex nacional)"}

Objetivo: promocionar la app https://quiniela-ia-two.vercel.app/ — incluila como CTA en la descripción.
Estilo: natural y realista (persona real, sin estética publicitaria forzada), formato reel/short.
Cada video debe usar un enfoque distinto al anterior (tema, hook y encuadre siempre nuevos).

Generá EXACTAMENTE en este formato JSON:
{
  "title": "Título llamativo para YouTube (max 100 caracteres, con emojis, termina con #Shorts)",
  "description": "Descripción completa con timestamps y el enlace https://quiniela-ia-two.vercel.app/ (min 200 caracteres)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "thumbnail_prompt": "Descripción de la imagen thumbnail para YouTube (natural, realista, relacionada a quiniela/app)"
}`;

            try {
              const response = await generateTextWithFallback(
                ytPrompt,
                "Sos un experto en YouTube SEO y optimización de videos. Español rioplatense. Respondé SOLO con el JSON, sin texto adicional."
              );

              const ytContent = parseJsonContent<{
                title?: string;
                description?: string;
                tags?: string[];
                thumbnail_prompt?: string;
              }>(response.text);

              if (!ytContent?.title) {
                result.details.push(
                  `[youtube] IA devolvió JSON sin "title" para ${campaign.name} — se reintenta en el próximo ciclo`
                );
                continue;
              }

              result.contentGenerated++;
              result.details.push(`[youtube] Contenido: ${ytContent.title}`);

              // Imágenes propias de la campaña primero (posts + frames del video).
              const ytOwnImages = imagesFor(campaign.id);
              let thumbnailUrl = ytOwnImages[0] || "";
              if (!thumbnailUrl) {
                try {
                  const thumb = await generateImageWithFallback(
                    ytContent.thumbnail_prompt ||
                      "YouTube thumbnail: quiniela lottery winning numbers with AI predictions, dramatic lighting, bold colors",
                    "16:9"
                  );
                  thumbnailUrl = await hostImagePublicly(thumb.url, "youtube");
                  result.imagesGenerated++;
                } catch {}
              }

              const started = await startYouTubeRender(supabase, {
                campaignId: campaign.id,
                title: ytContent.title,
                description:
                  ytContent.description + "\n\n" + (ytContent.tags || []).join(", "),
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
                  cta: "Suscribité y activá la campanita",
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
        result.details.push("[youtube] Token no disponible — saltando publicación YouTube");
      }
    } catch (e) {
      result.errors.push(`[youtube] ${e instanceof Error ? e.message : "error"}`);
    }

    // LIMPIEZA AUTOMÁTICA (al final: primero se publica, después se libera
    // espacio). Se ejecuta en proceso (sin HTTP interno) y cada ruta aplica su
    // propio throttling, así que casi nunca consume cuota de API.
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

    await supabase.from("notifications").insert({
      type: result.errors.length > 0 ? "warning" : "success",
      title: "Autopilot ejecutado",
      message: `Gen: ${result.contentGenerated} | Img: ${result.imagesGenerated} | Pub: ${result.contentPublished} | Err: ${result.errors.length} | Rot: ${providerStatus?.activeOrder.join("→") || "n/a"}`,
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
