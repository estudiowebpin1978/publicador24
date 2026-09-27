import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createYouTubeVideo, tryGetSavedToken } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // 1. Try saved token (with auto-refresh if expired)
    let accessToken = await tryGetSavedToken();

    // 2. If no saved token, try code exchange
    if (!accessToken && body.code && process.env.GOOGLE_CLIENT_SECRET) {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: body.code,
          client_id: "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com",
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: "https://autopublicador-zeta.vercel.app/api/auth/youtube/callback",
          grant_type: "authorization_code",
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        accessToken = tokenData.access_token;
        await supabase.from("social_accounts").upsert({
          user_id: "00000000-0000-0000-0000-000000000000",
          platform: "youtube",
          channel_name: "quiniela_ia_youtube",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          status: "active",
          updated_at: Date.now(),
        });
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "YouTube token expirado o no encontrado. Re-autorizá en: https://autopublicador-zeta.vercel.app/api/auth/youtube/callback",
          authorized: false,
        },
        { status: 401 }
      );
    }

    // 3. Get channel info
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    let channelName = "Unknown";
    if (channelRes.ok) {
      const channelData = await channelRes.json();
      channelName = channelData.items?.[0]?.snippet?.title || "Unknown";
    }

    // 4. Create video
    const videoUrl = body.videoUrl || body.assetUrl || "";
    if (!videoUrl) {
      return NextResponse.json(
        {
          error:
            "Falta videoUrl: esta ruta sube un video que ya existe. Para video automático usá /api/autopilot (cola de renders con Shotstack).",
          authorized: true,
          channel: channelName,
        },
        { status: 400 }
      );
    }

    const result = await createYouTubeVideo(
      body.title || "Quiniela IA - Predicciones de la quiniela nacional",
      body.description || "Aumentá tus chances de ganar con datos reales. Visita https://quiniela-ia-two.vercel.app/",
      videoUrl,
      accessToken
    );

    if (result.error || !result.videoId) {
      return NextResponse.json(
        { ...result, authorized: true, channel: channelName },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...result,
      authorized: true,
      channel: channelName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
