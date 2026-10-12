// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildPostPrompt, buildImagePrompt, ensureSiteUrl, COPYWRITER_SYSTEM, isLotteryCampaign, AUDIENCE_CONTEXT } from "@/lib/ai/copywriter";
import { normalizePostContent, parseJsonContent, salvageJsonFields } from "@/lib/ai/json-content";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { buildTikTokVideo, selectTikTokFrames } from "@/lib/video/tiktok-video";
import { hostImagePublicly, normalizeImageForMeta } from "@/lib/media-hosting";
import { publishWithRotation, getProviderStatus } from "@/lib/publisher/rotation";
import { getCampaignImages, pickCampaignImage } from "@/lib/campaign-images";
import { canPublishToFacebook, isMetaConfiguredAsync } from "@/lib/meta/graph";
import { humanDelay, getDailyPostLimit, checkDailyQuota, pickHumanTimeSlot, humanizeText } from "@/lib/anti-bot";

export const maxDuration = 300;

function secs(ms: number): string { return (ms / 1000).toFixed(1) + "s"; }

export async function POST(request?: NextRequest) {
  const tStart = Date.now();
  const supabase = getSupabaseAdmin();
  const result = {
    status: "autopilot",
    cycleStarted: new Date().toISOString(),
    contentPublished: 0,
    contentGenerated: 0,
    imagesGenerated: 0,
    duplicatesBlocked: 0,
    claimsBlocked: 0,
    details: [] as string[],
    posts: [] as { platform: string; id: string; status: string }[],
    errors: [] as string[],
  };

  try {
    const campaignsData = await supabase
      .from("campaigns")
      .select("id, name, url, platforms, status, idea, description")
      .eq("status", "ACTIVE");
    const campaigns = campaignsData.data || [];
    if (campaigns.length === 0) {
      result.details.push("[autopilot] Sin campañas activas");
      return NextResponse.json(result, { status: 200 });
    }

    const metaCanFacebook = await canPublishToFacebook();
    if (!metaCanFacebook) result.details.push("[facebook] Sin permiso pages_manage_posts — se omite");

    // Distribución inteligente con cuotas seguras
    const rotationPlan: { platform: string; max: number }[] = [
      { platform: "tiktok", max: 3 },
      { platform: "instagram", max: 2 },
      ...(metaCanFacebook ? [{ platform: "facebook", max: 1 }] : []),
    ];
    let tiktokDone = 0, instagramDone = 0, facebookDone = 0;
    const rotationDeadline = Date.now() + 225_000;
    const MIN_REMAINING_MS = 45_000;
    let outOfTime = false;

    for (const rot of rotationPlan) {
      const platform = rot.platform;
      if (platform === "tiktok" && tiktokDone >= rot.max) continue;
      if (platform === "instagram" && instagramDone >= rot.max) continue;
      if (platform === "facebook" && facebookDone >= rot.max) continue;
      if (outOfTime) break;

      const providerStatus = await getProviderStatus();
      const canMeta = (platform === "facebook" || platform === "instagram") && providerStatus.meta === "configured";
      const canBp = providerStatus.bulkpublish === "ok";
      if (!canMeta && !canBp) {
        result.details.push(`[${platform}] Sin proveedores libres`);
        continue;
      }

      const quotaOk = await checkDailyQuota(platform, supabase, { direct: canMeta });
      if (!quotaOk) { result.details.push(`[${platform}] Cuota diaria alcanzada.`); continue; }
      if (Date.now() + MIN_REMAINING_MS > rotationDeadline) {
        outOfTime = true; result.details.push(`[${platform}] Sin tiempo — se publica en el próximo ciclo`); break;
      }

      for (const campaign of campaigns) {
        if (outOfTime) break;
        if (platform === "tiktok" && tiktokDone >= rot.max) break;
        if (platform === "instagram" && instagramDone >= rot.max) break;
        if (platform === "facebook" && facebookDone >= rot.max) break;

        await humanDelay("between_platforms");

        const prompt = buildPostPrompt(platform, { id: (campaign.id as string) || "", name: (campaign.name as string) || "", url: (campaign.url as string) || "https://quiniela-ia-two.vercel.app/", idea: (campaign.idea as string) || "", description: (campaign.description as string) || "", platforms: (campaign.platforms as string[]) || [] });
        const aiResp = await generateTextWithFallback(prompt, COPYWRITER_SYSTEM);

        let content: { hook?: string; body?: string; caption?: string; cta?: string; hashtags?: string[] } | null = null;
        try {
          const parsed = parseJsonContent(aiResp.text || "{}");
          content = normalizePostContent(parsed);
        } catch { content = null; }

        if (!content || !(content.hook || content.body || content.cta)) {
          result.details.push(`[${platform}] IA sin hook — se omite`);
          continue;
        }

        // Imagen: usa las de la campaña primero, luego genera con los nuevos estilos
        const imagesFor = await getCampaignImages((campaign.id as string) || "");
        const ownImage = pickCampaignImage(imagesFor);
        let imageUrl = ownImage || (await generateImageWithFallback(buildImagePrompt(platform, { id: (campaign.id as string) || "", name: (campaign.name as string) || "", url: (campaign.url as string) || "", idea: (campaign.idea as string) || "", description: (campaign.description as string) || "", platforms: (campaign.platforms as string[]) || [] }) || "", "1:1"));
        if (!ownImage && imageUrl) result.imagesGenerated++;

        let finalImageUrl = imageUrl;
        if (imageUrl && (platform === "instagram" || platform === "facebook")) {
          try { finalImageUrl = await normalizeImageForMeta(imageUrl, `${platform}-post`); } catch { finalImageUrl = imageUrl; }
        }

        // TikTok: requiere video real (no imagen estática)
        let videoUrl = "";
        if (platform === "tiktok") {
          const frames = selectTikTokFrames(ownImage || "", imageUrl, imagesFor);
          const video = await buildTikTokVideo({ images: frames, audioText: content.hook || "" });
          videoUrl = video.url;
          result.details.push(videoUrl ? `[tiktok] Video generado (${video.frames} frames / ${video.seconds}s)` : `[tiktok] Sin video (${video.error || ""}) — se omite`);
          if (!videoUrl) continue;
        }

        const textContent = `${content.hook || ""}\n\n${content.body || ""}\n\n${content.cta || ""}`.trim();
        const siteUrl = (campaign.url as string) || "https://quiniela-ia-two.vercel.app/";
        const textWithSite = ensureSiteUrl(textContent, { id: (campaign.id as string) || "", name: (campaign.name as string) || "", url: siteUrl });
        const humanText = humanizeText(textWithSite);

        const rotResult = await publishWithRotation({
          text: humanText,
          platform,
          ...(videoUrl ? { videoUrl } : {}),
          ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
        });

        if (platform === "tiktok") tiktokDone++;
        else if (platform === "instagram") instagramDone++;
        else if (platform === "facebook") facebookDone++;

        if (rotResult.success) {
          result.contentPublished++;
          result.contentGenerated++;
          result.posts.push({ platform, id: rotResult.externalId || "", status: "published" });
          result.details.push(`[${platform}] ${rotResult.publisher} OK`);
          await supabase.from("content_pieces").insert({
            campaign_id: (campaign.id as string) || "",
            title: content.hook || content.caption || content.text || "",
            hook: content.hook || content.caption || "",
            body: content.body || "",
            cta: content.cta || "",
            hashtags: content.hashtags || [],
            status: "PUBLISHED",
            platform,
            media_urls: videoUrl ? [videoUrl] : imageUrl ? [imageUrl] : [],
            external_post_id: rotResult.externalId || "",
            published_at: Date.now(),
          });
        } else {
          result.details.push(`[${platform}] Rotación: ${rotResult.error || "falló"}`);
        }
      }
    }
  } catch (e) {
    result.errors.push(`[autopilot] ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({ ...result, durationMs: Date.now() - tStart });
}

