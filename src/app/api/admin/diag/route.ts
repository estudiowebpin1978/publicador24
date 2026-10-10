import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Diagnóstico operativo (protegido con CRON_SECRET): por qué TikTok/YouTube no
 * publican. Devuelve backoff activo, token de YouTube, estado de Shotstack y,
 * opcionalmente, un test real (draft + delete) contra BulkPublish para ver el
 * error exacto que devuelve la API.
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  return auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

function mask(token: unknown): { present: boolean; len: number; head: string } {
  const s = typeof token === "string" ? token : "";
  return { present: !!s, len: s.length, head: s.slice(0, 12) };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const out: Record<string, unknown> = {};

  // 1. Backoff activo (motivo completo, truncado a 300 por el propio writer)
  try {
    const { data } = await supabase
      .from("social_accounts")
      .select("platform, access_token, updated_at")
      .eq("platform", "publish_failure")
      .limit(10);
    const failures: Record<string, unknown> = {};
    for (const row of data || []) {
      try {
        Object.assign(failures, JSON.parse(row.access_token || "{}"));
      } catch {}
    }
    const now = Date.now();
    out.backoff = Object.fromEntries(
      Object.entries(failures).map(([k, v]) => [
        k,
        {
          ...(v as object),
          active: (v as { until?: number }).until ? (v as { until: number }).until > now : false,
          remainingMin: (v as { until?: number }).until
            ? Math.round(((v as { until: number }).until - now) / 60000)
            : 0,
        },
      ])
    );
  } catch (e) {
    out.backoff = { error: e instanceof Error ? e.message : "error" };
  }

  // 2. Token de YouTube
  try {
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token, refresh_token, status, updated_at")
      .eq("platform", "youtube")
      .limit(5);
    out.youtube = (data || []).map((r) => ({
      status: r.status,
      updated_at: r.updated_at,
      access: mask(r.access_token),
      refresh: mask(r.refresh_token),
      pending: r.access_token === "PENDING_EXCHANGE",
    }));
    // ¿Está vivo el token? (misma prueba que hace tryGetSavedToken)
    const row = (data || [])[0];
    if (row?.access_token && row.access_token !== "PENDING_EXCHANGE") {
      const test = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        { headers: { Authorization: `Bearer ${row.access_token}` } }
      ).catch(() => null);
      out.youtubeTokenTest = test
        ? { ok: test.ok, status: test.status, body: test.ok ? "ok" : (await test.text()).slice(0, 200) }
        : { ok: false, error: "fetch failed" };
    } else {
      out.youtubeTokenTest = { ok: false, error: "sin access_token utilizable" };
    }
  } catch (e) {
    out.youtube = { error: e instanceof Error ? e.message : "error" };
  }

  // 3. Shotstack (bloqueo por créditos)
  try {
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token, updated_at")
      .eq("platform", "shotstack_status")
      .limit(1);
    out.shotstack = data?.[0] ? { state: data[0].access_token, updated_at: data[0].updated_at } : null;
  } catch (e) {
    out.shotstack = { error: e instanceof Error ? e.message : "error" };
  }

  // 4. Estado de rate limit persistido de BulkPublish
  try {
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token, updated_at")
      .eq("platform", "bulkpublish_rate_limit")
      .limit(5);
    const now = Date.now();
    out.bulkpublishRL = (data || []).map((r) => {
      let until = 0;
      try { until = JSON.parse(r.access_token || "{}").until || 0; } catch {}
      return { until, active: until > now, remainingMin: Math.round((until - now) / 60000), updated_at: r.updated_at };
    });
  } catch (e) {
    out.bulkpublishRL = { error: e instanceof Error ? e.message : "error" };
  }

  // 8. Liberar bloqueos tras corregir la causa raíz, sin esperar a que venzan:
  //    ?clear=tiktok (backoff de publicación) y ?clear=bulkpublish (rate limit
  //    persistido de BulkPublish, que corta hasta medianoche UTC).
  const url = new URL(request.url);

  const clear = url.searchParams.get("clear");
  if (clear) {
    const cleared: Record<string, unknown> = {};
    const targets =
      clear === "all" ? ["tiktok", "instagram", "youtube", "facebook"] : [clear];
    for (const target of targets) {
      try {
        const { clearPublishFailure } = await import("@/lib/publisher/failure-backoff");
        await clearPublishFailure(target);
        cleared[target] = true;
      } catch (e) {
        cleared[target] = { error: e instanceof Error ? e.message : "error" };
      }
    }
    if (clear === "bulkpublish" || clear === "all") {
      try {
        const { resetRateLimit } = await import("@/lib/bulkpublish/client");
        resetRateLimit();
        cleared.bulkpublishRateLimit = true;
      } catch (e) {
        cleared.bulkpublishRateLimit = { error: e instanceof Error ? e.message : "error" };
      }
    }
    // El bloqueo de Buffer (30 min) tambien se persiste en Supabase: sin
    // limpiarlo, clear=all dejaba a Buffer bloqueado y ni siquiera se podian
    // listar los canales para ver por donde publica cada plataforma.
    if (clear === "buffer" || clear === "all") {
      try {
        const { clearRateLimit } = await import("@/lib/buffer/rate-limit");
        clearRateLimit();
        cleared.bufferRateLimit = true;
      } catch (e) {
        cleared.bufferRateLimit = { error: e instanceof Error ? e.message : "error" };
      }
    }
    out.cleared = cleared;
  }

  // 5b. Test de render (?test=render): arma el reel de TikTok con ffmpeg en
  //     este runtime y sube el mp4 a Supabase Storage. Verifica ffmpeg + storage
  //     en prod y deja una URL de video para probar la publicación real.
  if (url.searchParams.get("test") === "render") {
    try {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("status", "ACTIVE")
        .limit(1);
      const campaignId = campaigns?.[0]?.id || "";
      const { getAllCampaignImages } = await import("@/lib/campaign-images");
      const images = campaignId ? ((await getAllCampaignImages())[campaignId] || []) : [];
      const frames = images.length
        ? images
        : [
            // Si la campaña no tiene assets propios se usa una imagen fija del
            // sitio para poder verificar el render igual.
            "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-matematica.png",
          ];
      const { buildTikTokVideo } = await import("@/lib/video/tiktok-video");
      const t0 = Date.now();
      const video = await buildTikTokVideo({ images: frames, audioText: "Mirá cómo funciona" });
      out.testRender = { ...video, campaignId, campaignImages: images.length, ms: Date.now() - t0 };
    } catch (e) {
      out.testRender = { url: "", error: e instanceof Error ? e.message : "error" };
    }
  }

  // 5. Test real contra BulkPublish (?test=bulkpublish): crea un draft en el
  //    canal de TikTok y lo borra, capturando el error exacto de la API.

  if (url.searchParams.get("test") === "bulkpublish") {
    try {
      const { getChannels, createPost, deletePost } = await import("@/lib/bulkpublish/client");
      const channels = await getChannels();
      const tiktok = channels.find((c) => c.platform.toLowerCase().includes("tiktok"));
      out.testChannels = channels;
      if (!tiktok) {
        out.testBulkPublish = { ok: false, error: "sin canal tiktok" };
      } else {
        // Permite probar con media (?media=<url>) para ver si TikTok acepta
        // imagen o exige video ( BulkPublish valida esto en la API ).
        const mediaUrl = url.searchParams.get("media");
        const mediaType = url.searchParams.get("mediaType") || undefined;
        const publishNow = url.searchParams.get("publish") === "1";
        try {
          const created = await createPost({
            text: url.searchParams.get("text") || "Diagnóstico — borrador de prueba (se elimina).",
            channelIds: [tiktok.id],
            ...(mediaUrl ? { mediaUrls: [mediaUrl] } : {}),
            ...(mediaType ? { mediaType } : {}),
            ...(publishNow ? { publishNow: true } : {}),
          });
          if (created.id) {
            if (!publishNow) await deletePost(created.id);
            out.testBulkPublish = {
              ok: true,
              channelId: tiktok.id,
              withMedia: !!mediaUrl,
              published: publishNow,
            };
          } else {
            out.testBulkPublish = { ok: false, channelId: tiktok.id, error: created.error || "sin id" };
          }
        } catch (e) {
          out.testBulkPublish = {
            ok: false,
            channelId: tiktok.id,
            withMedia: !!mediaUrl,
            published: publishNow,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }
    } catch (e) {
      out.testBulkPublish = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 6. Test de refresh del token de YouTube (?test=yttoken): intenta renovar el
  //    access token con el refresh token y reporta la respuesta exacta de Google.
  if (url.searchParams.get("test") === "yttoken") {
    try {
      const { data } = await supabase
        .from("social_accounts")
        .select("access_token, refresh_token")
        .eq("platform", "youtube")
        .limit(1)
        .single();
      if (!data?.refresh_token) {
        out.testYtRefresh = { ok: false, error: "sin refresh_token" };
      } else if (!process.env.GOOGLE_CLIENT_SECRET) {
        out.testYtRefresh = { ok: false, error: "GOOGLE_CLIENT_SECRET no configurado" };
      } else {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id:
              "197688740927-424b24ggfjps171uqbccdmhsqjtgdhp7.apps.googleusercontent.com",
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: data.refresh_token,
            grant_type: "refresh_token",
          }).toString(),
        });
        const body = (await res.json()) as Record<string, unknown>;
        const refreshResult: Record<string, unknown> = {
          ok: res.ok,
          status: res.status,
          hasAccessToken: !!body.access_token,
          error: body.error ? `${body.error}: ${body.error_description || ""}` : undefined,
        };
        // Si renovó, se persiste (igual que hace refreshYouTubeToken).
        if (res.ok && body.access_token && !process.env.NODRYRUN) {
          await supabase
            .from("social_accounts")
            .update({
              access_token: body.access_token,
              refresh_token: body.refresh_token || data.refresh_token,
              updated_at: Date.now(),
            })
            .eq("platform", "youtube")
            .eq("user_id", "00000000-0000-0000-0000-000000000000");
          refreshResult.saved = true;
        }
        out.testYtRefresh = refreshResult;
      }
    } catch (e) {
      out.testYtRefresh = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }

  // 7. Canales de Buffer y activos por campaña
  try {
    const { getBufferAccount, getBufferChannels } = await import("@/lib/buffer/client");
    const account = await getBufferAccount();
    const orgId = account.account.organizations[0]?.id || "";
    const chans = orgId ? await getBufferChannels(orgId) : [];
    out.bufferChannels = chans.map((c) => ({
      id: c.id,
      service: c.service,
      disconnected: c.isDisconnected,
    }));
  } catch (e) {
    out.bufferChannels = { error: e instanceof Error ? e.message : "error" };
  }

  try {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, status, platforms, url")
      .eq("status", "ACTIVE");
    const { getAllCampaignImages } = await import("@/lib/campaign-images");
    const imgs = await getAllCampaignImages();
    out.campaigns = (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      platforms: c.platforms,
      url: c.url,
      images: (imgs[c.id] || []).length,
      sampleImage: (imgs[c.id] || [])[0] || null,
    }));
  } catch (e) {
    out.campaigns = { error: e instanceof Error ? e.message : "error" };
  }

  // 8. Resumen de publicaciones por plataforma (últimos 30 días)
  try {
    const { data } = await supabase
      .from("content_pieces")
      .select("platform, status, published_at")
      .gte("created_at", Date.now() - 30 * 86400000);
    const summary: Record<string, Record<string, number>> = {};
    for (const r of data || []) {
      const p = r.platform || "?";
      summary[p] = summary[p] || {};
      summary[p][r.status] = (summary[p][r.status] || 0) + 1;
    }
    out.last30d = summary;
  } catch (e) {
    out.last30d = { error: e instanceof Error ? e.message : "error" };
  }

  // 5c. Test de imagen (?test=image&platform=tiktok): genera una imagen con el
  //     mismo formato de prompt que usa el ciclo (estilo + guía de audiencia)
  //     y devuelve la URL pública, para verificar a la vista que sale gente
  //     local y no rasgos asiáticos.
  if (url.searchParams.get("test") === "image") {
    try {
      const platform = url.searchParams.get("platform") || "tiktok";
      const { generateImageWithFallback } = await import("@/lib/ai/multi-image");
      const { AUDIENCE_CONTEXT } = await import("@/lib/ai/copywriter");
      const style =
        platform === "instagram"
          ? "Young Argentine woman (Latina, dark wavy hair, olive skin) holding a quiniela ticket, happy celebration, Argentine neighbourhood shop behind, professional lifestyle photo, warm lighting"
          : "Young Argentine man (Latino, dark hair, olive skin) holding a winning quiniela ticket with excited expression, Argentine kiosco background, celebration moment, realistic photo";
      const t0 = Date.now();
      const image = await generateImageWithFallback(
        `${style}. ${AUDIENCE_CONTEXT}`,
        "1:1"
      );
      out.testImage = { url: image.url, provider: image.provider, ms: Date.now() - t0 };
    } catch (e) {
      out.testImage = { url: "", error: e instanceof Error ? e.message : "error" };
    }
  }

  // 8b. Test de Buffer (?test=buffer): limpia cache y bloqueo local y hace UNA
  //     llamada real a la API, para distinguir un 429 transitorio de un token
  //     que ya no sirve (los dos se manifiestan igual desde el resto del ciclo).
  if (url.searchParams.get("test") === "buffer") {
    try {
      const { clearRateLimit } = await import("@/lib/buffer/rate-limit");
      const { invalidateBufferCache, getBufferAccount } = await import(
        "@/lib/buffer/client"
      );
      clearRateLimit();
      invalidateBufferCache();
      const t0 = Date.now();
      const account = await getBufferAccount();
      out.testBuffer = {
        ok: true,
        ms: Date.now() - t0,
        user: (account as { account?: { username?: string } })?.account?.username || null,
      };
    } catch (e) {
      out.testBuffer = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }

  // 8c. Test de Meta (?test=meta): pide debug_token con el token guardado y
  //     reporta los permisos reales, para saber si el token tiene
  //     pages_manage_posts antes de intentar publicar en Facebook.
  if (url.searchParams.get("test") === "meta") {
    try {
      const { getMetaConfigAsync } = await import("@/lib/meta/graph");
      const config = await getMetaConfigAsync();
      if (!config?.pageAccessToken) {
        out.testMeta = { ok: false, error: "sin token de Meta guardado" };
      } else {
        const debugUrl =
          `https://graph.facebook.com/v21.0/debug_token?` +
          `input_token=${encodeURIComponent(config.pageAccessToken)}` +
          `&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
        const res = await fetch(debugUrl, { signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        const info = data?.data || {};
        out.testMeta = {
          ok: !!info.is_valid,
          pageId: config.pageId,
          valid: !!info.is_valid,
          type: info.type || null,
          expiresAt: info.expires_at || 0,
          scopes: info.scopes || [],
          hasPagesManagePosts: (info.scopes || []).includes("pages_manage_posts"),
          metaError: data?.error?.message || null,
        };
      }
    } catch (e) {
      out.testMeta = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }

  // 8d. Test real de Facebook (?test=facebook): el token actual no tiene
  //     pages_manage_posts, por lo que la ruta de foto (/photos) falla con
  //     #240. Se prueba la ruta de link (/feed), que publishToFacebook usa
  //     cuando no hay imagen. Publica un post real con el CTA de la campaña.
  if (url.searchParams.get("test") === "facebook") {
    try {
      const { publishToFacebook } = await import("@/lib/meta/graph");
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("name, url")
        .eq("status", "ACTIVE")
        .limit(1);
      const campaign = campaigns?.[0];
      const site = campaign?.url || "https://quiniela-ia-two.vercel.app/";
      const message =
        `La quiniela de la ciudad está más fácil de lo que parece. ` +
        `Mirá las pistas de hoy y armá tu jugada en ${site}`;
      const result = await publishToFacebook(message, site, undefined);
      out.testFacebook = {
        ok: true,
        id: result.id,
        url: result.url || null,
        campaign: campaign?.name || null,
      };
    } catch (e) {
      out.testFacebook = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }

  // 9. Ultimas piezas (?last=tiktok&n=3): texto, media y estado real de lo que
  //    salio publicado, para verificar CTA, disclaimers y video adjunto.
  if (url.searchParams.get("last")) {
    try {
      const platform = url.searchParams.get("last") || "";
      const rawN = parseInt(url.searchParams.get("n") || "3", 10);
      const limitN = Number.isFinite(rawN) ? Math.min(Math.max(rawN, 1), 10) : 3;
      const { data } = await supabase
        .from("content_pieces")
        .select(
          "status, title, body, media_urls, external_post_id, published_at, created_at"
        )
        .eq("platform", platform)
        .order("created_at", { ascending: false })
        .limit(limitN);
      out.last = (data || []).map((p) => ({
        status: p.status,
        title: p.title,
        body: (p.body || "").slice(0, 400),
        media: p.media_urls,
        externalId: p.external_post_id || "",
        publishedAt: p.published_at || null,
        createdAt: p.created_at,
      }));
    } catch (e) {
      out.last = { error: e instanceof Error ? e.message : "error" };
    }
  }

  return NextResponse.json(out);
}
