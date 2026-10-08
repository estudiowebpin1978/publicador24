// Marketing Engine — orquestador genérico de contenido.
// Pipeline: IDEA → HOOK → FINGERPRINT (anti-repetición) → PROMPT VISUAL →
//           IMAGEN → CAPTION → CALIDAD → CALENDARIO → BIBLIOTECA
//
// Es universal: no está atado a ningún nicho. El nicho, la audiencia, la URL
// de CTA y el cumplimiento (+18/disclaimers) los define cada campaña.
// Reusa los engines existentes en src/lib/ai y src/lib/content (tipados, sin any).

import type { SocialPlatform, AIScoreBreakdown } from '@/types';
import type { ContentPillar, CaptionStyle } from '../ai/engines';
import { generateHooks } from '../ai/hook-engine';
import { generateIdeas } from '../ai/idea-generator';
import { generateCaptions } from '../ai/caption-engine';
import {
  calculateFingerprint,
  detectDuplicates,
  type ContentFingerprint,
  type ContentFingerprintInput,
} from '../content/duplicate-detector';
import { scoreContent } from '../content/scoring';
import type { MarketingCompliance } from './compliance';
import { DEFAULT_SITE_URL } from '../ai/copywriter';

export { resolveMarketingCompliance } from './compliance';
export type { MarketingCompliance } from './compliance';

export interface MarketingOptions {
  /** Nicho o tema de la campaña, p. ej. "climatización de piscinas en Rosario". */
  niche?: string;
  audience?: string;
  platforms?: SocialPlatform[];
  tone?: string;
  language?: string;
  country?: string;
  /** Voz de marca usada en el scoring. */
  brandVoice?: string;
  campaignId?: string;
  /** true = no llama a IA ni imágenes (gratis, determinista). */
  demoMode?: boolean;
  compliance?: MarketingCompliance;
  /** Semilla de variación para lotes (persona/ubicación/encuadre). */
  variantSeed?: number;
}

export interface MarketingPiece {
  id: string;
  hook: string;
  idea: string;
  category: string;
  caption: string;
  hashtags: string[];
  cta: string;
  imagePrompt: string;
  imageUrl: string;
  platform: SocialPlatform;
  qualityScore: number;
  qualityBreakdown: AIScoreBreakdown;
  fingerprint: ContentFingerprint;
  calendarSlot: CalendarSlot;
  status: 'draft' | 'approved';
}

export interface MarketingCampaign {
  id: string;
  name: string;
  objective: string;
  pieces: MarketingPiece[];
}

export interface MarketingResult {
  campaign: MarketingCampaign;
  piecesGenerated: number;
  duplicatesBlocked: number;
  averageQualityScore: number;
  demoMode: boolean;
}

export interface CalendarSlot {
  date: string;
  day: string;
  slotType: string;
  hour: string;
}

const DEFAULT_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'youtube'];

const HASHTAG_SETS: string[][] = [
  ['#tips', '#aprende', '#argentina', '#emprendedores', '#estrategia'],
  ['#datoss', '#analisis', '#tendencias', '#innovacion', '#inteligenciaartificial'],
  ['#crecimiento', '#marketing', '#contenido', '#redessociales', '#viral'],
];

/** DEMO_MODE=true evita toda llamada costosa (IA, imágenes, storage). */
function isDemo(options: MarketingOptions): boolean {
  return options.demoMode ?? process.env.DEMO_MODE === 'true';
}

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

/**
 * Genera una pieza completa siguiendo el pipeline del motor.
 * En demoMode no realiza ninguna llamada externa.
 */
