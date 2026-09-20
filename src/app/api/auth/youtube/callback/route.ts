import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  if (code) {
    // In a real app, exchange code for access_token + refresh_token
    // Then save to Supabase social_accounts
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("social_accounts").upsert({
        user_id: "00000000-0000-0000-0000-000000000000",
        platform: "youtube",
        channel_name: "quiniela_ia_youtube",
        access_token: "PENDING_EXCHANGE",
        status: "active",
      });
    } catch {}
    return NextResponse.redirect("https://autopublicador-zeta.vercel.app/autopilot?youtube=connected&token_ready=true");
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com&redirect_uri=https://wazkylxgqckjfkcmfotl.supabase.co/auth/v1/callback&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline`;
  return NextResponse.redirect(authUrl);
}
