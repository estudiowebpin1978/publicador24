import type { SocialPlatform } from '@/types';
import { getAIProvider } from './provider';
import { COPYWRITER_SYSTEM } from './copywriter';
import type { RepurposeInput, RepurposeResult, RepurposedVariant } from './engines';

const PLATFORM_SPECS: Record<SocialPlatform, { format: string; maxCaption: number; features: string }> = {
  tiktok: { format: 'short-form video', maxCaption: 2200, features: 'trending sounds, hashtags, duets' },
  instagram: { format: 'reel/carousel/post', maxCaption: 2200, features: 'hashtags, locations, mentions' },
  facebook: { format: 'post/video', maxCaption: 63206, features: 'shares, reactions, groups' },
  x: { format: 'tweet/thread', maxCaption: 280, features: 'threads, polls, media' },
  youtube: { format: 'shorts/video', maxCaption: 5000, features: 'timestamps, cards, end screen' },
  linkedin: { format: 'post/article', maxCaption: 3000, features: 'professional tone, articles' },
};

export async function repurposeContent(input: RepurposeInput): Promise<RepurposeResult> {
  const provider = getAIProvider();
  const platforms = input.targetPlatforms || (['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'] as SocialPlatform[]);

  const prompt = `Adaptá este contenido para cada plataforma (que cada versión suene a persona distinta, no a la misma frase reciclada):

CONTENIDO ORIGINAL:
"${input.originalContent}"

TEMA: ${input.topic}
IDIOMA: ${input.language || 'es'} (español rioplatense, voseo)
TONO: ${input.tone || 'cercano'}
PÚBLICO: ${input.audience || 'general'}

PLATAFORMAS OBJETIVO: ${platforms.join(', ')}

Reglas por plataforma:
- Respetá el formato y la longitud de cada una (X: máximo 280 caracteres; las demás, medias).
- Primera línea que frene el scroll y desarrollo concreto, sin estructura de transcripción.
- Nada de "En este post", "descubrí el poder de", listas genéricas ni promesas de resultados garantizados.
- CTA distinta en cada plataforma, siempre llevando al sitio web.
- Hashtags específicos del tema, en el idioma pedido.

Para cada plataforma creá:
- Hook: primera línea que frene el scroll
- Caption: texto optimizado para esa plataforma
- Hashtags: 5 a 10 hashtags relevantes
- Mentions: cuentas relevantes (o vacío)
- CTA: llamado a la acción con el sitio web
- Format: formato recomendado
- Score: 0 a 100

Respondé SOLO con JSON array: [{ platform, hook, caption, hashtags, mentions, cta, format, score }]`;

  const result = await provider.generateText({
    prompt,
    system_prompt: COPYWRITER_SYSTEM,
    temperature: 0.8,
  });

  const variants = parseRepurposed(result.text, platforms);

  return {
    original: { content: input.originalContent, topic: input.topic },
    variants,
    totalGenerated: variants.length,
  };
}

function parseRepurposed(text: string, platforms: SocialPlatform[]): RepurposedVariant[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((v: Record<string, unknown>) => ({
        platform: validatePlatform(String(v.platform || 'instagram')),
        hook: String(v.hook || ''),
        caption: String(v.caption || ''),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String) : [],
        mentions: Array.isArray(v.mentions) ? v.mentions.map(String) : [],
        cta: String(v.cta || ''),
        format: String(v.format || 'post'),
        score: clamp(Number(v.score || 70)),
      }));
    }
  } catch { /* fallback */ }

  return platforms.map((platform, i) => ({
    platform,
    hook: `Check this out about the topic`,
    caption: `Great content about ${platform}`,
    hashtags: [`#${platform}`, '#content', '#viral'],
    mentions: [],
    cta: 'Follow for more!',
    format: PLATFORM_SPECS[platform]?.format || 'post',
    score: clamp(75 - i * 3),
  }));
}

function validatePlatform(platform: string): SocialPlatform {
  const valid: SocialPlatform[] = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'];
  return valid.includes(platform as SocialPlatform) ? platform as SocialPlatform : 'instagram';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
