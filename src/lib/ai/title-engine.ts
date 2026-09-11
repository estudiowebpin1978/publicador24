import { getAIProvider } from './provider';
import type { TitleEngineInput, TitleEngineResult, GeneratedTitle } from './engines';

export async function generateTitles(input: TitleEngineInput): Promise<TitleEngineResult> {
  const provider = getAIProvider();
  const count = input.count || 5;

  const hooksContext = input.hooks?.length
    ? `\nHooks to consider: ${input.hooks.join(' | ')}`
    : '';

  const prompt = `Generate ${count} compelling titles for content about: "${input.topic}"
Platform: ${input.platform || 'multi'}
Language: ${input.language || 'es'}${hooksContext}

Requirements:
- Clear and concise
- Generate curiosity
- Relevant to topic
- Platform-appropriate length
- Include power words

Return JSON array with: text, clarity (0-100), curiosity (0-100), relevance (0-100), length (chars), platformFit (0-100), titleScore (0-100)`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are an expert headline copywriter. Create titles that demand attention.',
    temperature: 0.85,
  });

  const titles = parseTitles(result.text, count);
  const topTitle = titles.reduce((best, t) => t.titleScore > best.titleScore ? t : best, titles[0]);

  return { titles, topTitle };
}

function parseTitles(text: string, count: number): GeneratedTitle[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slice(0, count).map((t: Record<string, unknown>) => ({
        text: String(t.text || t.title || ''),
        clarity: clamp(Number(t.clarity || 70)),
        curiosity: clamp(Number(t.curiosity || 70)),
        relevance: clamp(Number(t.relevance || 70)),
        length: Number(t.length || String(t.text || '').length),
        platformFit: clamp(Number(t.platformFit || 70)),
        titleScore: clamp(Number(t.titleScore || 70)),
      }));
    }
  } catch { /* fallback */ }

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.slice(0, count).map((line, i) => {
    const clean = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
    return {
      text: clean,
      clarity: clamp(75 - i * 3),
      curiosity: clamp(80 - i * 4),
      relevance: clamp(70 - i * 2),
      length: clean.length,
      platformFit: clamp(72 - i * 3),
      titleScore: clamp(78 - i * 5),
    };
  });
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
