import { NextRequest, NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai/multi-provider";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, type BufferChannel } from "@/lib/buffer/client";

interface LoopResult {
  timestamp: number;
  contentGenerated: number;
  contentPublished: number;
  errors: string[];
  details: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const result: LoopResult = {
      timestamp: Date.now(),
      contentGenerated: 0,
      contentPublished: 0,
      errors: [],
      details: [],
    };

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .limit(5);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No active campaigns found"] });
    }

    let channels: BufferChannel[] = [];
    try {
      const account = await getBufferAccount();
      const orgId = account.account.organizations[0]?.id;
      if (orgId) {
        channels = await getBufferChannels(orgId);
      }
    } catch (e) {
      result.errors.push(`Buffer connection failed: ${e instanceof Error ? e.message : "unknown"}`);
    }

    for (const campaign of campaigns) {
      const prompt = `Generá una publicación de redes sociales para la campaña "${campaign.name}". 
      Nicho: ${campaign.niche || "general"}
      Objetivo: ${campaign.objective || "engagement"}
      Plataformas: ${campaign.platforms?.join(", ") || "todas"}
      
      Generá: 1 hook impactante, 1 cuerpo de texto, 1 call to action, y 5 hashtags relevantes.
      Respondé en formato JSON: { "hook": "...", "body": "...", "cta": "...", "hashtags": ["..."] }`;

      try {
        const response = await generateTextWithFallback(prompt, {
          systemPrompt: "Sos un experto en marketing digital y redes sociales argentino. Generá contenido en español rioplatense.",
          maxTokens: 500,
        });

        let content;
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          content = jsonMatch ? JSON.parse(jsonMatch[0]) : { hook: response.slice(0, 100), body: response, cta: "¡Descubrí más!", hashtags: [] };
        } catch {
          content = { hook: response.slice(0, 100), body: response, cta: "¡Descubrí más!", hashtags: [] };
        }

        result.contentGenerated++;
        result.details.push(`Generated content for campaign: ${campaign.name}`);

        const { error: insertError } = await supabase.from("content_pieces").insert({
          campaign_id: campaign.id,
          project_id: campaign.project_id,
          platform: campaign.platforms?.[0] || "instagram",
          content_type: "educational",
          hook: content.hook,
          body: content.body,
          cta: content.cta,
          hashtags: content.hashtags || [],
          status: "generated",
          score: 75,
          created_at: Date.now(),
        });

        if (insertError) {
          result.errors.push(`DB insert failed: ${insertError.message}`);
        }

        for (const channel of channels) {
          const platformMap: Record<string, string> = {
            instagram: "instagram",
            facebook: "facebook",
            tiktok: "tiktok",
          };

          if (platformMap[channel.service] && campaign.platforms?.includes(channel.service)) {
            try {
              const text = `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${content.hashtags?.join(" ") || ""}`;
              const post = await createBufferPost({
                channelId: channel.id,
                text,
                schedulingType: "addnow",
              });

              result.contentPublished++;
              result.details.push(`Published to ${channel.service} (${channel.displayName}): ${post.id}`);

              await supabase.from("scheduled_posts").insert({
                campaign_id: campaign.id,
                content_piece_id: null,
                platform: channel.service,
                channel_id: channel.id,
                status: "published",
                scheduled_at: Date.now(),
                published_at: Date.now(),
                buffer_post_id: post.id,
              });
            } catch (e) {
              result.errors.push(`Publish to ${channel.service} failed: ${e instanceof Error ? e.message : "unknown"}`);
            }
          }
        }
      } catch (e) {
        result.errors.push(`Content generation failed for ${campaign.name}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
