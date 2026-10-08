import { getAIProvider } from './provider';
import { COPYWRITER_SYSTEM } from './copywriter';
import type {
  CaptionEngineInput,
  CaptionEngineResult,
  GeneratedCaption,
  CaptionStyle,
} from './engines';

const DEFAULT_STYLES: CaptionStyle[] = ['original', 'short', 'long', 'storytelling', 'educational', 'promotional'];

const STYLE_INSTRUCTIONS: Record<CaptionStyle, string> = {
  original: 'Caption equilibrado y auténtico, como lo escribiría alguien del equipo.',
  short: 'Muy corto (2 o 3 líneas como máximo). Directo, sin relleno.',
  long: 'Detallado (200 a 300 palabras), con información que le sirva al lector.',
  storytelling: 'Narrativo: una situación real o una historia breve que enganche.',
  educational: 'Enseña algo útil concreto: un dato, un error común, una recomendación aplicable.',
  promotional: 'Propuesta de valor clara y CTA fuerte al sitio web (sin promesas de resultados garantizados).',
};

export async function generateCaptions(input: CaptionEngineInput): Promise<CaptionEngineResult> {
  const provider = getAIProvider();
  const styles = input.styles || DEFAULT_STYLES;

  const prompt = `Escribí ${styles.length} captions para una publicación sobre: "${input.topic}"
Plataforma: ${input.platform}
Idioma: ${input.language || 'es'} (español rioplatense, voseo)
Tono: ${input.tone || 'cercano'}
Público: ${input.audience || 'general'}
${input.hook ? `Gancho a desarrollar: ${input.hook}` : ''}
${input.cta ? `CTA obligatoria (incluila de forma natural): ${input.cta}` : ''}

Reglas (obligatorias):
- Que suene a persona escribiendo, no a IA: nada de "en este post", "descubrí el poder de", "sumérgete", listas genéricas de beneficios ni lenguaje corporativo.
- Primera línea que detenga el scroll, desarrollo concreto (ejemplos, números) y cierre que lleve al sitio web.
- Cada estilo distinto de verdad: no reescribas la misma frase con otras palabras.
- Terminá con un CTA al sitio web${input.cta ? '' : ' (usá la URL del cliente si la tenés; si no, una invitación clara a entrar)'}.

Un caption por cada estilo:
${styles.map((s, i) => `${i + 1}. ${s.toUpperCase()}: ${STYLE_INSTRUCTIONS[s]}`).join('\n')}

Respondé SOLO con JSON array: [{ "text": "...", "style": "...", "wordCount": 0, "score": 0 }]`;

  const result = await provider.generateText({
    prompt,
    system_prompt: COPYWRITER_SYSTEM,
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
