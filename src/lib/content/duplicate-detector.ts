import { createHash } from 'crypto';
import {
  normalizeText,
  tokenize,
  jaccardSimilarity,
  levenshteinNormalized,
  textSimilarity,
  DUPLICATE_SIMILARITY_THRESHOLD,
} from '../../../shared/text-similarity.ts';

// Re-export: el algoritmo vive en shared/text-similarity.ts (único para
// src/ y convex/). No reimplementarlo acá.
export { textSimilarity, DUPLICATE_SIMILARITY_THRESHOLD };

export interface ContentFingerprintInput {
  /** Texto principal (hook + body + cta) */
  text: string;
  /** Hash perceptual de imagen (opcional) */
  media_hash?: string;
  /** Caption completa */
  caption?: string;
  /** Hashtags normalizados */
  hashtags?: string[];
  /** Metadatos visuales para fingerprint extendido (Módulo 3) */
  visual_meta?: {
    persona?: { gender?: string; age_range?: string; style?: string };
    location?: string;
    action?: string;
    framing?: string;
    lighting?: string;
    cta?: string;
  };
}

export interface ContentFingerprint {
  /** Hash del texto normalizado (para dedup exacto) */
  text_hash: string;
  /** Hash perceptual de imagen */
  media_hash: string | null;
  /** Hash del caption */
  caption_hash: string | null;
  /** Hash de hashtags ordenados */
  hashtags_hash: string | null;
  /** Hash combinado para lookup O(1) de duplicados exactos */
  combined_hash: string;
  /** Texto original (para similitud semántica) — NO se guarda en BD, solo en memoria */
  _original_text?: string;
  /** Caption original */
  _original_caption?: string;
  /** Hashtags originales (sin #, en minúscula) para comparación */
  _original_hashtags?: string[];
  /** Visual meta para fingerprint rico */
  visual_meta?: ContentFingerprintInput['visual_meta'];
}

/** Input para detectDuplicates: candidato + fingerprints existentes */
export interface DuplicateCheckInput extends ContentFingerprintInput {
  existing_fingerprints: ContentFingerprint[];
  /** Umbral de similitud (0-1). Default 0.75 */
  similarity_threshold?: number;
}

/** Resultado de check de duplicados con scoring detallado */
export interface DuplicateCheckResult {
  is_duplicate: boolean;
  similarity_score: number;
  /** Desglose por componente para debugging */
  breakdown: {
    text: number;
    caption: number;
    hashtags: number;
    media: number;
    visual: number;
  };
  matched_fingerprint: ContentFingerprint | null;
}

/** Hash SHA256 hex */
function calculateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Calcula fingerprint completo.
 * Guarda hashes para dedup exacto + texto original para similitud semántica.
 */
