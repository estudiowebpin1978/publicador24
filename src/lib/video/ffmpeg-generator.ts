import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import https from "https";

const execAsync = promisify(exec);

interface VideoConfig {
  title: string;
  description: string;
  thumbnailUrl: string;
  script: string; // narration script
  images: string[]; // image URLs
  durationPerImage?: number; // seconds per image
}

interface VideoResult {
  videoPath: string;
  duration: number;
}

/**
 * Download file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require("fs").createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      require("fs").unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Generate TTS audio using Google Translate TTS (free, no API key)
 * Falls back to other free TTS if needed
 */
async function generateTTS(text: string, lang: string = "es"): Promise<string> {
  const tempDir = mkdtempSync(join(tmpdir(), "tts-"));
  const audioPath = join(tempDir, "speech.mp3");
  
  // Use Google Translate TTS (free, limited)
  const encodedText = encodeURIComponent(text.substring(0, 200)); // max 200 chars per request
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  
  await downloadFile(url, audioPath);
  return audioPath;
}

/**
 * Generate audio using Edge TTS (free, better quality)
 */
async function generateEdgeTTS(text: string, voice: string = "es-AR-ElenaNeural"): Promise<string> {
  const tempDir = mkdtempSync(join(tmpdir(), "tts-"));
  const audioPath = join(tempDir, "speech.mp3");
  
  // Use edge-tts via npx (requires edge-tts installed)
  try {
    await execAsync(`npx edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${audioPath}"`);
    return audioPath;
  } catch {
    // Fallback to gTTS
    return generateTTS(text);
  }
}

/**
 * Download images for video frames
 */
async function downloadImages(imageUrls: string[], tempDir: string): Promise<string[]> {
  const imagePaths: string[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const ext = imageUrls[i].split(".").pop()?.split("?")[0] || "jpg";
    const destPath = join(tempDir, `frame_${i}.${ext}`);
    await downloadFile(imageUrls[i], destPath);
    imagePaths.push(destPath);
  }
  return imagePaths;
}

/**
 * Create video from images + audio using FFmpeg
 */
async function createVideoFromFrames(config: VideoConfig): Promise<VideoResult> {
  const tempDir = mkdtempSync(join(tmpdir(), "video-"));
  const outputPath = join(tempDir, "output.mp4");
  
  try {
    // 1. Generate audio from script
    const script = config.script || config.description || config.title;
    const audioPath = await generateEdgeTTS(script);
    
    // 2. Download images
    const imageUrls = config.images.length > 0 
      ? config.images 
      : [config.thumbnailUrl].filter(Boolean);
    
    const imagePaths = await downloadImages(imageUrls, tempDir);
    
    if (imagePaths.length === 0) {
      throw new Error("No images available for video");
    }
    
    // 3. Get audio duration
    const { stdout: audioDuration } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    const duration = parseFloat(audioDuration.trim());
    
    // 4. Calculate duration per image
    const durationPerImage = config.durationPerImage || (duration / imagePaths.length);
    
    // 5. Create concat file for FFmpeg
    const concatFile = join(tempDir, "concat.txt");
    const frameDuration = Math.max(0.5, durationPerImage); // min 0.5s per frame
    
    let concatContent = "";
    for (const imgPath of imagePaths) {
      concatContent += `file '${imgPath}'\nduration ${frameDuration}\n`;
    }
    // Repeat last frame
    concatContent += `file '${imagePaths[imagePaths.length - 1]}'\n`;
    
    writeFileSync(concatFile, concatContent);
    
    // 5. Create video with FFmpeg
    // - Loop images to match audio duration
    // - Add audio
    // - Scale to 1920x1080 (YouTube standard)
    const ffmpegCmd = [
      'ffmpeg -y',
      `-f concat -safe 0 -i "${concatFile}"`,
      `-i "${audioPath}"`,
      '-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p"',
      '-c:v libx264',
      '-preset medium',
      '-crf 23',
      '-c:a aac',
      '-b:a 128k',
      '-shortest', // Stop when shortest stream ends (audio)
      `"${outputPath}"`
    ].join(" ");
    
    await execAsync(ffmpegCmd, { maxBuffer: 1024 * 1024 * 100, timeout: 300000 });
    
    // Verify output
    const { stdout: videoDuration } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    );
    
    return { videoPath: outputPath, duration: parseFloat(videoDuration.trim()) };
    
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Generate YouTube video from campaign content
 */
export async function generateYouTubeVideo(config: VideoConfig): Promise<VideoResult> {
  // Build script from title + description if not provided
  if (!config.script) {
    config.script = `${config.title}. ${config.description}`;
  }
  
  // Ensure we have images
  if (!config.images || config.images.length === 0) {
    if (config.thumbnailUrl) {
      config.images = [config.thumbnailUrl];
    } else {
      // Generate placeholder images if needed
      config.images = [];
    }
  }
  
  return createVideoFromFrames(config);
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

export async function checkEdgeTTS(): Promise<boolean> {
  try {
    await execAsync("npx edge-tts --version");
    return true;
  } catch {
    return false;
  }
}