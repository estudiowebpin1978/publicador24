import type { SupabaseClient } from "@supabase/supabase-js"
import { checkShotstackStatus, isShotstackConfigured, renderVideoWithShotstack } from "@/lib/video/shotstack"
import { uploadVideoUrlToYouTube } from "@/lib/youtube"

const RENDER_STALE_MS = 45 * 60 * 1000
const STATUS_KEY = "shotstack_status"
const STATUS_USER = "00000000-0000-0000-0000-000000000000"
const BLOCK_MS = 6 * 60 * 60 * 1000

const PLAN_LIMIT_RE = /plan limits|credits|quota|billing/i

/**
 * Shotstack free se agota por mes. Si quedo sin creditos, no tiene sentido
 * reintentar en cada ciclo (gasta IA y marca renders fallidos de nuevo).
 */
export async function isVideoRenderBlocked(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", STATUS_KEY)
      .eq("user_id", STATUS_USER)
      .maybeSingle()
    if (!data?.access_token) return null
    const parsed = JSON.parse(data.access_token)
    if (typeof parsed?.until === "number" && Date.now() < parsed.until) {
      return parsed.reason || "sin creditos Shotstack"
    }
    return null
  } catch {
    return null
  }
}

async function setVideoRenderBlocked(supabase: SupabaseClient, reason: string, ms = BLOCK_MS) {
  try {
    await supabase.from("social_accounts").delete().eq("platform", STATUS_KEY).eq("user_id", STATUS_USER)
    await supabase.from("social_accounts").insert({
      platform: STATUS_KEY,
      user_id: STATUS_USER,
      channel_name: "Shotstack status",
      access_token: JSON.stringify({ until: Date.now() + ms, reason }),
      status: "active",
      connected_at: Date.now(),
      updated_at: Date.now(),
    })
  } catch {}
}

export interface RenderStartResult {
  renderId?: string
  pieceId?: string
  error?: string
}

export interface RenderProcessResult {
  checked: number
  uploaded: number
  details: string[]
  pending: number
}

interface PendingRender {
  id: string
  title: string
  body: string
  hashtags: string[] | null
  media_urls: string[] | null
  external_post_id: string | null
  created_at: number | string | null
}

function extractRenderId(piece: PendingRender): string {
  return (piece.external_post_id || "").replace(/^render:/, "")
}

export async function listPendingRenders(supabase: SupabaseClient): Promise<PendingRender[]> {
  try {
    const { data } = await supabase
      .from("content_pieces")
      .select("id, title, body, hashtags, media_urls, external_post_id, created_at")
      .eq("platform", "youtube")
      .eq("status", "RENDERING")
      .order("created_at", { ascending: false })
      .limit(5)
    return (data || []) as PendingRender[]
  } catch {
    return []
  }
}

/**
 * Inicia un render en Shotstack y guarda la pieza como RENDERING.
 * No espera: el render se retoma en el siguiente ciclo del cron.
 */
export async function startYouTubeRender(
  supabase: SupabaseClient,
  input: {
    campaignId: string
    title: string
    description: string
    tags?: string[]
    thumbnailUrl?: string
    duration?: number
  }
): Promise<RenderStartResult> {
  if (!isShotstackConfigured()) {
    return { error: "SHOTSTACK_API_KEY no configurado" }
  }

  const blocked = await isVideoRenderBlocked(supabase)
  if (blocked) {
    return { error: `Video automático pausado: ${blocked}` }
  }

  try {
    const { renderId } = await renderVideoWithShotstack({
      title: input.title,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      images: input.thumbnailUrl
        ? [input.thumbnailUrl]
        : undefined,
      duration: input.duration || 15,
    })

    const { data, error } = await supabase
      .from("content_pieces")
      .insert({
        campaign_id: input.campaignId,
        title: input.title,
        body: input.description,
        cta: "Suscribite y activa la campanita",
        hashtags: input.tags || [],
        status: "RENDERING",
        platform: "youtube",
        media_urls: input.thumbnailUrl ? [input.thumbnailUrl] : [],
        external_post_id: `render:${renderId}`,
        published_at: null,
      })
      .select("id")
      .single()

    if (error) {
      return { renderId, error: `Guardado falló: ${error.message}` }
    }

    return { renderId, pieceId: data.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Render start failed" }
  }
}

/**
 * Retoma renders pendientes: si terminaron, descarga el mp4 y lo sube a YouTube.
 * Pensado para correr al inicio de cada ciclo del cron (polling barato, 1 llamada).
 */
export async function processPendingRenders(
  supabase: SupabaseClient,
  accessToken: string
): Promise<RenderProcessResult> {
  const result: RenderProcessResult = { checked: 0, uploaded: 0, details: [], pending: 0 }

  if (!isShotstackConfigured()) {
    return result
  }

  const pending = await listPendingRenders(supabase)
  if (pending.length === 0) return result

  for (const piece of pending) {
    const renderId = extractRenderId(piece)
    if (!renderId) {
      await supabase.from("content_pieces").update({ status: "FAILED" }).eq("id", piece.id)
      continue
    }

    const createdMs = typeof piece.created_at === "number"
      ? piece.created_at
      : Date.parse(piece.created_at || "") || Date.now()

    if (Date.now() - createdMs > RENDER_STALE_MS) {
      await supabase.from("content_pieces").update({ status: "FAILED" }).eq("id", piece.id)
      result.details.push(`[youtube] Render viejo marcado como fallido: ${piece.title}`)
      continue
    }

    try {
      const status = await checkShotstackStatus(renderId)
      result.checked++

      if (status.status === "failed") {
        await supabase.from("content_pieces").update({ status: "FAILED" }).eq("id", piece.id)
        result.details.push(`[youtube] Render falló: ${status.error || "sin detalle"}`)

        if (status.error && PLAN_LIMIT_RE.test(status.error)) {
          await setVideoRenderBlocked(supabase, status.error.slice(0, 200))
          result.details.push(
            `[youtube] Shotstack sin créditos — video automático pausado 24h (se reintenta solo)`
          )
        }
        continue
      }

      if (status.status !== "done" || !status.url) {
        result.pending++
        result.details.push(`[youtube] Render aún en curso (${status.status}): ${piece.title}`)
        continue
      }

      const upload = await uploadVideoUrlToYouTube(
        accessToken,
        status.url,
        piece.title,
        piece.body
      )

      if (upload.videoId) {
        await supabase
          .from("content_pieces")
          .update({
            status: "PUBLISHED",
            external_post_id: `youtube-${upload.videoId}`,
            published_at: Date.now(),
          })
          .eq("id", piece.id)

        result.uploaded++
        result.details.push(`[youtube] Publicado: ${upload.url || upload.videoId}`)
      } else {
        await supabase.from("content_pieces").update({ status: "READY" }).eq("id", piece.id)
        result.details.push(`[youtube] Upload falló: ${upload.error || "sin detalle"}`)
      }
    } catch (e) {
      result.details.push(`[youtube] Error retomando render: ${e instanceof Error ? e.message : "error"}`)
    }
  }

  return result
}
