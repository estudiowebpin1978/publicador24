import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  if (code) {
    // Exchange code for tokens (would need client secret in real app)
    return NextResponse.redirect("https://autopublicador-zeta.vercel.app/autopilot?youtube=connected");
  }
  
  // Initiate auth
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com&redirect_uri=https://wazkylxgqckjfkcmfotl.supabase.co/auth/v1/callback&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline`;
  return NextResponse.redirect(authUrl);
}