export function calculateFingerprint(input: ContentFingerprintInput): ContentFingerprint {
  const normText = normalizeText(input.text);
  const normCaption = input.caption ? normalizeText(input.caption) : '';
  const normHashtags = input.hashtags?.length
    ? input.hashtags.map(h => h.toLowerCase().replace(/^#/, '')).sort().join(' ')
    : '';

  const textHash = calculateHash(normText);
  const mediaHash = input.media_hash ? calculateHash(input.media_hash) : null;
  const captionHash = normCaption ? calculateHash(normCaption) : null;
  const hashtagsHash = normHashtags ? calculateHash(normHashtags) : null;

  const parts = [textHash, mediaHash, captionHash, hashtagsHash].filter(Boolean).join(':');

  return {
    text_hash: textHash,
    media_hash: mediaHash,
    caption_hash: captionHash,
    hashtags_hash: hashtagsHash,
    combined_hash: calculateHash(parts),
    // Campos privados para similitud (no persistir en BD)
    _original_text: normText,
    _original_caption: normCaption,
    _original_hashtags: input.hashtags?.map(h => h.toLowerCase().replace(/^#/, '')),
    visual_meta: input.visual_meta,
  };
}

/**
 * Detecta duplicados con similitud semántica real.
 * - Exact match: combined_hash idéntico → 1.0 inmediato
 * - Semántico: Jaccard(tokens) en texto + caption + Levenshtein en hooks/CTAs
 * - Visual: comparación de meta visual (persona, ubicación, acción, encuadre, luz)
 */
export function detectDuplicates(input: DuplicateCheckInput): DuplicateCheckResult {
  const threshold = input.similarity_threshold ?? DUPLICATE_SIMILARITY_THRESHOLD;
  const fingerprint = calculateFingerprint(input);

  // 1. Duplicado exacto (hash combinado)
  for (const existing of input.existing_fingerprints) {
    if (fingerprint.combined_hash === existing.combined_hash) {
      return {
        is_duplicate: true,
        similarity_score: 1,
        breakdown: { text: 1, caption: 1, hashtags: 1, media: 1, visual: 1 },
        matched_fingerprint: existing,
      };
    }
  }

  // 2. Similitud semántica ponderada
  let bestMatch: ContentFingerprint | null = null;
  let bestScore = 0;
  let bestBreakdown = { text: 0, caption: 0, hashtags: 0, media: 0, visual: 0 };

  const newTextTokens = tokenize(fingerprint._original_text || '');
  const newCaptionTokens = fingerprint._original_caption ? tokenize(fingerprint._original_caption) : new Set<string>();
  const newHashtags = new Set(fingerprint._original_hashtags || []);

  for (const existing of input.existing_fingerprints) {
    // Texto (50%)
    const existingTextTokens = existing._original_text
      ? tokenize(existing._original_text)
      : new Set<string>();
    const textSim = jaccardSimilarity(newTextTokens, existingTextTokens);

    // Caption (20%)
    const existingCaptionTokens = existing._original_caption
      ? tokenize(existing._original_caption)
      : new Set<string>();
    const captionSim = newCaptionTokens.size > 0 && existingCaptionTokens.size > 0
      ? jaccardSimilarity(newCaptionTokens, existingCaptionTokens)
      : 0;

    // Hashtags (10%) — Jaccard sobre las listas originales
    const existingHashtags = new Set(existing._original_hashtags || []);
    const hashtagsSim =
      newHashtags.size > 0 && existingHashtags.size > 0
        ? jaccardSimilarity(newHashtags, existingHashtags)
        : 0;

    // Media (10%) — hash perceptual exacto
    const mediaSim = fingerprint.media_hash && existing.media_hash && fingerprint.media_hash === existing.media_hash ? 1 : 0;

    // Visual (10%) — fingerprint rico Módulo 3
    let visualSim = 0;
    if (fingerprint.visual_meta && existing.visual_meta) {
      const vm1 = fingerprint.visual_meta;
      const vm2 = existing.visual_meta;
      let matches = 0, total = 0;
      for (const key of ['persona', 'location', 'action', 'framing', 'lighting', 'cta'] as const) {
        total++;
        const v1 = vm1[key];
        const v2 = vm2[key];
        if (v1 && v2) {
          if (typeof v1 === 'object' && typeof v2 === 'object') {
            // persona: comparar gender, age_range, style
            const o1 = v1 as Record<string, string>;
            const o2 = v2 as Record<string, string>;
            const kMatches = Object.keys(o1).filter(k => o1[k] && o2[k] && o1[k] === o2[k]).length;
            if (kMatches > 0) matches += kMatches / Object.keys(o1).length;
          } else if (v1 === v2) {
            matches++;
          }
        }
      }
      visualSim = total > 0 ? matches / total : 0;
    }

    // Score ponderado
    const weighted =
      textSim * 0.50 +
      captionSim * 0.20 +
      hashtagsSim * 0.10 +
      mediaSim * 0.10 +
      visualSim * 0.10;

    if (weighted > bestScore) {
      bestScore = weighted;
      bestMatch = existing;
      bestBreakdown = { text: textSim, caption: captionSim, hashtags: hashtagsSim, media: mediaSim, visual: visualSim };
    }
  }

  return {
    is_duplicate: bestScore >= threshold,
    similarity_score: bestScore,
    breakdown: bestBreakdown,
    matched_fingerprint: bestMatch,
  };
}
