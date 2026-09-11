import type { SocialPlatform } from '@/types';

export function analyzeTrendPrompt(input: {
  keywords: string[];
  platform?: SocialPlatform;
  country?: string;
  language?: string;
}): string {
  return `Analiza las tendencias actuales para las siguientes palabras clave:

Palabras clave: ${input.keywords.join(', ')}
${input.platform ? `Plataforma: ${input.platform}` : 'Plataforma: todas'}
${input.country ? `País: ${input.country}` : 'País: global'}
${input.language ? `Idioma: ${input.language}` : 'Idioma: es'}

Para cada palabra clave, determina: dirección (RISING/STABLE/DECLINING), score de tendencia, tasa de crecimiento y hashtags relacionados.

Responde con JSON:
{
  "trends": [
    {
      "keyword": "palabra clave",
      "direction": "RISING|STABLE|DECLINING",
      "score": 0-100,
      "growth_rate": -100 a 100,
      "related_hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;
}
