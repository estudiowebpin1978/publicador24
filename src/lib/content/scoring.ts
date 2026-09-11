import type { SocialPlatform } from '@/types';
import type { AIScoreBreakdown } from '@/types';
import { PLATFORMS } from '@/lib/config/platforms';

export interface ScoreInput {
  content: string;
  platform: SocialPlatform;
  hook?: string;
  hashtags?: string[];
  cta?: string;
  language?: string;
}

export interface ScoreResult {
  overall: number;
  breakdown: AIScoreBreakdown;
  explanation: string;
  suggestions: string[];
}

const WEIGHTS: Record<keyof Omit<AIScoreBreakdown, 'spam_risk' | 'overall'>, number> = {
  hook: 0.15,
  relevance: 0.15,
  clarity: 0.1,
  emotion: 0.1,
  trend: 0.15,
  hashtags: 0.1,
  platform_fit: 0.15,
  cta: 0.1,
};

function scoreHook(hook: string | undefined, content: string): number {
  const text = hook || content.slice(0, 100);
  let score = 50;

  if (text.length < 10) score -= 20;
  if (text.length > 200) score -= 10;

  const powerWords = /\b(gratis|secreto|descubre|increíble|exclusivo|urgente|nuevo|ahora)\b/i;
  if (powerWords.test(text)) score += 15;

  const numbers = /\d+/;
  if (numbers.test(text)) score += 10;

  const question = /\?|¿/;
  if (question.test(text)) score += 5;

  const emojis = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u;
  if (emojis.test(text)) score += 5;

  return Math.max(0, Math.min(100, score));
}

function scoreRelevance(content: string, platform: SocialPlatform): number {
  let score = 60;

  const platformLimits = PLATFORMS[platform];
  if (platformLimits) {
    const maxLength = platformLimits.limits.maxCaptionLength;
    const ratio = content.length / maxLength;
    if (ratio > 0.1 && ratio < 0.8) score += 15;
    if (ratio > 0.8) score -= 10;
  }

  const words = content.split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 5) score += 10;

  return Math.max(0, Math.min(100, score));
}

function scoreClarity(content: string): number {
  let score = 70;

  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  if (avgSentenceLength > 15) score -= 10;
  if (avgSentenceLength < 5) score -= 5;

  const paragraphs = content.split(/\n\n+/);
  if (paragraphs.length > 1 && paragraphs.length <= 3) score += 10;

  return Math.max(0, Math.min(100, score));
}

function scoreEmotion(content: string): number {
  let score = 50;

  const emotionWords =
    /\b(amor|odio|alegría|tristeza|asco|miedo|sorpresa|esperanza|orgullo|gratitud|empatía|pasión)\b/gi;
  const emotionMatches = content.match(emotionWords);
  score += Math.min(30, (emotionMatches?.length || 0) * 10);

  const exclamations = (content.match(/!/g) || []).length;
  score += Math.min(10, exclamations * 2);

  return Math.max(0, Math.min(100, score));
}

function scoreHashtags(hashtags: string[] | undefined): number {
  if (!hashtags || hashtags.length === 0) return 30;

  let score = 50;

  if (hashtags.length >= 3 && hashtags.length <= 15) score += 20;
  if (hashtags.length > 20) score -= 15;

  const avgLength = hashtags.reduce((sum, h) => sum + h.length, 0) / hashtags.length;
  if (avgLength >= 8 && avgLength <= 20) score += 10;

  const unique = new Set(hashtags.map((h) => h.toLowerCase()));
  if (unique.size === hashtags.length) score += 10;

  return Math.max(0, Math.min(100, score));
}

