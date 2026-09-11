import { getAIProvider } from './provider';
import type {
  CaptionEngineInput,
  CaptionEngineResult,
  GeneratedCaption,
  CaptionStyle,
} from './engines';

const DEFAULT_STYLES: CaptionStyle[] = ['original', 'short', 'long', 'storytelling', 'educational', 'promotional'];

const STYLE_INSTRUCTIONS: Record<CaptionStyle, string> = {
  original: 'Write a balanced, authentic caption that feels natural.',
  short: 'Write a very concise caption (max 2-3 lines). Punchy and direct.',
  long: 'Write a detailed caption (200-300 words). In-depth and valuable.',
  storytelling: 'Write a narrative caption using storytelling techniques. Personal or brand story.',
  educational: 'Write an informative caption that teaches something valuable. Include tips or insights.',
  promotional: 'Write a promotional caption with clear value proposition and strong CTA.',
};

export async function generateCaptions(input: CaptionEngineInput): Promise<CaptionEngineResult> {
  const provider = getAIProvider();
  const styles = input.styles || DEFAULT_STYLES;

  const prompt = `Generate captions for a post about: "${input.topic}"
Platform: ${input.platform}
Language: ${input.language || 'es'}
Tone: ${input.tone || 'engaging'}
Audience: ${input.audience || 'general'}
${input.hook ? `Hook: ${input.hook}` : ''}
${input.cta ? `CTA: ${input.cta}` : ''}

Generate one caption for each style:
${styles.map((s, i) => `${i + 1}. ${s.toUpperCase()}: ${STYLE_INSTRUCTIONS[s]}`).join('\n')}

Return JSON array with: text, style, wordCount, score (0-100).`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are a social media copywriter. Write captions that drive engagement.',
    temperature: 0.8,
  });

  const captions = parseCaptions(result.text, styles);
  const bestCaption = captions.reduce((best, c) => c.score > best.score ? c : best, captions[0]);

  return { captions, bestCaption };
}

function parseCaptions(text: string, styles: CaptionStyle[]): GeneratedCaption[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((c: Record<string, unknown>) => ({
        text: String(c.text || c.caption || ''),
        style: validateStyle(String(c.style || 'original')),
        wordCount: Number(c.wordCount || String(c.text || '').split(/\s+/).length),
        score: clamp(Number(c.score || 70)),
      }));
    }
  } catch { /* fallback */ }

  const blocks = text.split(/\n\n+/).filter((b) => b.trim().length > 0);
  return blocks.slice(0, styles.length).map((block, i) => {
    const clean = block.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
    return {
      text: clean,
      style: styles[i] || 'original',
      wordCount: clean.split(/\s+/).length,
      score: clamp(75 - i * 3),
    };
  });
}

function validateStyle(style: string): CaptionStyle {
  const valid: CaptionStyle[] = ['original', 'short', 'long', 'storytelling', 'educational', 'promotional'];
  return valid.includes(style as CaptionStyle) ? style as CaptionStyle : 'original';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
