import { execFile } from "child_process";

// Imports con string literal: @vercel/nft (y webpack) solo siguen require() con
// literales, así que el binario termina dentro del bundle de Vercel.
function loadPkg(pkg: "@ffmpeg-installer/ffmpeg" | "@ffprobe-installer/ffprobe"): { path?: string } | null {
  try {
    if (pkg === "@ffmpeg-installer/ffmpeg") return require("@ffmpeg-installer/ffmpeg");
    if (pkg === "@ffprobe-installer/ffprobe") return require("@ffprobe-installer/ffprobe");
  } catch {
    // paquete no instalado: caemos al PATH del sistema
  }
  return null;
}

let ffmpegBinary: string | null | undefined;
let ffprobeBinary: string | null | undefined;

function binaryOf(pkg: "@ffmpeg-installer/ffmpeg" | "@ffprobe-installer/ffprobe"): string | null {
  try {
    const mod = loadPkg(pkg);
    if (mod?.path) return mod.path;
  } catch {
    // ignorar
  }
  return null;
}

export function ffmpegPath(): string {
  if (ffmpegBinary === undefined) ffmpegBinary = binaryOf("@ffmpeg-installer/ffmpeg");
  return ffmpegBinary || "ffmpeg";
}

export function ffprobePath(): string {
  if (ffprobeBinary === undefined) ffprobeBinary = binaryOf("@ffprobe-installer/ffprobe");
  return ffprobeBinary || "ffprobe";
}

function run(bin: string, args: string[], timeoutMs = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 64 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${bin}: ${(stderr || err.message || "").slice(0, 400)}`));
      else resolve(stdout);
    });
  });
}

/** Ejecuta ffmpeg con los argumentos dados (sin pasar por shell). */
export function runFfmpeg(args: string[], timeoutMs = 120_000): Promise<string> {
  return run(ffmpegPath(), args, timeoutMs);
}

/** Duración en segundos de un archivo de audio/video, o null si no se puede leer. */
export async function probeDuration(file: string): Promise<number | null> {
  try {
    const out = await run(
      ffprobePath(),
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
      30_000
    );
    const value = parseFloat(out.trim());
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function checkFFmpeg(): Promise<boolean> {
  try {
    await run(ffmpegPath(), ["-version"], 15_000);
    return true;
  } catch {
    return false;
  }
}
