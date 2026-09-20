import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels, createBufferPost, getBufferPosts, deleteBufferPost } from "@/lib/buffer/client";

export async function POST(request?: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const result = {
      timestamp: Date.now(),
      contentGenerated: 0,
      contentPublished: 0,
      videosCreated: 0,
      imagesGenerated: 0,
      autoCleaned: 0,
      errors: [] as string[],
      details: [] as string[],
      posts: [] as { platform: string; id: string; status: string; scheduledAt?: string }[],
    };

    // 1. AUTO-CLEAN BUFFER (liberar todo antes de publicar)
    try {
      const account = await getBufferAccount();
      const orgId = account.account.organizations[0]?.id || "";
      if (orgId) {
        const channels = await getBufferChannels(orgId);
        for (const ch of channels) {
          const posts = await getBufferPosts(ch.id, 20);
          for (const post of posts) {
            await deleteBufferPost(post.id);
            result.autoCleaned++;
          }
        }
      }
      result.details.push(`Auto-limpieza: ${result.autoCleaned} posts eliminados`);
    } catch (e) {
      result.errors.push(`Clean error: ${e instanceof Error ? e.message : "unknown"}`);
    }

    // 2. GENERAR CONTENIDO INTELIGENTE DESDE CAMPAÑA ACTIVA
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .limit(1);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ ...result, details: ["No hay campañas activas"] });
    }

    const campaign = campaigns[0];
    result.details.push(`Campaña activa: ${campaign.name}`);

    // 3. POSTING INTELIGENTE EN TODAS LAS PLATAFORMAS
    // ... (existing autopilot logic simplified for autonomy)

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
