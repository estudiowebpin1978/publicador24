import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { generateImageWithFallback } from "@/lib/ai/multi-image";
import { getTodayCost } from "@/lib/ai/cost-tracker";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  safetyChecks: number;
  errors: string[];
  details: string[];
}

async function callBuffer(endpoint: string, options?: RequestInit) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey || apiKey === "tu-key-aqui" || apiKey === "your-buffer-api-key") {
    throw new Error("BUFFER NOT CONFIGURED");
  }

  const res = await fetch(`https://api.buffer.com/1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("BUFFER_RATE_LIMIT");
    throw new Error(`Buffer HTTP ${res.status}`);
  }

  return res.json();
}

async function getBufferChannels() {
  const data = await callBuffer("/profiles.json");
  const profiles = data || [];
  return profiles.filter(
    (p: { service: string; schedule_status: string }) =>
      p.service === "instagram" || p.service === "tiktok" || p.service === "facebook"
  );
}

async function publishToBuffer(text: string, profileId: string, media?: { photo?: string }, platform?: string) {
  const body: Record<string, unknown> = {
    profile_ids: [profileId],
    text,
    now: false,
  };

  if (media) {
    body.media = media;
  }

  const result = await callBuffer("/updates/create.json", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result;
}

async function loadCampaignContent(projectId?: string) {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("campaigns")
      .select("id, name, description, objective, target_audience, platforms")
      .eq("status", "active")
      .limit(1);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: campaigns } = await query;
    if (!campaigns?.length) return null;

    const campaign = campaigns[0];
    const { data: pieces } = await supabase
      .from("content_pieces")
      .select("id, hook, body, cta, hashtags, content_type, platform")
      .eq("campaign_id", campaign.id)
      .eq("status", "draft")
      .limit(5);

    return { campaign, pieces: pieces || [] };
  } catch {
    return null;
  }
}

export async function POST(_request: NextRequest) {
  const result: LoopResult = {
    timestamp: Date.now(),
    contentGenerated: 0,
    contentPublished: 0,
    safetyChecks: 0,
    errors: [],
    details: [],
  };

  try {
    let channels: { id: string; service: string; name: string }[] = [];
    try {
      channels = await getBufferChannels();
      result.details.push(`Buffer: ${channels.length} channels connected`);
    } catch (e) {
      result.errors.push(`Buffer: ${e instanceof Error ? e.message : "connection failed"}`);
      return NextResponse.json(result);
    }

    if (channels.length === 0) {
      result.errors.push("No active Buffer channels found");
      return NextResponse.json(result);
    }

    const campaignContent = await loadCampaignContent();

    for (let i = 0; i < Math.min(channels.length, 3); i++) {
      const channel = channels[i];
      let hook = "";
      let caption = "";
      let hashtags: string[] = [];

      if (campaignContent && campaignContent.pieces.length > 0) {
        const piece = campaignContent.pieces[i % campaignContent.pieces.length];
        hook = piece.hook || "";
        caption = piece.body || "";
        hashtags = piece.hashtags || [];
      } else {
        try {
          const aiResult = await generateTextWithFallback(
            `Generá un contenido corto para ${channel.service} sobre: ${campaignContent?.campaign?.description || 'un negocio genérico'}. Objetivo: ${campaignContent?.campaign?.objective || 'generar demanda'}. Respondé JSON: { "hook": "...", "caption": "...", "hashtags": ["#tag1"] }`,
            "Sos un copywriter experto. Español rioplatense. JSON válido."
          );
          const match = aiResult.text.match(/```json\s*([\s\S]*?)```/);
          const parsed = JSON.parse(match ? match[1] : aiResult.text);
          hook = parsed.hook || "Contenido generado automáticamente";
          caption = parsed.caption || "";
          hashtags = parsed.hashtags || [];
        } catch {
          hook = "Contenido generado automáticamente";
          caption = "Publicación generada por Publicador24";
          hashtags = [];
        }
      }

      const safety = await checkPublicationSafety(`auto-${i}`, hook, caption, channel.service);
      result.safetyChecks++;

      if (!safety.approved) {
        result.details.push(`Blocked: ${hook.substring(0, 40)}... — ${safety.reason}`);
        continue;
      }

      const hashtagStr = hashtags.length ? "\n\n" + hashtags.join(" ") : "";
      const text = `${hook}\n\n${caption}${hashtagStr}`;

      let media: { photo?: string } | undefined;
      try {
        const imageResult = await generateImageWithFallback(`${hook}, ${channel.service}, social media`, "1:1");
        if (imageResult.url) media = { photo: imageResult.url };
      } catch {
        // Image generation is best-effort
      }

      try {
        const postResult = await publishToBuffer(text, channel.id, media, channel.service);
        if (postResult?.success || postResult?.updates?.[0]?.id) {
          result.contentPublished++;
          result.details.push(`Published: ${hook.substring(0, 40)}... → ${channel.name}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        if (msg.includes("RATE_LIMIT")) {
          result.errors.push("Buffer rate limited — stopping");
          break;
        }
        result.errors.push(`Publish: ${msg}`);
      }
    }

    result.details.push(`Cost today: $${getTodayCost().totalCost.toFixed(4)} | ${getTodayCost().totalTokens} tokens`);

    return NextResponse.json(result);
  } catch (error) {
    result.errors.push(`Fatal: ${error instanceof Error ? error.message : "unknown"}`);
    return NextResponse.json(result, { status: 500 });
  }
}

