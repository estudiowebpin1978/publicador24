import { readFileSync } from "fs"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const BUCKET = "media"

export function isHostedUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/media/")
}

export function hostedObjectUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`
}

/**
 * Descarga una imagen generada y la re-hostea en Supabase Storage (gratis, 1GB)
 * para obtener una URL publica estable que Meta/Buffer/BulkPublish puedan descargar.
 * Si algo falla devuelve la URL original.
 */
export async function hostImagePublicly(sourceUrl: string, kind: string = "post"): Promise<string> {
  if (!sourceUrl || isHostedUrl(sourceUrl)) return sourceUrl

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) return sourceUrl

    const contentType = res.headers.get("content-type") || "image/png"
    if (!contentType.startsWith("image/")) return sourceUrl

    const bytes = Buffer.from(await res.arrayBuffer())
    const ext = contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png"

    const path = `${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true })

    if (error) {
      console.warn("[media-hosting] upload error:", error.message)
      return sourceUrl
    }

    return hostedObjectUrl(path)
  } catch (e) {
    console.warn("[media-hosting] failed:", e instanceof Error ? e.message : e)
    return sourceUrl
  }
}

/**
 * Sube un mp4 local a Supabase Storage y devuelve la URL publica estable.
 * TikTok (via BulkPublish) exige un VIDEO, no una imagen: sin esta URL el
 * post se rechaza con 400 "tiktok video requires a video".
 */
export async function hostVideoPublicly(localPath: string): Promise<string> {
  const bytes = readFileSync(localPath)
  const path = `videos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`
  const supabase = getSupabaseAdmin()

  let { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "video/mp4", upsert: false })

  // El bucket `media` fue creado para imágenes y viene con mime types
  // restringidos: si rechaza el mp4 se habilita video/mp4 y se reintenta una
  // vez (una sola vez por instancia, para no repetir llamadas de admin).
  if (error && /mime|content.?type/i.test(error.message) && !videoMimeEnsured) {
    videoMimeEnsured = true
    await allowVideoMime()
    ;({ error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "video/mp4", upsert: false }))
  }

  if (error) {
    throw new Error(`upload de video falló: ${error.message}`)
  }

  return hostedObjectUrl(path)
}

let videoMimeEnsured = false

async function allowVideoMime(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.storage.getBucket(BUCKET)
    const allowed = data?.allowed_mime_types || []
    // null/[] = sin restricción; si hay lista, se agrega video/mp4 sin tocar
    // el resto de los permisos del bucket.
    if (allowed.length > 0 && !allowed.includes("video/mp4")) {
      await supabase.storage.updateBucket(BUCKET, {
        public: data?.public ?? true,
        allowedMimeTypes: [...allowed, "video/mp4"],
        ...(data?.file_size_limit ? { fileSizeLimit: data.file_size_limit } : {}),
      })
    }
  } catch (e) {
    console.warn("[media-hosting] no se pudo habilitar video/mp4:", e instanceof Error ? e.message : e)
  }
}
