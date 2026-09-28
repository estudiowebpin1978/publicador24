import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const YOUTUBE_CLIENT_ID = "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com";
const REDIRECT_URI = "https://autopublicador-zeta.vercel.app/api/auth/youtube/callback";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // If we have a code, exchange it for a token
  if (code && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }).toString(),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        const supabase = getSupabaseAdmin();
        // No hay constraint único en (user_id, platform): limpiar filas viejas
        // para que tryGetSavedToken().single() no falle con "multiple rows".
        await supabase
          .from("social_accounts")
          .delete()
          .eq("platform", "youtube")
          .eq("user_id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("social_accounts").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          platform: "youtube",
          channel_name: "quiniela_ia_youtube",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          status: "active",
          updated_at: Date.now(),
          connected_at: Date.now(),
        });

        return NextResponse.redirect(
          "https://autopublicador-zeta.vercel.app/autopilot?youtube=connected&token_ready=true"
        );
      }

      console.error("YouTube token exchange failed:", tokenData);
      return NextResponse.redirect(
        "https://autopublicador-zeta.vercel.app/autopilot?youtube=error&details=token_exchange_failed"
      );
    } catch (error) {
      console.error("YouTube callback error:", error);
      return NextResponse.redirect(
        "https://autopublicador-zeta.vercel.app/autopilot?youtube=error&details=callback_exception"
      );
    }
  }

  // No code — redirect to Google OAuth
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline&state=dev`;
  return NextResponse.redirect(authUrl);
}
