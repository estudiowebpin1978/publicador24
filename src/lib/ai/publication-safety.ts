interface SafetyCheckResult {
  approved: boolean;
  safetyScore: number;
  checks: {
    fingerprint: { pass: boolean; reason?: string };
    spamRisk: { pass: boolean; score: number; reason?: string };
    duplicate: { pass: boolean; reason?: string };
    length: { pass: boolean; reason?: string };
    capsRatio: { pass: boolean; reason?: string };
    emojiRatio: { pass: boolean; reason?: string };
  };
  reason?: string;
}

function computeFingerprint(hook: string, caption: string, platform: string): string {
  const normalized = `${hook} ${caption}`.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '').trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 3).sort();
  return `${platform}:${words.slice(0, 8).join(':')}`;
}

function checkSpamRisk(text: string): { score: number; pass: boolean; reason?: string } {
  const capsRatio = (text.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length) / Math.max(text.length, 1);
  const exclamationCount = (text.match(/!/g) || []).length;
  const emojiCount = (text.match(/[\u{1F600}-\u{1F9FF}]/gu) || []).length;
  const spammyWords = ['gratis', 'click aquí', 'actúa ahora', 'última oportunidad', 'no te lo pierdas', 'sorteo', 'ganador'];
  const foundSpammy = spammyWords.filter(w => text.toLowerCase().includes(w));

  let score = 0;
  if (capsRatio > 0.3) score += 30;
  if (exclamationCount > 3) score += 20;
  if (emojiCount > 5) score += 15;
  if (foundSpammy.length > 0) score += 25 * foundSpammy.length;

  const pass = score < 50;
  const reason = !pass ? `Spam risk ${score}/100: ${capsRatio > 0.3 ? 'too many caps' : ''} ${foundSpammy.length > 0 ? `spammy words: ${foundSpammy.join(', ')}` : ''}`.trim() : undefined;

  return { score, pass, reason };
}

function checkDuplicateContent(hook: string, caption: string, existingFingerprints: string[]): { pass: boolean; reason?: string } {
  const fingerprint = computeFingerprint(hook, caption, 'generic');
  const isDuplicate = existingFingerprints.some(fp => {
    const aWords = new Set(fingerprint.split(':'));
    const bWords = new Set(fp.split(':'));
    const intersection = [...aWords].filter(w => bWords.has(w)).length;
    const union = new Set([...aWords, ...bWords]).size;
    const similarity = union > 0 ? intersection / union : 0;
    return similarity > 0.85;
  });
  return {
    pass: !isDuplicate,
    reason: isDuplicate ? 'Content too similar to existing published content' : undefined,
  };
}

export async function checkPublicationSafety(
  _contentPieceId: string,
  hook: string,
  caption: string,
  platform: string,
  existingFingerprints: string[] = []
): Promise<SafetyCheckResult> {
  const spamCheck = checkSpamRisk(`${hook} ${caption}`);
  const duplicateCheck = checkDuplicateContent(hook, caption, existingFingerprints);
  const lengthCheck = {
    pass: caption.length >= 50 && caption.length <= 2200,
    reason: caption.length < 50 ? 'Caption too short (< 50 chars)' : caption.length > 2200 ? 'Caption too long (> 2200 chars)' : undefined,
  };
  const capsCheck = {
    pass: (caption.replace(/[^A-Z]/g, '').length / Math.max(caption.length, 1)) < 0.4,
    reason: undefined as string | undefined,
  };
  if (!capsCheck.pass) capsCheck.reason = 'Too many uppercase letters';

  const emojiCheck = {
    pass: true,
    reason: undefined as string | undefined,
  };

  const checks = {
    fingerprint: { pass: true },
    spamRisk: spamCheck,
    duplicate: duplicateCheck,
    length: lengthCheck,
    capsRatio: capsCheck,
    emojiRatio: emojiCheck,
  };

  const allPassed = Object.values(checks).every(c => c.pass);
  const safetyScore = allPassed ? 90 : Math.max(0, 100 - (spamCheck.score || 0));

  return {
    approved: allPassed,
    safetyScore,
    checks,
    reason: allPassed ? undefined : Object.values(checks).filter(c => !c.pass).map(c => c.reason).filter(Boolean).join('; '),
  };
}
