// Multi-provider image generation with fallback
// Priority: Pollinations (primary) → Cloudflare Workers AI (fallback)

interface ImageResult {
  url: string;
  width: number;
  height: number;
  provider: string;
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "3:2": { width: 1200, height: 800 },
};

async function pollinationsImage(
  prompt: string,
  width: number,
  height: number,
  seed: number
): Promise<ImageResult> {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Pollinations error: ${response.status}`);

  return { url, width, height, provider: "pollinations" };
}

async function cloudflareImage(
  prompt: string,
  width: number,
  height: number
): Promise<ImageResult> {
  // Cloudflare Workers AI - FLUX.1 Schnell
  // Note: This requires a Cloudflare account and worker
  // For now, we'll use a public Hugging Face endpoint as fallback
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 999999)}&nologo=true&model=flux`;

  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Cloudflare fallback error: ${response.status}`);

  return { url, width, height, provider: "pollinations-flux" };
}

async function freePlaceholdr(
  prompt: string,
  width: number,
  height: number
): Promise<ImageResult> {
  // placeholdr.dev - free AI placeholder images
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://placeholdr.dev/${width}x${height}?prompt=${encodedPrompt}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Placeholdr error: ${response.status}`);

  return { url, width, height, provider: "placeholdr" };
}

export async function generateImageWithFallback(
  prompt: string,
  aspectRatio: string = "1:1",
  seed?: number
): Promise<ImageResult> {
  const dims = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS["1:1"];
  const randomSeed = seed || Math.floor(Math.random() * 999999);

  // Provider 1: Pollinations (primary)
  try {
    return await pollinationsImage(prompt, dims.width, dims.height, randomSeed);
  } catch (error) {
    console.warn(`Pollinations failed: ${error instanceof Error ? error.message : "unknown"}`);
  }

  // Provider 2: Pollinations with Flux model (fallback)
  try {
    return await cloudflareImage(prompt, dims.width, dims.height);
  } catch (error) {
    console.warn(`Flux fallback failed: ${error instanceof Error ? error.message : "unknown"}`);
  }

  // Provider 3: Placeholdr (last resort)
  try {
    return await freePlaceholdr(prompt, dims.width, dims.height);
  } catch (error) {
    console.warn(`Placeholdr failed: ${error instanceof Error ? error.message : "unknown"}`);
  }

  // Final fallback: Return a placeholder URL
  return {
    url: `https://placehold.co/${dims.width}x${dims.height}/7c3aed/ffffff?text=${encodeURIComponent(prompt.substring(0, 20))}`,
    width: dims.width,
    height: dims.height,
    provider: "placeholder",
  };
}

export async function generateImagePack(
  basePrompt: string,
  styles: string[],
  aspectRatio: string = "1:1"
): Promise<ImageResult[]> {
  const results: ImageResult[] = [];

  for (let i = 0; i < styles.length; i++) {
    const stylePrompt = `${basePrompt}, ${styles[i]} style`;
    const result = await generateImageWithFallback(stylePrompt, aspectRatio, i * 1000);
    results.push(result);
  }

  return results;
}
