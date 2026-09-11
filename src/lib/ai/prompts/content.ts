import type { SocialPlatform } from '@/types';

export function generateContentPrompt(input: {
  topic: string;
  platform: SocialPlatform;
  language?: string;
  tone?: string;
  audience?: string;
  brand_voice?: string;
  include_cta?: boolean;
}): string {
  const lang = input.language || 'es';
  const tone = input.tone || 'profesional y cercano';
  const audience = input.audience || 'general';

  return `Genera contenido optimizado para ${input.platform} sobre: "${input.topic}"

Idioma: ${lang}
Tono: ${tone}
Audiencia: ${audience}
${input.brand_voice ? `Voz de marca: ${input.brand_voice}` : ''}
${input.include_cta !== false ? 'Incluye un call-to-action efectivo.' : ''}

Responde con JSON:
{
  "hook": "Gancho inicial que capture atención en los primeros 3 segundos",
  "caption": "Caption completo optimizado para la plataforma",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "Call to action claro y directo",
  "score": 0-100
}`;
}

export function analyzeContentPrompt(input: {
  content: string;
  platform?: string;
  language?: string;
  audience?: string;
}): string {
  return `Analiza el siguiente contenido para redes sociales:

"${input.content}"
${input.platform ? `Plataforma: ${input.platform}` : ''}
${input.language ? `Idioma: ${input.language}` : ''}
${input.audience ? `Audiencia: ${input.audience}` : ''}

Identifica: tema, intención, audiencia, tono, emociones, palabras clave, entidades, idioma y sentimiento.

Responde con JSON:
{
  "topic": "tema principal",
  "intent": "promotional|educational|entertainment|informational|engagement",
  "audience": "audiencia objetivo",
  "tone": "tono detectado",
  "emotions": ["emoción1", "emoción2"],
  "keywords": ["palabra1", "palabra2"],
  "entities": ["entidad1"],
  "language": "código de idioma",
  "sentiment": 0.0-1.0
}`;
}

export function adaptForPlatformPrompt(input: {
  content: string;
  source_platform: string;
  target_platform: string;
  preserve_meaning?: boolean;
}): string {
  return `Adapta el siguiente contenido de ${input.source_platform} a ${input.target_platform}:

"${input.content}"

${input.preserve_meaning !== false ? 'Preserva el significado original.' : 'Puedes reestructurar libremente.'}

Considera: límites de caracteres, estilo típico de la plataforma, hashtags permitidos, formato óptimo.

Responde con JSON:
{
  "hook": "Gancho adaptado",
  "caption": "Caption adaptado",
  "hashtags": ["#adaptado1"],
  "cta": "CTA adaptado"
}`;
}