function scorePlatformFit(content: string, platform: SocialPlatform): number {
  let score = 60;

  const limits = PLATFORMS[platform]?.limits;
  if (limits) {
    if (content.length <= limits.maxCaptionLength) score += 20;
    else score -= 30;
  }

  const platformFeatures: Record<string, RegExp[]> = {
    instagram: [/#\w+/g, /[\u{1F300}-\u{1F5FF}]/u],
    tiktok: [/#fyp|#viral|#foryou/i],
    x: [/https?:\/\/\S+/g],
    linkedin: [/\b(profesional|empresa|industria|estrategia)\b/i],
    youtube: [/\b(suscríbete|like|comenta)\b/i],
    facebook: [/\b(comparte|comenta|marca)\b/i],
  };

  const patterns = platformFeatures[platform] || [];
  for (const pattern of patterns) {
    if (pattern.test(content)) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreCTA(cta: string | undefined): number {
  if (!cta) return 30;

  let score = 50;

  if (cta.length > 10 && cta.length < 100) score += 15;

  const actionWords = /\b(comparte|guarda|comenta|suscríbete|visita|haz clic|descubre|aprende|únete)\b/i;
  if (actionWords.test(cta)) score += 15;

  const urgency = /\b(ahora|hoy|ya|no esperes|última|urgente)\b/i;
  if (urgency.test(cta)) score += 5;

  return Math.max(0, Math.min(100, score));
}

function generateExplanation(overall: number): string {
  if (overall >= 80) return 'Excelente contenido. Optimizado para máxima engagement.';
  if (overall >= 60) return 'Buen contenido con margen de mejora en áreas específicas.';
  if (overall >= 40) return 'Contenido mediocre. Requiere optimización significativa.';
  return 'Contenido por debajo del estándar. Necesita reestructuración completa.';
}

function generateSuggestions(breakdown: AIScoreBreakdown): string[] {
  const suggestions: string[] = [];

  if (breakdown.hook < 60) suggestions.push('Mejora el gancho inicial con preguntas o datos impactantes');
  if (breakdown.relevance < 60) suggestions.push('Asegúrate de que el contenido sea relevante para tu audiencia');
  if (breakdown.clarity < 60) suggestions.push('Simplifica las oraciones y usa un lenguaje más directo');
  if (breakdown.emotion < 60) suggestions.push('Incluye palabras que generen emociones en el lector');
  if (breakdown.hashtags < 60) suggestions.push('Optimiza los hashtags: mezcla populares y de nicho');
  if (breakdown.platform_fit < 60) suggestions.push('Adapta el contenido al formato y estilo de la plataforma');
  if (breakdown.cta < 60) suggestions.push('Añade un call-to-action claro y directo');

  return suggestions;
}

export function scoreContent(input: ScoreInput): ScoreResult {
  const hookScore = scoreHook(input.hook, input.content);
  const relevanceScore = scoreRelevance(input.content, input.platform);
  const clarityScore = scoreClarity(input.content);
  const emotionScore = scoreEmotion(input.content);
  const hashtagsScore = scoreHashtags(input.hashtags);
  const platformFitScore = scorePlatformFit(input.content, input.platform);
  const ctaScore = scoreCTA(input.cta);

  const breakdown: AIScoreBreakdown = {
    hook: hookScore,
    relevance: relevanceScore,
    clarity: clarityScore,
    emotion: emotionScore,
    trend: 50,
    hashtags: hashtagsScore,
    platform_fit: platformFitScore,
    cta: ctaScore,
    spam_risk: 0,
    overall: 0,
  };

  const overall = Math.round(
    hookScore * WEIGHTS.hook +
    relevanceScore * WEIGHTS.relevance +
    clarityScore * WEIGHTS.clarity +
    emotionScore * WEIGHTS.emotion +
    50 * WEIGHTS.trend +
    hashtagsScore * WEIGHTS.hashtags +
    platformFitScore * WEIGHTS.platform_fit +
    ctaScore * WEIGHTS.cta
  );

  breakdown.overall = overall;

  return {
    overall,
    breakdown,
    explanation: generateExplanation(overall),
    suggestions: generateSuggestions(breakdown),
  };
}
