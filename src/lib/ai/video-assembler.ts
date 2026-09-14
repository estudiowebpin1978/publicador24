import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, unlink, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

function getFfmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

function getFfmpegBinDir(): string {
  return process.env.FFMPEG_BIN_DIR || "";
}

export interface VideoConfig {
  scenes: Array<{
    imageUrl: string;
    text: string;
    duration: number;
  }>;
  audioUrl?: string;
  outputWidth: number;
  outputHeight: number;
  fps: number;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function createSceneFrame(
  imageUrl: string,
  text: string,
  width: number,
  height: number,
  outputPath: string
): Promise<void> {
  const imageBuffer = await downloadImage(imageUrl);

  const resizedImage = await sharp(imageBuffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .toBuffer();

  const overlayText = text.length > 80 ? text.substring(0, 77) + "..." : text;

  const svgOverlay = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
          <stop offset="50%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.85);stop-opacity:0.85" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
      <text x="${width / 2}" y="${height - 80}" 
            font-family="Arial, sans-serif" 
            font-size="${Math.floor(width / 18)}" 
            font-weight="bold"
            fill="white" 
            text-anchor="middle"
            stroke="rgba(0,0,0,0.5)" 
            stroke-width="2">
        ${overlayText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </text>
    </svg>
  `;

  await sharp(resizedImage)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
}

async function downloadAudio(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download audio: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(outputPath, buffer);
}

export async function assembleVideo(config: VideoConfig): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const workDir = join(tmpdir(), `video-${id}`);
  await mkdir(workDir, { recursive: true });

  try {
    // Generate frames for each scene
    const framePaths: string[] = [];
    for (let i = 0; i < config.scenes.length; i++) {
      const scene = config.scenes[i];
      const framePath = join(workDir, `frame_${String(i).padStart(3, "0")}.png`);
      await createSceneFrame(
        scene.imageUrl,
        scene.text,
        config.outputWidth,
        config.outputHeight,
        framePath
      );
      framePaths.push(framePath);
    }

    // Create ffmpeg input file list with durations
    let inputList = "";
    for (let i = 0; i < config.scenes.length; i++) {
      const scene = config.scenes[i];
      inputList += `file '${framePaths[i].replace(/\\/g, "/")}'\n`;
      inputList += `duration ${scene.duration}\n`;
    }
    // Duplicate last frame for ffmpeg concat
    if (config.scenes.length > 0) {
      inputList += `file '${framePaths[framePaths.length - 1].replace(/\\/g, "/")}'\n`;
    }

    const listPath = join(workDir, "input.txt");
    await writeFile(listPath, inputList);

    const outputPath = join(workDir, `output_${id}.mp4`);

    let ffmpegCmd: string;

    if (config.audioUrl) {
      const audioPath = join(workDir, "audio.mp3");
      await downloadAudio(config.audioUrl, audioPath);

      ffmpegCmd = [
        `${getFfmpegPath()} -y`,
        `-f concat -safe 0 -i "${listPath.replace(/\\/g, "/")}"`,
        `-i "${audioPath.replace(/\\/g, "/")}"`,
        `-c:v libx264 -pix_fmt yuv420p -r ${config.fps}`,
        `-c:a aac -b:a 128k`,
        `-shortest`,
        `"${outputPath.replace(/\\/g, "/")}"`,
      ].join(" ");
    } else {
      // Generate silent audio track
      const totalDuration = config.scenes.reduce((sum, s) => sum + s.duration, 0);
      ffmpegCmd = [
        `${getFfmpegPath()} -y`,
        `-f concat -safe 0 -i "${listPath.replace(/\\/g, "/")}"`,
        `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100`,
        `-c:v libx264 -pix_fmt yuv420p -r ${config.fps}`,
        `-c:a aac -b:a 128k`,
        `-t ${totalDuration}`,
        `-shortest`,
        `"${outputPath.replace(/\\/g, "/")}"`,
      ].join(" ");
    }

    await execAsync(ffmpegCmd, { 
      timeout: 60000,
      env: { ...process.env, PATH: getFfmpegBinDir() ? `${getFfmpegBinDir()};${process.env.PATH}` : process.env.PATH }
    });

    // Read the output file
    const videoBuffer = await readFile(outputPath);

    // Save to a persistent location
    const publicDir = join(process.cwd(), "public", "videos");
    await mkdir(publicDir, { recursive: true });
    const finalPath = join(publicDir, `video_${id}.mp4`);
    await writeFile(finalPath, videoBuffer);

    return `/videos/video_${id}.mp4`;
  } finally {
    // Cleanup temp files
    try {
      const files = await readdir(workDir);
      for (const file of files) {
        await unlink(join(workDir, file)).catch(() => {});
      }
      const { rmdir } = await import("fs/promises");
      await rmdir(workDir).catch(() => {});
    } catch {
      // Best effort cleanup
    }
  }
}
