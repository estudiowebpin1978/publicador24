import { generateVideoFrames } from "./multi-image";

export interface VideoScene {
  id: number;
  text: string;
  imageUrl: string;
  duration: number;
  transition: "fade" | "slide" | "zoom";
}

export interface VideoScript {
  title: string;
  scenes: VideoScene[];
  totalDuration: number;
}

export interface VideoGenerationInput {
  content: string;
  hook: string;
  cta: string;
  platform: string;
  style?: string;
  /** Voz TTS elegida por el caller (el ensamblado puede ignorarla si no hay audio). */
  voice?: string;
}

function splitIntoScenes(content: string, maxScenes: number = 5): string[] {
  const sentences = content
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length <= maxScenes) return sentences;

  const step = Math.ceil(sentences.length / maxScenes);
  const scenes: string[] = [];
  for (let i = 0; i < sentences.length; i += step) {
    scenes.push(sentences.slice(i, i + step).join(" "));
  }
  return scenes.slice(0, maxScenes);
}

function getScenePrompt(
  sceneText: string,
  platform: string,
  style: string,
  sceneIndex: number
): string {
  const aspectRatio = platform === "tiktok" || platform === "instagram" ? "9:16" : "16:9";
  const styles: Record<string, string> = {
    profesional: "clean, modern, corporate, blue tones",
    casual: "warm, friendly, natural colors, lifestyle",
    divertido: "colorful, playful, vibrant, fun",
    emocional: "inspirational, warm lighting, emotional",
    urgente: "bold, high contrast, red accents, dramatic",
    educativo: "clean, informative, diagram style, educational",
  };

  const styleDesc = styles[style] || styles.profesional;
  const scenePrompts = [
    "hero shot, main concept, dramatic lighting",
    "problem illustration, pain point, relatable scenario",
    "solution reveal, transformation, positive outcome",
    "benefits showcase, key features, highlights",
    "call to action, next steps, contact information",
  ];

  const sceneDesc = scenePrompts[sceneIndex % scenePrompts.length];
  return `${sceneDesc}, ${styleDesc}, ${sceneText.slice(0, 100)}, social media content, high quality, professional photography, ${aspectRatio} composition`;
}

function estimateDuration(text: string): number {
  const wordsPerMinute = 150;
  const words = text.split(" ").length;
  const seconds = (words / wordsPerMinute) * 60;
  return Math.max(3, Math.min(10, Math.ceil(seconds)));
}

const TRANSITIONS: Array<"fade" | "slide" | "zoom"> = ["fade", "slide", "zoom"];

export async function generateVideoReel(
  prompt: string,
  duration: number = 5
): Promise<{ url: string; type: "video" }> {
  const encodedPrompt = encodeURIComponent(prompt);

  // Try Pollinations video API
  try {
    const pollinationsUrl = `https://video.pollinations.ai/prompt/${encodedPrompt}?model=fast-svd&duration=${duration}`;
    const response = await fetch(pollinationsUrl, {
      signal: AbortSignal.timeout(90000),
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("video") || contentType.includes("octet-stream"))) {
        return { url: pollinationsUrl, type: "video" };
      }
    }
  } catch {
    // Pollinations video not available
  }

  // Fallback: generate multiple frames for a slideshow-style reel
  const frameCount = Math.max(4, Math.min(6, duration));
  const frames = await generateVideoFrames(prompt, frameCount);

  if (frames.length > 0) {
    // Return the best frame as a static image (platforms handle this as a photo post)
    return { url: frames[0], type: "video" };
  }

  return {
    url: `https://placehold.co/1080x1920/7c3aed/ffffff?text=${encodeURIComponent(prompt.slice(0, 30))}`,
    type: "video",
  };
}

export async function generateVideoForPlatform(
  platform: string,
  hook: string,
  body: string
): Promise<{ url: string }> {
  const platformConfig: Record<string, { duration: number; aspectRatio: string }> = {
    tiktok: { duration: 5, aspectRatio: "9:16" },
    instagram: { duration: 5, aspectRatio: "9:16" },
    facebook: { duration: 10, aspectRatio: "1:1" },
    youtube: { duration: 15, aspectRatio: "16:9" },
    twitter: { duration: 10, aspectRatio: "16:9" },
    linkedin: { duration: 10, aspectRatio: "16:9" },
  };

  const config = platformConfig[platform] || platformConfig.facebook;
  const fullPrompt = `${hook}. ${body}`;

  const result = await generateVideoReel(fullPrompt, config.duration);
  return { url: result.url };
}

export async function generateVideoAssets(
  input: VideoGenerationInput
): Promise<VideoScript> {
  const scenes = splitIntoScenes(input.content, 5);
  const videoScenes: VideoScene[] = [];

  const prompts = scenes.map((sceneText, i) =>
    getScenePrompt(sceneText, input.platform, input.style || "profesional", i)
  );

  const images = await generateVideoFrames(
    prompts.join(". "),
    scenes.length
  );

  for (let i = 0; i < scenes.length; i++) {
    const sceneText = scenes[i];
    const duration = estimateDuration(sceneText);

    videoScenes.push({
      id: i,
      text: sceneText,
      imageUrl: images[i] || `https://placehold.co/1280x720/7c3aed/ffffff?text=Scene+${i + 1}`,
      duration,
      transition: TRANSITIONS[i % TRANSITIONS.length],
    });
  }

  const totalDuration = videoScenes.reduce((sum, s) => sum + s.duration, 0);

  return {
    title: input.hook,
    scenes: videoScenes,
    totalDuration,
  };
}
