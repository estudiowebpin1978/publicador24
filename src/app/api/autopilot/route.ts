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
  posts: { platform: string; id: string; status: string }[];
}

// Anti-bot: random delay between posts (30-120 seconds)
function randomDelay(): Promise<void> {
  const min = 30000;
  const max = 120000;
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Generate unique image prompt per post
function generateImagePrompt(content: { hook: string; body: string }, campaignName: string): string {
  const themes = [
    "futuristic neon lights, digital numbers floating, dark background, vibrant purple and cyan glow",
    "abstract data visualization, flowing graphs, modern tech aesthetic, deep blue and violet tones",
    "geometric patterns with lottery balls, mathematical formulas, sleek modern design, purple gradient",
    "artificial intelligence brain, neural networks, data streams, cyberpunk style, electric blue and magenta",
    "crystal ball with digital numbers, predictive analytics visualization, mystical tech fusion, violet glow",
    "holographic display showing statistics, probability charts, sci-fi interface, purple and teal",
    "matrix-style falling numbers, probability distribution, digital rain effect, neon purple",
    "modern dashboard with charts, data analytics interface, clean design, violet accent colors",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  return `${campaignName} social media post, ${theme}, professional marketing image, high quality, no text`;
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
      const prompt = `Generá una publicación de redes sociales para Instagram/TikTok/Facebook.
Campaña: ${campaign.name}
Nicho: ${campaign.industry || campaign.description || "general"}
Público: ${campaign.target_audience || "general argentino"}

Generá EXACTAMENTE en este formato JSON (sin texto adicional):
{
  "hook": "Frase gancho de máximo 10 palabras",
  "body": "Cuerpo del post de 2-3 oraciones en español rioplatense",
  "cta": "Call to action con URL quiniela-ia-two.vercel.app",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;

      try {
        // 3a. Generate text content
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
        result.details.push(`Contenido generado: ${content.hook}`);

        // 3b. Generate unique AI image
        let imageUrl = "";
        try {
          const imagePrompt = generateImagePrompt(content, campaign.name);
          const image = await generateImageWithFallback(imagePrompt, "1:1");
          imageUrl = image.url;
          result.imagesGenerated++;
          result.details.push(`Imagen generada: ${image.provider}`);
        } catch (e) {
          result.errors.push(`Imagen: ${e instanceof Error ? e.message : "error"}`);
          // Fallback to a random static image
          const fallbackImages = [
            "quiniela-matematica.png",
            "quiniela-patron.png",
            "quiniela-metodo.png",
            "quiniela-factores.png",
            "quiniela-datos.png",
          ];
          imageUrl = `https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;
        }

        // 3c. Publish to each channel with delays
        for (let i = 0; i < channels.length; i++) {
          const channel = channels[i];

          // Anti-bot delay between channels (skip for first post)
          if (i > 0 || result.contentPublished > 0) {
            const delayMs = Math.floor(Math.random() * 90000) + 30000; // 30-120 seconds
            result.details.push(`Esperando ${Math.round(delayMs / 1000)}s antes de publicar en ${channel.service}...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          try {
            let metadata = {};
            let schedulingType: "automatic" | "notification" = "automatic";

            if (channel.service === "instagram") {
              metadata = { instagram: { type: "post", shouldShareToFeed: true } };
            } else if (channel.service === "facebook") {
              metadata = { facebook: { type: "post" } };
              schedulingType = "notification";
            }

            const text = `${content.hook}\n\n${content.body}\n\n${content.cta}\n\n${(content.hashtags || []).join(" ")}`;

            const post = await createBufferPost({
              channelId: channel.id,
              text,
              schedulingType,
              mode: "addToQueue",
              metadata,
              assets: imageUrl ? [{ image: { url: imageUrl } }] : undefined,
            });

            result.contentPublished++;
            result.posts.push({ platform: channel.service, id: post.id, status: post.status });
            result.details.push(`Publicado en ${channel.service} (${channel.displayName})`);

            // Save to Supabase
            const { data: cp } = await supabase.from("content_pieces").insert({
              campaign_id: campaign.id,
              title: content.hook,
              body: content.body,
              cta: content.cta,
              hashtags: content.hashtags || [],
              status: "PUBLISHED",
              platform: channel.service,
              media_urls: imageUrl ? [imageUrl] : [],
              external_post_id: post.id,
              published_at: Date.now(),
            }).select("id").single();

            if (cp) {
              await supabase.from("scheduled_posts").insert({
                campaign_id: campaign.id,
                content_piece_id: cp.id,
                platform: channel.service,
                channel_id: channel.id,
                status: "pending",
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
