import type { SocialPlatform } from '@/types';

export function generateHashtagsPrompt(input: {
  content: string;
  platform: SocialPlatform;
  language: string;
  country?: string;
  count?: number;
  high_reach_percent?: number;
  medium_percent?: number;
  niche_percent?: number;
}): string {
  const count = input.count || 10;
  const highPct = input.high_reach_percent ?? 30;
  const medPct = input.medium_percent ?? 40;

  const highCount = Math.round(count * highPct / 100);
  const medCount = Math.round(count * medPct / 100);
  const nicheCount = count - highCount - medCount;

  return `Genera ${count} hashtags para ${input.platform} sobre: "${input.content}"

Idioma: ${input.language}
${input.country ? `País: ${input.country}` : ''}

Distribución requerida:
- ${highCount} hashtags de ALTO alcance (populares, >1M publicaciones)
- ${medCount} hashtags de ALCANCE MEDIO (100K-1M publicaciones)
- ${nicheCount} hashtags de NICHO (específicos, <100K publicaciones)

Para cada hashtag incluye: tag, categoría (trending|niche|branded|topic|community), relevancia, popularidad, competencia, tendencia, score final, y si es estimado.

Responde con JSON:
{
  "hashtags": [
    {
      "tag": "#hashtag",
      "category": "categoría",
      "relevance": 0.0-1.0,
      "popularity": 0.0-1.0,
      "competition": 0.0-1.0,
      "trend": 0.0-1.0,
      "final_score": 0.0-1.0,
      "is_estimated": false
    }
  ]
}`;
}
