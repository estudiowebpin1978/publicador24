// Detección de contenido duplicado — única implementación del sistema.
// La usan tanto la app (src/lib/ai, src/lib/marketing) como Convex
// (convex/actions/safetyCheck.ts) para que no convivan algoritmos distintos.
//
// Algoritmo: Jaccard sobre tokens (stopwords ES) + Levenshtein normalizado.

/** Umbral único: por encima de esto el contenido se considera duplicado. */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.75;

const STOPWORDS = new Set([
  'y', 'o', 'de', 'la', 'el', 'en', 'un', 'una', 'los', 'las', 'del', 'al', 'con', 'por', 'para', 'que', 'se', 'es', 'su', 'sus',
  'a', 'e', 'u', 'ni', 'pero', 'sino', 'como', 'cuando', 'donde', 'quien', 'cual', 'cuales', 'cuyo', 'cuya', 'cuyos', 'cuyas',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas',
  'mi', 'tu', 'nuestro', 'vuestro', 'mio', 'tuya', 'suyo', 'nuestra',
  'me', 'te', 'nos', 'os', 'le', 'les', 'lo',
  'mas', 'menos', 'muy', 'mucho', 'poco', 'todo', 'nada', 'algo', 'alguien', 'nadie',
  'si', 'no', 'ya', 'tambien', 'tampoco', 'solo', 'sola', 'ahora', 'antes', 'despues',
  'http', 'https', 'www', 'com', 'ar', 'vercel', 'app',
]);

/** Normaliza texto: minúsculas, sin acentos, sin puntuación. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokeniza en palabras significativas (filtra stopwords ES). */
export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Similitud de Jaccard entre dos conjuntos de tokens (0-1). */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Distancia de Levenshtein normalizada (0-1, 1 = idéntico). */
export function levenshteinNormalized(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

/**
 * Similitud entre dos textos (0-1).
 * Ponderado: 70% Jaccard (contenido) + 30% Levenshtein (estructura).
 */
export function textSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const lev = levenshteinNormalized(normalizeText(a), normalizeText(b));
  return jaccard * 0.7 + lev * 0.3;
}

/**
 * Similitud máxima entre un candidato y una lista de textos existentes.
 * Devuelve `{ similarity, isDuplicate }` con el umbral único del sistema.
 */
export function maxSimilarityVs(
  candidate: string,
  existingTexts: string[],
  threshold: number = DUPLICATE_SIMILARITY_THRESHOLD
): { similarity: number; isDuplicate: boolean } {
  let best = 0;
  for (const existing of existingTexts) {
    const s = textSimilarity(candidate, existing);
    if (s > best) best = s;
    if (best >= threshold) break;
  }
  return { similarity: best, isDuplicate: best >= threshold };
}
