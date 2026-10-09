/**
 * Selección de frames para el reel de TikTok. Lógica pura, sin dependencias:
 * el módulo es testeable directamente con `node --test` (sin alias `@/`).
 */

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