export async function generateMarketingPiece(
  ideaInput: string,
  options: MarketingOptions = {}
): Promise<MarketingPiece> {
  const demo = isDemo(options);
  const platform: SocialPlatform = options.platforms?.[0] || DEFAULT_PLATFORMS[0];
  const seed = options.variantSeed ?? Date.now();
  const niche = options.niche || ideaInput;
  const audience = options.audience || 'audiencia general argentina';

  // 1. IDEA + CATEGORÍA
  const idea = demo
    ? demoIdea(ideaInput)
    : await generateOneIdea(ideaInput, { ...options, platforms: options.platforms || DEFAULT_PLATFORMS });

  // 2. HOOK — rotación por variante
  const hook = demo
    ? pick(DEMO_HOOKS, seed)
    : await generateOneHook(idea.title, audience, options.tone, platform);

  // 3. FINGERPRINT — anti-repetición (texto real, no hash)
  const hashtags = pick(HASHTAG_SETS, seed);
  const fingerprint = calculateFingerprint({
    text: `${hook} ${idea.title} ${idea.angle}`,
    caption: idea.description,
    hashtags,
    visual_meta: buildVisualMeta(seed),
  } satisfies ContentFingerprintInput);

  // 4. PROMPT VISUAL
  const imagePrompt = buildVisualPrompt(hook, idea.title, fingerprint.visual_meta);

  // 5. IMAGEN — en demo no se genera; la provee la campaña (assets propios)
  let imageUrl = '';
  if (!demo) {
    try {
      const { generateImageWithFallback } = await import('../ai/multi-image');
      const res = await generateImageWithFallback(imagePrompt, '4:5');
      imageUrl = res.url;
    } catch {
      /* sin proveedor de imagen: queda sin URL y la campaña aporta la suya */
      imageUrl = '';
    }
  }

  // 6. CAPTION
  const caption = demo
    ? pick(DEMO_CAPTIONS, seed)
    : await generateOneCaption(idea.title, hook, platform, options);

  // 7. CTA + HASHTAGS — siempre con URL (sitio por defecto si no hay ctaUrl)
  const ctaUrl = options.compliance?.ctaUrl ?? DEFAULT_SITE_URL;
  const cta = `Mirá más → ${ctaUrl}`;

  // 8. CALIDAD
  const quality = scoreContent({
    content: caption,
    platform,
    hook,
    hashtags,
    cta,
    language: options.language || 'es',
  });

  // 9. RESPONSABILIDAD — solo si la campaña lo requiere
  const finalCaption = applyCompliance(caption, hashtags, cta, options.compliance);

  return {
    id: `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    hook,
    idea: idea.title,
    category: idea.pillar,
    caption: finalCaption,
    hashtags,
    cta,
    imagePrompt,
    imageUrl,
    platform,
    qualityScore: quality.overall,
    qualityBreakdown: quality.breakdown,
    fingerprint,
    calendarSlot: assignCalendarSlot(seed),
    status: quality.overall >= 70 ? 'approved' : 'draft',
  };
}

/**
 * Lote (Módulo 25): 1 / 5 / 10 / 20 / 30 piezas distintas.
 * Cada pieza se verifica contra las anteriores; si supera el umbral de
 * similitud se reintenta con otra variante (máx. 3 intentos).
 */
export async function generateBatch(
  count: number,
  baseIdea: string,
  options: MarketingOptions = {}
): Promise<MarketingResult> {
  const pieces: MarketingPiece[] = [];
  const fingerprints: ContentFingerprint[] = [];
  let duplicatesBlocked = 0;
  const threshold = 0.75;

  for (let i = 0; i < count; i++) {
    let accepted: MarketingPiece | null = null;

    for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
      const seed = (options.variantSeed ?? 0) + i * 7 + attempt * 131;
      const piece = await generateMarketingPiece(baseIdea, {
        ...options,
        variantSeed: seed,
      });

      const check = detectDuplicates({
        text: `${piece.hook} ${piece.idea}`,
        caption: piece.caption,
        hashtags: piece.hashtags,
        existing_fingerprints: fingerprints,
        similarity_threshold: threshold,
      });

      if (check.is_duplicate) {
        duplicatesBlocked++;
        if (attempt === 2) accepted = piece; // último intento: se conserva
      } else {
        accepted = piece;
      }
    }

    if (accepted) {
      pieces.push(accepted);
      fingerprints.push(accepted.fingerprint);
    }
  }

  const avgScore = pieces.reduce((s, p) => s + p.qualityScore, 0) / Math.max(pieces.length, 1);

  return {
    campaign: {
      id: `batch_${Date.now()}`,
      name: `Campaña: ${baseIdea.slice(0, 60)}`,
      objective: options.audience || 'Alcance y engagement',
      pieces,
    },
    piecesGenerated: pieces.length,
    duplicatesBlocked,
    averageQualityScore: Math.round(avgScore),
    demoMode: isDemo(options),
  };
}

// ============================================================
// Helpers internos
// ============================================================

async function generateOneIdea(
  ideaInput: string,
  options: MarketingOptions
): Promise<{ title: string; angle: string; pillar: string; description: string }> {
  try {
    const pillars: ContentPillar[] = [
      { type: 'educational', name: 'Educación', percentage: 40 },
      { type: 'entertainment', name: 'Entretenimiento', percentage: 30 },
      { type: 'promotional', name: 'Promocional', percentage: 30 },
    ];
    const result = await generateIdeas({
      niche: `${options.niche || ideaInput}. ${ideaInput}`,
      language: options.language || 'es',
      country: options.country || 'AR',
      audience: options.audience,
      platforms: options.platforms || DEFAULT_PLATFORMS,
      contentPillars: pillars,
      count: 1,
    });
    const first = result.ideas[0];
    if (first) {
      return {
        title: first.title || ideaInput,
        angle: first.angle,
        pillar: first.pillar,
        description: first.description,
      };
    }
  } catch {
    /* sin IA disponible: se usa la idea directa */
  }
  return demoIdea(ideaInput);
}

function demoIdea(ideaInput: string): {
  title: string;
  angle: string;
  pillar: string;
  description: string;
} {
  return {
    title: ideaInput.slice(0, 90),
    angle: 'Ángulo práctico con ejemplo concreto',
    pillar: 'educational',
    description: ideaInput,
  };
}

async function generateOneHook(
  topic: string,
  audience: string,
  tone: string | undefined,
  platform: SocialPlatform
): Promise<string> {
  try {
    const result = await generateHooks({
      topic,
      audience,
      tone: tone || 'cercano natural',
      language: 'es',
      platform,
      count: 3,
    });
    const chosen = pick(result.hooks, Date.now());
    if (chosen?.text) return chosen.text;
  } catch {
    /* fallback */
  }
  return pick(DEMO_HOOKS, Date.now());
}

async function generateOneCaption(
  topic: string,
  hook: string,
  platform: SocialPlatform,
  options: MarketingOptions
): Promise<string> {
  try {
    const styles: CaptionStyle[] = ['short', 'storytelling', 'educational', 'promotional'];
    const result = await generateCaptions({
      topic: options.niche ? `${topic} (${options.niche})` : topic,
      hook,
      platform,
      language: options.language || 'es',
      tone: options.tone || 'cercano',
      audience: options.audience,
      cta: options.compliance?.ctaUrl,
      styles,
    });
    const text = result.bestCaption?.text || result.captions[0]?.text;
    if (text) return text;
  } catch {
    /* fallback */
  }
  return pick(DEMO_CAPTIONS, Date.now());
}

function applyCompliance(
  caption: string,
  hashtags: string[],
  cta: string,
  compliance?: MarketingCompliance
): string {
  const parts: string[] = [];
  if (compliance?.disclaimer) parts.push(compliance.disclaimer);
  if (compliance?.ageRestricted) parts.push('+18');
  parts.push(caption, hashtags.join(' '));
  // El CTA ya contiene la URL ("Mirá más → ..."), se agrega completo para no
  // perder el texto de invitación.
  parts.push(cta);
  return parts.filter(Boolean).join('\n\n');
}

function buildVisualMeta(seed: number): ContentFingerprintInput['visual_meta'] {
  return {
    persona: {
      gender: seed % 2 === 0 ? 'mujer' : 'hombre',
      age_range: '25-40',
      style: 'casual argentino moderno',
    },
    location: pick(['café', 'bar', 'casa', 'calle', 'oficina'], seed),
    action: pick(['mirar teléfono', 'analizar datos', 'consultar app', 'comparar opciones'], seed),
    framing: pick(['primer plano', 'plano medio', 'POV', 'detalle dispositivo'], seed),
    lighting: pick(['luz natural tarde', 'interior cálido', 'luz de pantalla', 'mañana'], seed),
  };
}

export function buildVisualPrompt(
  hook: string,
  idea: string,
  meta: ContentFingerprintInput['visual_meta']
): string {
  if (meta) {
    const persona = meta.persona;
    return (
      `Fotografía realista, 1080x1350, persona ${persona?.gender || 'adulta'} ` +
      `${persona?.age_range || '25-40'} ${persona?.style || 'casual argentina'}, ` +
      `ubicación ${meta.location || 'café/ciudad'}, acción ${meta.action || 'usando teléfono'}, ` +
      `encuadre ${meta.framing || 'plano medio'}, iluminación ${meta.lighting || 'natural tarde'}, ` +
      `smartphone visible de forma natural, sin logo gigante, sin cartoons, ` +
      `sin texto ficticio en pantalla. Hook: "${hook}". Idea: ${idea}.`
    );
  }
  return (
    `Fotografía realista, 1080x1350, persona adulta argentina usando el celular, ` +
    `luz natural, estilo UGC. Hook: "${hook}".`
  );
}

/** Slot del calendario según el día (Módulo 14). */
export function assignCalendarSlot(seed: number): CalendarSlot {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const d = new Date();
  const day = days[d.getDay()];
  const slotTypes: Record<string, string> = {
    Lunes: 'educativo',
    Martes: 'ugc',
    Miércoles: 'producto',
    Jueves: 'curiosidad',
    Viernes: 'estadístico',
    Sábado: 'storytelling',
    Domingo: 'ligero',
  };
  const hours = ['12:00', '19:00', '21:00'];
  return {
    date: d.toISOString().split('T')[0],
    day,
    slotType: slotTypes[day] || 'curiosidad',
    hour: pick(hours, seed),
  };
}

// Contenido de respaldo para demoMode (sin llamadas externas)
const DEMO_HOOKS: string[] = [
  'La mayoría hace esto mal desde el primer intento',
  'Probé esto 30 días y esto es lo que pasó',
  '3 errores que todos cometen (y el último es caro)',
  'Si recién arrancás, leé esto antes de gastar plata',
  'Nadie te contó esto, pero es más simple de lo que parece',
];

const DEMO_CAPTIONS: string[] = [
  'Arrancamos simple: primero entendés el problema, después elegís la solución. Sin vueltas y sin promesas mágicas.\n\n¿Ya lo probaste? Contame en los comentarios.',
  'Lo que nadie te dice: la constancia gana siempre. Por eso armamos una guía corta, práctica y sin humo.\n\nGuardalo que te va a servir.',
  'Paso 1: mirá los datos. Paso 2: compará opciones. Paso 3: decidí con información y no con suerte.\n\n¿Qué paso es el que más te cuesta?',
];
