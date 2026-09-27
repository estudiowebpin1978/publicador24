import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = "https://autopublicador-zeta.vercel.app/api/meta/callback";
const SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_show_list",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const step = searchParams.get("step");

    if (!APP_ID || !APP_SECRET) {
      return NextResponse.json({ error: "META_APP_ID / META_APP_SECRET no configurados" }, { status: 500 });
    }

    if (step === "token") {
      const debugToken = `https://graph.facebook.com/v21.0/debug_token?input_token=${searchParams.get("t")}&access_token=${APP_ID}|${APP_SECRET}`;
      const res = await fetch(debugToken);
      const data = await res.json();
      return NextResponse.json(data);
    }

    const authUrl =
      `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${APP_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${SCOPES}&` +
      `response_type=code`;

    return NextResponse.json({
      authUrl,
      redirectUri: REDIRECT_URI,
      scopes: SCOPES,
      instructions: "Abrí authUrl en el navegador, autorizá con tu cuenta de Facebook que administra la página",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
