import { generateImage, type ImageGenerationResult } from "./pollinations";
import { textToSpeech, type TTSResult } from "./freetts";

export interface VideoScene {
  id: number;
  text: string;
  image: ImageGenerationResult;
  duration: number;
  transition: "fade" | "slide" | "zoom";
}

export interface VideoScript {
  title: string;
  scenes: VideoScene[];
  totalDuration: number;
  narration?: TTSResult;
}

export interface VideoGenerationInput {
  content: string;
  hook: string;
  cta: string;
  platform: string;
  style?: string;
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

const TRANSITIONS: Array<"fade" | "slide" | "zoom"> = [
  "fade",
  "slide",
  "zoom",
];

export async function generateVideoAssets(
  input: VideoGenerationInput
): Promise<VideoScript> {
  const scenes = splitIntoScenes(input.content, 5);
  const videoScenes: VideoScene[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sceneText = scenes[i];
    const prompt = getScenePrompt(
      sceneText,
      input.platform,
      input.style || "profesional",
      i
    );

    const image = await generateImage(prompt, "9:16", i * 1000 + 42);
    const duration = estimateDuration(sceneText);

    videoScenes.push({
      id: i,
      text: sceneText,
      image,
      duration,
      transition: TRANSITIONS[i % TRANSITIONS.length],
    });
  }

  const narrationText = [input.hook, ...scenes, input.cta].join(". ");
  let narration: TTSResult | undefined;
  try {
    narration = await textToSpeech(narrationText, input.voice || "es-AR-Standard-A");
  } catch {
    // TTS not available, continue without narration
  }

  const totalDuration = videoScenes.reduce((sum, s) => sum + s.duration, 0);

  return {
    title: input.hook,
    scenes: videoScenes,
    totalDuration,
    narration,
  };
}
