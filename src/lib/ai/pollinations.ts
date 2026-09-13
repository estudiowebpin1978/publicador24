export interface ImageGenerationResult {
  url: string;
  width: number;
  height: number;
  prompt: string;
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '9:16': { width: 720, height: 1280 },
  '16:9': { width: 1280, height: 720 },
  '3:2': { width: 1200, height: 800 },
};

export async function generateImage(
  prompt: string,
  aspectRatio: string = '1:1',
  seed?: number
): Promise<ImageGenerationResult> {
  const dims = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['1:1'];
  const randomSeed = seed || Math.floor(Math.random() * 999999);

  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${randomSeed}&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status}`);
  }

  return {
    url,
    width: dims.width,
    height: dims.height,
    prompt,
  };
}

export async function generateImagePack(
  basePrompt: string,
  styles: string[],
  aspectRatio: string = '1:1'
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < styles.length; i++) {
    const stylePrompt = `${basePrompt}, ${styles[i]} style`;
    const result = await generateImage(stylePrompt, aspectRatio, i * 1000);
    results.push(result);
  }

  return results;
}
