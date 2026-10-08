import type { SocialPlatform } from '@/types';
import { getAIProvider } from './provider';
import { COPYWRITER_SYSTEM } from './copywriter';
import type {
  IdeaGeneratorInput,
  IdeaGeneratorResult,
  GeneratedIdea,
  ContentPillar,
} from './engines';

const DEFAULT_PILLARS: ContentPillar[] = [
  { type: 'educational', name: 'Educación', percentage: 30 },
  { type: 'entertainment', name: 'Entretenimiento', percentage: 25 },
  { type: 'promotional', name: 'Promocional', percentage: 15 },
  { type: 'inspirational', name: 'Inspiración', percentage: 15 },
  { type: 'behind_the_scenes', name: 'Detrás de cámaras', percentage: 15 },
];

export async function generateIdeas(input: IdeaGeneratorInput): Promise<IdeaGeneratorResult> {
  const provider = getAIProvider();
  const count = input.count || 10;
  const platforms = input.platforms || (['tiktok', 'instagram'] as SocialPlatform[]);
  const pillars = input.contentPillars || DEFAULT_PILLARS;

  const prompt = `Generá ${count} ideas de contenido para el nicho: "${input.niche}"
Idioma: ${input.language || 'es'} (español rioplatense, voseo)
País: ${input.country || 'global'}
Público: ${input.audience || 'general'}
Plataformas: ${platforms.join(', ')}

Pilares de contenido (repartí las ideas entre estos):
${pillars.map((p) => `- ${p.name} (${p.percentage}%): ${p.description || p.type}`).join('\n')}

Reglas:
- Cada idea tiene que tener que ver con el nicho pedido y con algo concreto que la gente busca hoy.
- Título y gancho: como los diría una persona, no como un folleto. Nada de "descubrí el poder de", "en el mundo de", promesas de resultados garantizados ni títulos con % inventados.
- Ideas accionables y distintas entre sí: ninguna puede ser un rewording de otra.
- Todas pensadas para terminar llevando al lector a un sitio web.

Para cada idea devolvé:
- Title: título corto y concreto
- Hook: primera línea que frene el scroll (máx. 10 palabras)
- Angle: ángulo propio, distinto al de las demás
- Format: formato (reel, carrusel, thread, etc.)
- Platform: mejor plataforma
- Pillar: pilar de contenido
- Score: puntaje de calidad (0-100)
- Description: descripción breve de qué se trata

Respondé SOLO con JSON array: [{ title, hook, angle, format, platform, pillar, score, description }]`;

  const result = await provider.generateText({
    prompt,
    system_prompt: COPYWRITER_SYSTEM,
    temperature: 0.9,
  });

  const ideas = parseIdeas(result.text, count);
  return { ideas };
}

function parseIdeas(text: string, count: number): GeneratedIdea[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slice(0, count).map((idea: Record<string, unknown>) => ({
        title: String(idea.title || ''),
        hook: String(idea.hook || ''),
        angle: String(idea.angle || ''),
        format: String(idea.format || 'reel'),
        platform: validatePlatform(String(idea.platform || 'instagram')),
        pillar: String(idea.pillar || 'educational'),
        score: clamp(Number(idea.score || 70)),
        description: String(idea.description || ''),
      }));
    }
  } catch { /* fallback */ }

  const defaultPlatforms: SocialPlatform[] = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'];
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.slice(0, count).map((line, i) => {
    const clean = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
    return {
      title: clean,
      hook: clean,
      angle: 'Original perspective',
      format: 'reel',
      platform: defaultPlatforms[i % defaultPlatforms.length],
      pillar: 'educational',
      score: clamp(75 - i * 3),
      description: clean,
    };
  });
}

function validatePlatform(platform: string): SocialPlatform {
  const valid: SocialPlatform[] = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'];
  return valid.includes(platform as SocialPlatform) ? platform as SocialPlatform : 'instagram';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
