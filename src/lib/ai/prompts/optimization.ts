import type { SocialPlatform } from '@/types';

export function generateVariantsPrompt(input: {
  content: string;
  platform: SocialPlatform;
  variant_count?: number;
  preserve_meaning?: boolean;
  brand_voice?: string;
}): string {
  const count = input.variant_count || 3;

  return `Genera ${count} variantes del siguiente contenido para ${input.platform}:

Contenido original: "${input.content}"
${input.preserve_meaning !== false ? 'Preserva el significado original.' : 'Puedes reestructurar libremente.'}
${input.brand_voice ? `Voz de marca: ${input.brand_voice}` : ''}

Cada variante debe tener un gancho diferente, caption optimizado, hashtags relevantes y un CTA efectivo.

Responde con JSON:
{
  "variants": [
    {
      "label": "Nombre de variante",
      "hook": "Gancho inicial que capte atención",
      "caption": "Caption completo optimizado",
      "hashtags": ["#tag1", "#tag2"],
      "cta": "Call to action",
      "score": 0-100
    }
  ]
}`;
}

export function optimizeContentPrompt(input: {
  content: string;
  platform: SocialPlatform;
  score_breakdown?: Record<string, number>;
  target_score?: number;
}): string {
  const weakAreas = input.score_breakdown
    ? Object.entries(input.score_breakdown)
        .filter(([, score]) => score < 60)
        .map(([key]) => key)
        .join(', ')
    : 'general';

  return `Optimiza el siguiente contenido para ${input.platform}:

"${input.content}"

Áreas a mejorar: ${weakAreas}
${input.target_score ? `Puntaje objetivo: ${input.target_score}/100` : ''}

Mejora el contenido enfocándote en las áreas débiles manteniendo las fortalezas.

Responde con JSON:
{
  "optimized_content": "Contenido optimizado",
  "changes": ["cambio1", "cambio2"],
  "expected_improvement": 0-100
}`;
}
