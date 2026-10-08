import { getAIProvider } from './provider';
import { COPYWRITER_SYSTEM } from './copywriter';
import type { HookEngineInput, HookEngineResult, GeneratedHook, HookType } from './engines';

export async function generateHooks(input: HookEngineInput): Promise<HookEngineResult> {
  const provider = getAIProvider();
  const count = input.count || 5;

  const prompt = `Generá ${count} ganchos (primera línea que frena el scroll) para contenido sobre: "${input.topic}"

Público: ${input.audience || 'general'}
Tono: ${input.tone || 'cercano'}
Idioma: ${input.language || 'es'} (español rioplatense, voseo)
Plataforma: ${input.platform || 'multi'}

Reglas:
- Máximo 10 palabras, como se habla (nunca sonar a titular de nota ni a IA).
- Prohibido: "¿Sabías que...?" vacío, "En este post...", "Descubrí el poder de", promesas de resultados garantizados.
- Concreto: una situación real, un dato o una pregunta que al público le duela o le interesse.
- Cada gancho con un ángulo distinto del anterior.

Tipos a incluir:
1. Curiosity - genera intriga
2. Question - pregunta que engancha
3. Contrarian - desafía una creencia común
4. Benefit - destaca un valor real
5. Fear - toca un punto de dolor
6. Story - arranque narrativo
7. Surprise - giro inesperado
8. Problem - nombra el problema
9. Solution - ofrece la salida
10. List - número concreto

Respondé SOLO con JSON array: [{ "text": "...", "type": "...", "score": 0 }]`;

  const result = await provider.generateText({
    prompt,
    system_prompt: COPYWRITER_SYSTEM,
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
