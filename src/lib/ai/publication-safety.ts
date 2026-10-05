import {
  textSimilarity,
  DUPLICATE_SIMILARITY_THRESHOLD,
} from '../../../shared/text-similarity.ts';
import { findProhibitedClaims } from '../../../shared/prohibited-claims.ts';

// Control de seguridad previo a publicar.
// El detector de duplicados vive en shared/text-similarity.ts (Jaccard +
// Levenshtein): este módulo SOLO delega ahí, para que no existan dos
// algoritmos distintos compitiendo.

interface SafetyCheckResult {
  approved: boolean;
  safetyScore: number;
  checks: {
    fingerprint: { pass: boolean; reason?: string };
    spamRisk: { pass: boolean; score: number; reason?: string };
    duplicate: { pass: boolean; reason?: string };
    claims: { pass: boolean; reason?: string };
    length: { pass: boolean; reason?: string };
    capsRatio: { pass: boolean; reason?: string };
    emojiRatio: { pass: boolean; reason?: string };
  };
  reason?: string;
}

/** Umbral único: se importa de shared/text-similarity.ts (DUPLICATE_SIMILARITY_THRESHOLD). */

function checkSpamRisk(text: string): { score: number; pass: boolean; reason?: string } {
  const capsRatio = (text.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length) / Math.max(text.length, 1);
  const exclamationCount = (text.match(/!/g) || []).length;
  const emojiCount = (text.match(/[\u{1F600}-\u{1F9FF}]/gu) || []).length;
  // 'sorteo' y 'ganador' NO están acá: son términos propios de una campaña de
  // resultados de quiniela/sorteos y marcarlos como spam bloquearía contenido
  // legítimo del nicho.
  const spammyWords = ['gratis', 'click aquí', 'actúa ahora', 'última oportunidad', 'no te lo pierdas'];
  const foundSpammy = spammyWords.filter(w => text.toLowerCase().includes(w));

  let score = 0;
  if (capsRatio > 0.3) score += 30;
  if (exclamationCount > 3) score += 20;
  if (emojiCount > 5) score += 15;
  if (foundSpammy.length > 0) score += 25 * foundSpammy.length;

  const pass = score < 50;
  const reason = !pass ? `Spam risk ${score}/100: ${capsRatio > 0.3 ? 'too many caps ' : ''}${foundSpammy.length > 0 ? `spammy words: ${foundSpammy.join(', ')}` : ''}`.trim() : undefined;

  return { score, pass, reason };
}

/**
 * Compara contra el contenido existente usando el detector único del sistema.
 * `existingTexts` son los textos (hook + caption) ya publicados/programados.
 */
function checkDuplicateContent(
  hook: string,
  caption: string,
  existingTexts: string[]
): { pass: boolean; reason?: string; similarity: number } {
  const candidate = `${hook} ${caption}`;
  let best = 0;
  for (const existing of existingTexts) {
    const similarity = textSimilarity(candidate, existing);
    if (similarity > best) best = similarity;
    if (best >= DUPLICATE_SIMILARITY_THRESHOLD) break;
  }
  const isDuplicate = best >= DUPLICATE_SIMILARITY_THRESHOLD;
  return {
    pass: !isDuplicate,
    similarity: best,
    reason: isDuplicate
      ? `Contenido demasiado similar al existente (${Math.round(best * 100)}% ≥ ${Math.round(DUPLICATE_SIMILARITY_THRESHOLD * 100)}%)`
      : undefined,
  };
}
export async function checkPublicationSafety(
  _contentPieceId: string,
  hook: string,
  caption: string,
  platform: string,
  existingTexts: string[] = []
): Promise<SafetyCheckResult> {
  const spamCheck = checkSpamRisk(`${hook} ${caption}`);
  const duplicateCheck = checkDuplicateContent(hook, caption, existingTexts);
  // Promesas prohibidas: ganancia garantizada / estadísticas de ganancias
  // inventadas. Compartido con Convex (shared/prohibited-claims.ts).
  const prohibited = findProhibitedClaims(`${hook} ${caption}`);
  const claimsCheck = {
    pass: prohibited.length === 0,
    reason:
      prohibited.length > 0
        ? `Promesa prohibida: ${prohibited.join(", ")}`
        : undefined,
  };
  const lengthCheck = {
    pass: caption.length >= 50 && caption.length <= 2200,
    reason: caption.length < 50 ? 'Caption demasiado corta (< 50 caracteres)' : caption.length > 2200 ? 'Caption demasiado larga (> 2200 caracteres)' : undefined,
  };
  const capsCheck = {
    pass: (caption.replace(/[^A-Z]/g, '').length / Math.max(caption.length, 1)) < 0.4,
    reason: undefined as string | undefined,
  };
  if (!capsCheck.pass) capsCheck.reason = 'Demasiadas mayúsculas';

  const emojiCheck = {
    pass: true,
    reason: undefined as string | undefined,
  };

  const checks: SafetyCheckResult['checks'] = {
    fingerprint: { pass: true, reason: `plataforma ${platform}` },
    spamRisk: { pass: spamCheck.pass, score: spamCheck.score, reason: spamCheck.reason },
    duplicate: { pass: duplicateCheck.pass, reason: duplicateCheck.reason },
    claims: claimsCheck,
    length: lengthCheck,
    capsRatio: capsCheck,
    emojiRatio: emojiCheck,
  };

  const allPassed = Object.values(checks).every(c => c.pass);
  const safetyScore = allPassed
    ? Math.max(70, Math.round((1 - duplicateCheck.similarity) * 100))
    : Math.max(
        0,
        100 -
          (spamCheck.score || 0) -
          Math.round(duplicateCheck.similarity * 50) -
          (claimsCheck.pass ? 0 : 60)
      );

  const failedReasons = Object.values(checks)
    .filter(c => !c.pass)
    .map(c => ('reason' in c ? c.reason : undefined))
    .filter(Boolean)
    .join('; ');

  return {
    approved: allPassed,
    safetyScore,
    checks,
    reason: allPassed ? undefined : failedReasons,
  };
}
