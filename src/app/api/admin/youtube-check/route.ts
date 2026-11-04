import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from("social_accounts")
      .select("platform, user_id, channel_name, access_token, refresh_token, status, updated_at, connected_at")
      .eq("platform", "youtube");

    const info = (rows || []).map((r) => ({
      user_id: r.user_id,
      platform: r.platform,
      channel_name: r.channel_name,
      status: r.status,
      updated_at: r.updated_at,
      connected_at: r.connected_at,
      access_token_present: !!r.access_token && r.access_token !== "PENDING_EXCHANGE",
      access_token_len: typeof r.access_token === "string" ? r.access_token.length : 0,
      access_token_head: typeof r.access_token === "string" ? r.access_token.slice(0, 20) + "..." : "",
      refresh_token_present: !!r.refresh_token && r.refresh_token !== "" && r.refresh_token !== "PENDING_EXCHANGE",
      refresh_token_len: typeof r.refresh_token === "string" ? r.refresh_token.length : 0,
      refresh_token_head: typeof r.refresh_token === "string" ? r.refresh_token.slice(0, 20) + "..." : "",
    }));

    // Intentar refresh con lo que hay para ver error real
    let refreshResult = null;
    if (info.length > 0 && info[0].refresh_token_present) {
      const refreshToken = rows?.[0]?.refresh_token || "";
      if (refreshToken && refreshToken !== "PENDING_EXCHANGE") {
        try {
          const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com",
              client_secret: process.env.GOOGLE_CLIENT_SECRET || "MISSING_SECRET",
              refresh_token: refreshToken,
              grant_type: "refresh_token",
            }).toString(),
          });
          const data = await res.json();
          refreshResult = {
            ok: res.ok,
            status: res.status,
            has_access_token: !!data.access_token,
            error: data.error || null,
            error_description: data.error_description || null,
          };
        } catch (e) {
          refreshResult = { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      } else {
        refreshResult = { ok: false, error: "No refresh_token usable (vacío o PENDING_EXCHANGE)" };
      }
    } else {
      refreshResult = { ok: false, error: info.length === 0 ? "No hay fila youtube en social_accounts" : "No refresh_token presente" };
    }

    // Intentar tryGetSavedToken directamente
    const { tryGetSavedToken, isYouTubeTokenRevoked } = await import("@/lib/youtube");
    const token = await tryGetSavedToken().catch((e) => null);
    const revoked = await isYouTubeTokenRevoked().catch((e) => true);

    return NextResponse.json({
      youtube_rows: info,
      refresh_attempt: refreshResult,
      tryGetSavedToken_ok: !!token,
      tryGetSavedToken_head: token ? token.slice(0, 20) + "..." : null,
      token_revoked: revoked,
      message: revoked
        ? "Token revocado — re-autorizar en /api/auth/youtube/callback"
        : token
          ? "Token válido — YouTube puede publicar"
          : "No se pudo obtener token",
      auth_url: "https://autopublicador-zeta.vercel.app/api/auth/youtube/callback",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
