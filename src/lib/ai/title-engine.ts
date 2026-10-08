import { getAIProvider } from './provider';
import { COPYWRITER_SYSTEM } from './copywriter';
import type { TitleEngineInput, TitleEngineResult, GeneratedTitle } from './engines';

export async function generateTitles(input: TitleEngineInput): Promise<TitleEngineResult> {
  const provider = getAIProvider();
  const count = input.count || 5;

  const hooksContext = input.hooks?.length
    ? `\nHooks to consider: ${input.hooks.join(' | ')}`
    : '';

  const prompt = `Generá ${count} títulos para contenido sobre: "${input.topic}"
Plataforma: ${input.platform || 'multi'}
Idioma: ${input.language || 'es'} (español rioplatense, voseo)${hooksContext}

Requisitos:
- Cortos, concretos y como los diría una persona (nunca titular de nota ni frase de IA).
- Que generen curiosidad real sin clickbait ni promesas de resultados garantizados.
- Keyword principal adelante cuando la plataforma lo permita (bueno para SEO).
- Nada de "¡Increíble!", "No te pierdas", "Descubrí el poder de".
- Cada uno con un ángulo distinto.

Respondé SOLO con JSON array: [{ text, clarity, curiosity, relevance, length, platformFit, titleScore }]`;

  const result = await provider.generateText({
    prompt,
    system_prompt: COPYWRITER_SYSTEM,
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
