import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Check for saved YouTube token in DB (from previous authorization)
    const { data: youtubeAccount } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", "youtube")
      .single();

    if (!youtubeAccount?.access_token) {
      // Try to use Client Secret for token exchange (if code provided)
      const code = body.code || process.env.YOUTUBE_CODE;
      if (code && process.env.GOOGLE_CLIENT_SECRET) {
        // Exchange code for access token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: code,
            client_id: "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com",
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: "https://wazkylxgqckjfkcmfotl.supabase.co/auth/v1/callback",
            grant_type: "authorization_code",
          }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          // Save token to DB for future automatic use
          await supabase.from("social_accounts").upsert({
            user_id: "00000000-0000-0000-0000-000000000000",
            platform: "youtube",
            channel_name: "quiniela_ia_youtube",
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || "",
            status: "active",
            updated_at: Date.now(),
          });
          return NextResponse.json({ success: true, videoId: null, message: "YouTube authorized and token saved" });
        }
      }
      return NextResponse.json({ error: "YouTube access token required. Authorize with: https://autopublicador-zeta.vercel.app/api/auth/youtube/callback" }, { status: 400 });
    }

    // Now create video with saved token
    const { createYouTubeVideo } = await import("@/lib/youtube");
    const result = await createYouTubeVideo(
      body.title || "Quiniela IA - Predicciones de la quiniela nacional",
      body.description || "Aumentá tus chances de ganar con datos reales. Visita https://quiniela-ia-two.vercel.app/",
      body.videoUrl || body.assetUrl,
      youtubeAccount.access_token
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
