import type { SocialPlatform } from '@/types';
import { getAIProvider } from './provider';
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

  const prompt = `Generate ${count} content ideas for a niche: "${input.niche}"
Language: ${input.language || 'es'}
Country: ${input.country || 'global'}
Audience: ${input.audience || 'general'}
Platforms: ${platforms.join(', ')}

Content pillars (distribute ideas across these):
${pillars.map((p) => `- ${p.name} (${p.percentage}%): ${p.description || p.type}`).join('\n')}

For each idea provide:
- Title: catchy title
- Hook: attention-grabbing opening
- Angle: unique perspective
- Format: content format (reel, carousel, thread, etc.)
- Platform: best platform
- Pillar: which content pillar
- Score: quality score (0-100)
- Description: brief description

Return JSON array with: title, hook, angle, format, platform, pillar, score, description.`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are a content strategist. Generate creative, engaging content ideas.',
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
