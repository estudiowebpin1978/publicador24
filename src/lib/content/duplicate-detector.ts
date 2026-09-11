import { createHash } from 'crypto';

export interface ContentFingerprintInput {
  text: string;
  media_hash?: string;
  caption?: string;
  hashtags?: string[];
}

export interface ContentFingerprint {
  text_hash: string;
  media_hash: string | null;
  caption_hash: string | null;
  hashtags_hash: string | null;
  combined_hash: string;
}

export interface DuplicateCheckInput {
  text: string;
  media_hash?: string;
  caption?: string;
  hashtags?: string[];
  existing_fingerprints: ContentFingerprint[];
  similarity_threshold?: number;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  similarity_score: number;
  matched_fingerprint: ContentFingerprint | null;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateHash(data: string): string {
  return createHash('sha256').update(normalizeText(data)).digest('hex');
}

export function calculateFingerprint(input: ContentFingerprintInput): ContentFingerprint {
  const textHash = calculateHash(input.text);
  const mediaHash = input.media_hash ? calculateHash(input.media_hash) : null;
  const captionHash = input.caption ? calculateHash(input.caption) : null;
  const hashtagsHash = input.hashtags?.length
    ? calculateHash(input.hashtags.sort().join(' '))
    : null;

  const parts = [textHash, mediaHash, captionHash, hashtagsHash]
    .filter(Boolean)
    .join(':');

  return {
    text_hash: textHash,
    media_hash: mediaHash,
    caption_hash: captionHash,
    hashtags_hash: hashtagsHash,
    combined_hash: calculateHash(parts),
  };
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function detectDuplicates(input: DuplicateCheckInput): DuplicateCheckResult {
  const threshold = input.similarity_threshold ?? 0.8;
  const fingerprint = calculateFingerprint(input);

  let bestMatch: ContentFingerprint | null = null;
  let bestSimilarity = 0;

  for (const existing of input.existing_fingerprints) {
    if (fingerprint.combined_hash === existing.combined_hash) {
      return {
        is_duplicate: true,
        similarity_score: 1,
        matched_fingerprint: existing,
      };
    }

    const textSimilarity = calculateSimilarity(fingerprint.text_hash, existing.text_hash);
    const captionSimilarity =
      fingerprint.caption_hash && existing.caption_hash
        ? calculateSimilarity(fingerprint.caption_hash, existing.caption_hash)
        : 0;
    const hashtagsSimilarity =
      fingerprint.hashtags_hash && existing.hashtags_hash
        ? fingerprint.hashtags_hash === existing.hashtags_hash
          ? 1
          : 0
        : 0;

    const weighted =
      textSimilarity * 0.5 +
      (fingerprint.media_hash === existing.media_hash && fingerprint.media_hash ? 0.3 : 0) +
      captionSimilarity * 0.15 +
      hashtagsSimilarity * 0.05;

    if (weighted > bestSimilarity) {
      bestSimilarity = weighted;
      bestMatch = existing;
    }
  }

  return {
    is_duplicate: bestSimilarity >= threshold,
    similarity_score: bestSimilarity,
    matched_fingerprint: bestMatch,
  };
}
