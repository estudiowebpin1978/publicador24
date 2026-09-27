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
