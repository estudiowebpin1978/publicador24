// Imports relativos (con extensión) para que el test de node pueda resolverlos
// sin alias `@/`: mismo criterio que src/lib/marketing/compliance.ts.
import { rmSync } from "fs";
import { dirname } from "path";
import { renderLocalVideo, checkFFmpeg } from "./local-render.ts";
import { hostVideoPublicly } from "../media-hosting.ts";

export { selectTikTokFrames } from "./tiktok-frames.ts";

export interface TikTokVideoInput {
  /** Imágenes propias de la campaña (o la imagen generada) que van a los frames. */
  images: string[];
  /** Texto corto para la voz del video (hook). Opcional: sin texto el video queda mudo. */
  audioText?: string;
  secondsPerImage?: number;
}

export interface TikTokVideoResult {
  /** URL pública del mp4 listo para adjuntar. "" si no se pudo armar. */
  url: string;
  /** Frames efectivamente usados. */
  frames: number;
  /** Duración del video en segundos. */
  seconds: number;
  /** Motivo cuando `url` está vacío (se registra en los detalles del autopilot). */
  error?: string;
}

/**
 * TikTok (via BulkPublish) rechaza posts sin video: `400 tiktok video requires
 * a video`. Este helper arma un reel vertical corto con ffmpeg (disponible en
 * el runtime de Vercel) a partir de las imágenes de la campaña y lo deja en
 * una URL publica de Supabase Storage, lista para adjuntar al post.
 *
 * Se limita a 3 frames x 2s en 720x1280 para que el render entre holgado en el
 * presupuesto de tiempo del cron y se puedan cubrir todas las campañas en un
 * solo ciclo.
 */
export async function buildTikTokVideo(input: TikTokVideoInput): Promise<TikTokVideoResult> {
  const images = (input.images || []).filter(Boolean).slice(0, 3);
  const secondsPerImage = input.secondsPerImage ?? 2;
  const seconds = images.length * secondsPerImage;
  const empty = (error: string): TikTokVideoResult => ({ url: "", frames: images.length, seconds, error });

  if (images.length === 0) return empty("sin imágenes disponibles");
  if (!(await checkFFmpeg())) return empty("ffmpeg no disponible en el runtime");

  let localPath = "";
  try {
    const { videoPath } = await renderLocalVideo({
      images,
      title: "",
      audioText: input.audioText,
      secondsPerImage,
      vertical720: true,
    });
    localPath = videoPath;
    const url = await hostVideoPublicly(videoPath);
    if (!url) return empty("no se pudo obtener la URL pública del video");
    return { url, frames: images.length, seconds };
  } catch (e) {
    return empty(e instanceof Error ? e.message : "error renderizando el video");
  } finally {
    // /tmp en Vercel es efímero pero limpiamos igual para no acumular archivos.
    if (localPath) {
      try {
        rmSync(dirname(localPath), { recursive: true, force: true });
      } catch {}
    }
  }
}
