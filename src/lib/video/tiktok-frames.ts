/**
 * Selección de frames para el reel de TikTok. Lógica pura, sin dependencias:
 * el módulo es testeable directamente con `node --test` (sin alias `@/`).
 */

/**
 * Arma el plan del reel: hasta 3 frames y una duración mínima de ~6s (si hay
 * un solo frame se queda más tiempo en pantalla en vez de un video de 2s).
 */
export function planTikTokVideo(
  images: string[],
  secondsPerImage = 2
): { frames: string[]; secondsPerImage: number; seconds: number } {
  const frames = (images || []).filter(Boolean).slice(0, 3);
  const per = frames.length > 0 ? Math.max(secondsPerImage, Math.ceil(6 / frames.length)) : 0;
  return { frames, secondsPerImage: per, seconds: frames.length * per };
}

/**
 * Elige los frames del reel de TikTok en orden de preferencia: imagen propia
 * de la campaña, imagen generada con IA y —último recurso— el resto de assets
 * de la campaña. Devuelve [] si no hay nada usable.
 */
export function selectTikTokFrames(
  ownImage: string,
  generatedImage: string,
  campaignImages: string[]
): string[] {
  const picked: string[] = [];
  if (ownImage) picked.push(ownImage);
  if (generatedImage && generatedImage !== ownImage) picked.push(generatedImage);
  for (const url of campaignImages || []) {
    if (url && !picked.includes(url)) picked.push(url);
  }
  return picked;
}
