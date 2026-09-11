import { getAIProvider } from './provider';
import type { HookEngineInput, HookEngineResult, GeneratedHook, HookType } from './engines';

export async function generateHooks(input: HookEngineInput): Promise<HookEngineResult> {
  const provider = getAIProvider();
  const count = input.count || 5;

  const prompt = `Generate ${count} engaging hooks for content about: "${input.topic}"
  
Target audience: ${input.audience || 'general'}
Tone: ${input.tone || 'engaging'}
Language: ${input.language || 'es'}
Platform: ${input.platform || 'multi'}

Hook types to include:
1. Curiosity - Create intrigue
2. Question - Ask something compelling
3. Contrarian - Challenge common beliefs
4. Benefit - Highlight value
5. Fear - Address pain points
6. Story - Narrative approach
7. Surprise - Unexpected angle
8. Problem - Identify issue
9. Solution - Offer answer
10. List - Number-based

Return JSON array with: text, type, score (0-100)`;

  const result = await provider.generateText({
    prompt,
    system_prompt: 'You are an expert content creator and copywriter. Generate hooks that stop the scroll.',
    temperature: 0.8,
  });

  const hooks = parseHooks(result.text, count);
  const topHook = hooks.reduce((best, h) => h.score > best.score ? h : best, hooks[0]);

  return { hooks, topHook };
}

function parseHooks(text: string, count: number): GeneratedHook[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slice(0, count).map((h: Record<string, unknown>) => ({
        text: String(h.text || h.hook || ''),
        type: validateHookType(String(h.type || 'curiosity')),
        score: Math.min(100, Math.max(0, Number(h.score || 70))),
      }));
    }
  } catch { /* fallback */ }

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.slice(0, count).map((line, i) => ({
    text: line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim(),
    type: ['curiosity', 'question', 'contrarian', 'benefit', 'fear', 'story', 'surprise', 'problem', 'solution', 'list'][i % 10] as HookType,
    score: Math.max(50, 90 - i * 5),
  }));
}

function validateHookType(type: string): HookType {
  const valid: HookType[] = ['curiosity', 'question', 'contrarian', 'benefit', 'fear', 'story', 'surprise', 'problem', 'solution', 'list'];
  return valid.includes(type as HookType) ? type as HookType : 'curiosity';
}
