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
  posts: { platform: string; id: string; status: string }[];
}

export async function POST(request?: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const result: LoopResult = {
      timestamp: Date.now(),
      contentGenerated: 0,
      contentPublished: 0,
      errors: [],
      details: [],
      posts: [],
    };

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .limit(5);

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
      const prompt = `Generá una publicación de redes sociales para Instagram/TikTok/Facebook.
Campaña: ${campaign.name}
Nicho: ${campaign.industry || campaign.description || "general"}
Público: ${campaign.target_audience || "general argentino"}
Plataformas: ${campaign.platforms?.join(", ") || "todas"}

Generá EXACTAMENTE en este formato JSON (sin texto adicional):
{
  "hook": "Frase gancho de máximo 10 palabras",
  "body": "Cuerpo del post de 2-3 oraciones en español rioplatense",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

      try {
        const response = await generateTextWithFallback(
          prompt,
          "Sos un experto en marketing digital argentino. Generás contenido viral para redes sociales. Español rioplatense. Respondé SOLO con el JSON, sin texto adicional."
        );

        let content;
        try {
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          content = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          content = null;
        }

        if (!content || !content.hook) {
          result.errors.push(`IA no generó contenido válido para: ${campaign.name}`);
          continue;
        }

        result.contentGenerated++;
        result.details.push(`Contenido generado: ${content.hook}`);;

        const images = [
          "quiniela-matematica.png",
          "quiniela-patron.png",
          "quiniela-metodo.png",
          "quiniela-factores.png",
          "quiniela-datos.png",
        ];
        const randomImage = images[Math.floor(Math.random() * images.length)];
        const imageUrl = `https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/${randomImage}`;

        const text = `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}`;

        for (const channel of channels) {
          try {
            let metadata = {};
            let schedulingType: "automatic" | "notification" = "automatic";
            if (channel.service === "instagram") {
              metadata = { instagram: { type: "post", shouldShareToFeed: true } };
            } else if (channel.service === "facebook") {
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
            result.posts.push({ platform: channel.service, id: post.id, status: post.status });
            result.details.push(`Publicado en ${channel.service} (${channel.displayName})`);

            const { data: cp } = await supabase.from("content_pieces").insert({
              campaign_id: campaign.id,
              title: content.hook,
              body: content.body,
              cta: content.cta,
              hashtags: content.hashtags || [],
              status: "PUBLISHED",
              platform: channel.service,
              media_urls: [imageUrl],
              external_post_id: post.id,
              published_at: Date.now(),
            }).select("id").single();

            if (cp) {
              await supabase.from("scheduled_posts").insert({
                campaign_id: campaign.id,
                content_piece_id: cp.id,
                platform: channel.service,
                channel_id: channel.id,
                status: "scheduled",
                scheduled_at: Date.now(),
                external_post_id: post.id,
              });
            }
          } catch (e) {
            result.errors.push(`${channel.service}: ${e instanceof Error ? e.message : "error"}`);
          }
        }
      } catch (e) {
        result.errors.push(`IA ${campaign.name}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    await supabase.from("notifications").insert({
      type: result.errors.length > 0 ? "warning" : "success",
      title: "Autopilot ejecutado",
      message: `Generados: ${result.contentGenerated} | Publicados: ${result.contentPublished} | Errores: ${result.errors.length}`,
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
