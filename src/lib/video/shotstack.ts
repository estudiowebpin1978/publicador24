const SHOTSTACK_API_URL = "https://api.shotstack.io/v1";

// Imagenes propias y rapidas (evita placeholders externos que no cargan y
// dejan el render encolado hasta el timeout).
export const DEFAULT_RENDER_IMAGES = [
  "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-matematica.png",
  "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-patron.png",
  "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-metodo.png",
  "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-factores.png",
  "https://autopublicador-zeta.vercel.app/campaigns/quiniela-ia/quiniela-datos.png",
];

export function getShotstackApiKey(): string {
  const key = process.env.SHOTSTACK_API_KEY;
  if (!key) {
    throw new Error("SHOTSTACK_API_KEY no configurado");
  }
  return key;
}

interface ShotstackAsset {
  type: "title" | "image" | "video" | "audio" | "text";
  src?: string;
  text?: string;
  font?: { family: string; size: number; color: string };
  position?: { x: number; y: number };
  scale?: number;
  length?: number;
  start?: number;
  offset?: { x: number; y: number };
}

interface ShotstackTrack {
  clips: ShotstackAsset[];
}

interface ShotstackTimeline {
  background?: string;
  soundtrack?: { src: string; effect: string };
  tracks: ShotstackTrack[];
}

interface ShotstackOutput {
  format: "mp4";
  resolution: "hd" | "sd";
  aspectRatio: "16:9" | "9:16" | "1:1";
}

interface ShotstackRenderRequest {
  timeline: ShotstackTimeline;
  output: ShotstackOutput;
  callback?: string;
}

interface ShotstackStatusResponse {
  response: {
    id: string;
    status: "queued" | "rendering" | "done" | "failed";
    url?: string;
    error?: string;
  };
}

async function shotstackRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getShotstackApiKey();

  const res = await fetch(`${SHOTSTACK_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...options.headers,
    },
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`Shotstack ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Create a video render using Shotstack
 */
export async function renderVideoWithShotstack(config: {
  title: string;
  description: string;
  thumbnailUrl?: string;
  script?: string;
  images?: string[];
  duration?: number; // total seconds
}): Promise<{ renderId: string; statusUrl: string }> {
  getShotstackApiKey(); // validates key exists

  const script = config.script || `${config.title}. ${config.description}`;
  const images = config.images && config.images.length > 0
    ? config.images
    : (config.thumbnailUrl ? [config.thumbnailUrl] : DEFAULT_RENDER_IMAGES);

  const duration = config.duration || 30; // default 30s
  const imageCount = Math.max(1, images.length);
  const clipDuration = Math.max(2, duration / Math.max(1, images.length));

  // Build timeline - Shotstack format: clips have asset property
  const tracks = [
    // Video track with images
    {
      clips: images.map((img, i) => ({
        asset: {
          type: "image",
          src: img,
        },
        start: i * (duration / images.length),
        length: duration / images.length,
        fit: "cover",
        scale: 1,
        position: "center",
      })),
    },
    // Title overlay - simplified without font for testing
    {
      clips: [{
        asset: {
          type: "title",
          text: config.title,
        },
        start: 0,
        length: 5,
        position: "center",
        offset: { x: 0, y: -0.3 },
      }],
    },
    // Description overlay
    {
      clips: [{
        asset: {
          type: "text",
          text: config.description.substring(0, 100),
        },
        start: 3,
        length: 10,
        position: "center",
        offset: { x: 0, y: 0.3 },
      }],
    },
    // CTA overlay at end
    {
      clips: [{
        asset: {
          type: "text",
          text: "Visita quiniela-ia-two.vercel.app",
        },
        start: Math.max(0, duration - 5),
        length: 5,
        position: "bottom",
        offset: { x: 0, y: -0.1 },
      }],
    },
  ];

  // Add narration if script provided (using text-to-speech asset)
  if (process.env.SHOTSTACK_TTS_ENABLED === "true") {
    // Note: Shotstack supports TTS via external audio URL
    // We'd need to generate TTS separately and add as audio track
  }

  const timeline: ShotstackTimeline = {
    background: "#000000",
    tracks,
  };

  const output: ShotstackOutput = {
    format: "mp4",
    resolution: "hd",
    aspectRatio: "16:9",
  };

  const payload: ShotstackRenderRequest = {
    timeline,
    output,
  };

  const response = await shotstackRequest<{ response: { id: string } }>("/render", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    renderId: response.response.id,
    statusUrl: `${SHOTSTACK_API_URL}/render/${response.response.id}`,
  };
}

/**
 * Check render status
 */
export async function checkShotstackStatus(renderId: string): Promise<{
  status: "queued" | "rendering" | "done" | "failed";
  url?: string;
  error?: string;
}> {
  const response = await shotstackRequest<ShotstackStatusResponse>(`/render/${renderId}`);
  
  return {
    status: response.response.status,
    url: response.response.url,
    error: response.response.error,
  };
}

/**
 * Wait for render to complete (polling) - shorter timeout for Vercel
 */
export async function waitForShotstackRender(renderId: string, maxWaitMs = 60000): Promise<{ url: string } | { error: string }> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkShotstackStatus(renderId);
    
    if (status.status === "done") {
      if (status.url) return { url: status.url };
      return { error: "Render completed but no URL returned" };
    }
    
    if (status.status === "failed") {
      return { error: status.error || "Render failed" };
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, 5000));
  }

  return { error: "Timeout waiting for render" };
}

/**
 * Generate YouTube video using Shotstack (free tier: 50 renders/month)
 */
export async function generateYouTubeVideoWithShotstack(config: {
  title: string;
  description: string;
  thumbnailUrl?: string;
  script?: string;
  images?: string[];
  duration?: number;
}): Promise<{ videoUrl?: string; error?: string }> {
  try {
    getShotstackApiKey(); // validates key exists
  } catch {
    return { error: "SHOTSTACK_API_KEY no configurado" };
  }

  try {
    console.log("[Shotstack] Starting video render...");
    
    const { renderId, statusUrl } = await renderVideoWithShotstack({
      title: config.title,
      description: config.description,
      thumbnailUrl: config.thumbnailUrl,
      script: config.script,
      images: config.images,
      duration: config.duration || 30,
    });

    console.log(`[Shotstack] Render started: ${renderId}`);

    const result = await waitForShotstackRender(renderId);

    if (result.error) {
      return { error: `Shotstack render failed: ${result.error}` };
    }

    console.log(`[Shotstack] Video ready: ${result.url}`);
    return { videoUrl: result.url };

  } catch (e) {
    return { error: `Shotstack error: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}

/**
 * Check if Shotstack is configured
 */
export function isShotstackConfigured(): boolean {
  try {
    getShotstackApiKey();
    return true;
  } catch {
    return false;
  }
}