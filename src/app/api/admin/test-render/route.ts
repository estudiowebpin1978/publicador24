import { NextResponse } from "next/server";
import { existsSync, statSync } from "fs";
import { renderLocalVideo } from "@/lib/video/local-render";
import { DEFAULT_RENDER_IMAGES } from "@/lib/video/shotstack";
import { ffmpegPath } from "@/lib/video/ffmpeg";

/**
 * Prueba el render local de video (fallback de YouTube sin créditos de Shotstack).
 * No sube nada: solo genera el mp4 en /tmp y reporta tamaño/duración.
 */
export const maxDuration = 60;

export async function GET() {
  const started = Date.now();
  try {
    const bin = ffmpegPath();
    const result = await renderLocalVideo({
      images: DEFAULT_RENDER_IMAGES.slice(0, 3),
      title: "Prueba de render local",
      audioText: "Hola, esto es una prueba del render automático.",
      secondsPerImage: 2,
    });

    const size = existsSync(result.videoPath) ? statSync(result.videoPath).size : 0;

    return NextResponse.json({
      ok: true,
      ffmpeg: bin,
      size,
      duration: result.duration,
      withAudio: result.withAudio,
      ms: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, ffmpeg: ffmpegPath(), error: e instanceof Error ? e.message : "error", ms: Date.now() - started },
      { status: 500 }
    );
  }
}
