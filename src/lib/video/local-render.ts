import { writeFileSync, mkdtempSync, rmSync, createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import https from "https";
import { runFfmpeg, probeDuration, checkFFmpeg } from "@/lib/video/ffmpeg";

export interface LocalVideoInput {
  images: string[];
  title: string;
  description?: string;
  secondsPerImage?: number;
  /** Si se pasa, intenta generar voz (best effort). Si falla, video mudo. */
  audioText?: string;
  /** Reel/Short vertical 1080x1920 (default). false → 1280x720 horizontal. */
  vertical?: boolean;
  /**
   * Vertical 720x1280 en vez de 1080x1920. TikTok acepta 720p y la codificación
   * tarda ~4x menos, lo que deja margen para publicar todas las campañas en un
   * solo ciclo del cron.
   */
  vertical720?: boolean;
}

export interface LocalVideoResult {
  videoPath: string;
  duration: number;
  withAudio: boolean;
}

function downloadFile(url: string, destPath: string, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (target: string, redirects = 0): void => {
      if (redirects > 5) return reject(new Error("demasiados redirects"));
      const mod = target.startsWith("http:") ? require("http") : https;
      const req = mod.get(
        target,
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; autopublicador/1.0)" } },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            attempt(res.headers.location, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode} descargando ${target.slice(0, 80)}`));
          }
          const file = createWriteStream(destPath);
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
          file.on("error", reject);
        }
      );
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout descarga")));
    };
    attempt(url);
  });
}

/** Voz gratuita vía Google Translate TTS. Devuelve la ruta o null si falla. */
async function generateTTS(text: string): Promise<string | null> {
  try {
    const tempDir = mkdtempSync(join(tmpdir(), "tts-"));
    const audioPath = join(tempDir, "speech.mp3");
    const clean = (text || "").replace(/\s+/g, " ").trim().slice(0, 180);
    if (!clean) return null;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=${encodeURIComponent(clean)}`;
    // TTS es best-effort: si tarda más de 8s no vale la pena frenar el ciclo
    // completo (el video sale mudo y listo).
    await downloadFile(url, audioPath, 8_000);
    const duration = await probeDuration(audioPath);
    if (!duration || duration < 1) return null;
    return audioPath;
  } catch {
    return null;
  }
}

/**
 * Render local (sin Shotstack): imágenes + voz opcional → mp4.
 * Por defecto vertical 1080x1920 (reel/Short). `vertical: false` → 1280x720.
 * Pensado para Vercel: preset veryfast y duración corta para que entre en 60s.
 */
export async function renderLocalVideo(input: LocalVideoInput): Promise<LocalVideoResult> {
  const tempDir = mkdtempSync(join(tmpdir(), "local-video-"));
  try {
    const imageUrls = (input.images || []).filter(Boolean);
    if (imageUrls.length === 0) {
      throw new Error("Sin imágenes para el video");
    }

    const secondsPerImage = Math.min(Math.max(input.secondsPerImage || 4, 2), 8);

    const imagePaths: string[] = [];
    for (let i = 0; i < Math.min(imageUrls.length, 6); i++) {
      const ext = (imageUrls[i].split("?")[0].split(".").pop() || "jpg").toLowerCase();
      const destPath = join(tempDir, `frame_${i}.${/^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg"}`);
      try {
        await downloadFile(imageUrls[i], destPath);
        imagePaths.push(destPath);
      } catch {
        // una imagen que no baja no debe tumbar el render completo
      }
    }
    if (imagePaths.length === 0) {
      throw new Error("No se pudo descargar ninguna imagen");
    }

    const audioPath = input.audioText ? await generateTTS(input.audioText) : null;
    const withAudio = Boolean(audioPath);

    const concatFile = join(tempDir, "concat.txt");
    let concatContent = "";
    for (const imgPath of imagePaths) {
      concatContent += `file '${imgPath.replace(/\\/g, "/")}'\nduration ${secondsPerImage}\n`;
    }
    concatContent += `file '${imagePaths[imagePaths.length - 1].replace(/\\/g, "/")}'\n`;
    writeFileSync(concatFile, concatContent);

    const totalDuration = imagePaths.length * secondsPerImage;
    const outputPath = join(tempDir, "output.mp4");

    const vf =
      input.vertical === false
        ? "scale=1280:720:force_original_aspect_ratio=decrease," +
          "pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p"
        : input.vertical720
          ? "scale=720:1280:force_original_aspect_ratio=increase," +
            "crop=720:1280,format=yuv420p"
          : "scale=1080:1920:force_original_aspect_ratio=increase," +
            "crop=1080:1920,format=yuv420p";

    const args = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];
    if (withAudio && audioPath) {
      args.push("-i", audioPath);
    } else {
      // Pista de audio silenciosa: algunos (TikTok) rechazan mp4 sin audio.
      args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
    }
    args.push("-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26");
    args.push("-c:a", "aac", "-b:a", "64k");
    args.push("-t", String(totalDuration), outputPath);

    await runFfmpeg(args, 110_000);

    const duration = (await probeDuration(outputPath)) || totalDuration;
    return { videoPath: outputPath, duration, withAudio };
  } catch (e) {
    rmSync(tempDir, { recursive: true, force: true });
    throw e;
  }
}

export { checkFFmpeg };
