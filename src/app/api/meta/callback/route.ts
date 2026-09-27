import { NextRequest, NextResponse } from "next/server";
import { getInstagramBusinessId, saveMetaTokens } from "@/lib/meta/graph";

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = "https://autopublicador-zeta.vercel.app/api/meta/callback";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "No code received" }, { status: 400 });
    }

    if (!APP_ID || !APP_SECRET) {
      return NextResponse.json({ error: "META_APP_ID / META_APP_SECRET missing" }, { status: 500 });
    }

    // Exchange code for short-lived user token
    const tokenUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${APP_ID}&` +
      `client_secret=${APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error.message }, { status: 400 });
    }

    const shortToken = tokenData.access_token;

    // Exchange for long-lived user token
    const longUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${APP_ID}&` +
      `client_secret=${APP_SECRET}&` +
      `fb_exchange_token=${shortToken}`;

    const longRes = await fetch(longUrl);
    const longData = await longRes.json();
    const userToken = longData.access_token || shortToken;

    // Get pages
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json({
        error: "No pages found. Make sure your Facebook user is admin of a page.",
        userToken,
        pages: [],
      }, { status: 404 });
    }

    const page = pagesData.data[0];
    const pageToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    // Get Instagram business ID
    const igId = await getInstagramBusinessId(pageId, pageToken);

    // Exchange page token for long-lived
    const pageLongUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${APP_ID}&` +
      `client_secret=${APP_SECRET}&` +
      `fb_exchange_token=${pageToken}`;
    const pageLongRes = await fetch(pageLongUrl);
    const pageLongData = await pageLongRes.json();
    const longPageToken = pageLongData.access_token || pageToken;

    await saveMetaTokens({
      pageId,
      pageAccessToken: longPageToken,
      instagramBusinessId: igId || undefined,
    });

    return NextResponse.json({
      success: true,
      pageId,
      pageName,
      instagramBusinessId: igId,
      saved: true,
      message:
        "Listo. Los tokens se guardaron automáticamente: Facebook e Instagram ya publican directo (sin redeploy).",
      env: {
        META_PAGE_ID: pageId,
        META_PAGE_ACCESS_TOKEN: longPageToken,
        META_INSTAGRAM_BUSINESS_ID: igId || "",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
