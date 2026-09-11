import type { SpamRiskLevel } from '@/types';

interface SpamCheckResult {
  check: string;
  score: number;
  details: string;
}

interface SpamAnalysisResult {
  spam_risk_score: number;
  level: SpamRiskLevel;
  checks: SpamCheckResult[];
  should_block: boolean;
  reasons: string[];
}

function checkRepetition(text: string): SpamCheckResult {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  }
  let maxRepeat = 0;
  for (const count of wordCount.values()) {
    maxRepeat = Math.max(maxRepeat, count);
  }
  const score = Math.min(100, (maxRepeat / Math.max(words.length, 1)) * 200);
  return {
    check: 'repetition',
    score,
    details: `Max word repeat: ${maxRepeat}x in ${words.length} words`,
  };
}

function checkSameHashtags(hashtags: string[]): SpamCheckResult {
  if (hashtags.length === 0) return { check: 'same_hashtags', score: 0, details: 'No hashtags' };
  const unique = new Set(hashtags.map((h) => h.toLowerCase()));
  const ratio = 1 - unique.size / hashtags.length;
  const score = ratio * 80;
  return {
    check: 'same_hashtags',
    score,
    details: `${unique.size} unique out of ${hashtags.length} hashtags`,
  };
}

function checkSameText(recentTexts: string[]): SpamCheckResult {
  if (recentTexts.length < 2) return { check: 'same_text', score: 0, details: 'Not enough texts' };
  const normalized = recentTexts.map((t) => t.toLowerCase().replace(/\s+/g, ' ').trim());
  let maxSimilarity = 0;
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const similarity = calculateSimilarity(normalized[i], normalized[j]);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  return {
    check: 'same_text',
    score: maxSimilarity * 100,
    details: `Max text similarity: ${(maxSimilarity * 100).toFixed(1)}%`,
  };
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function checkPostFrequency(postTimestamps: string[], windowHours: number = 24): SpamCheckResult {
  if (postTimestamps.length < 2) return { check: 'frequency', score: 0, details: 'Not enough posts' };
  const timestamps = postTimestamps.map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  const windowMs = windowHours * 60 * 60 * 1000;
  const recentWindow = timestamps.filter((t) => t > Date.now() - windowMs);
  const postsPerHour = recentWindow.length / windowHours;
  const score = Math.min(100, postsPerHour * 25);
  return {
    check: 'frequency',
    score,
    details: `${recentWindow.length} posts in ${windowHours}h (${postsPerHour.toFixed(1)}/h)`,
  };
}

function checkExcessiveMentions(mentions: string[]): SpamCheckResult {
  if (mentions.length === 0) return { check: 'mentions', score: 0, details: 'No mentions' };
  const score = Math.min(100, mentions.length * 10);
  return {
    check: 'mentions',
    score,
    details: `${mentions.length} mentions`,
  };
}

function checkSuspiciousLanguage(text: string): SpamCheckResult {
  const suspiciousPatterns = [
    /\b(buy now|click here|limited time|act fast|don't miss|free money|earn fast|make money)\b/gi,
    /\b(100% free|no risk|guaranteed|instant results|miracle)\b/gi,
    /(!{3,}|\?{3,}|\${2,}|\*{3,})/g,
    /(https?:\/\/[^\s]+){3,}/gi,
  ];
  let matchCount = 0;
  for (const pattern of suspiciousPatterns) {
    const matches = text.match(pattern);
    if (matches) matchCount += matches.length;
  }
  const score = Math.min(100, matchCount * 20);
  return {
    check: 'suspicious_language',
    score,
    details: `${matchCount} suspicious patterns found`,
  };
}

function checkContentDuplication(
  currentText: string,
  previousTexts: string[]
): SpamCheckResult {
  if (previousTexts.length === 0) return { check: 'duplication', score: 0, details: 'No previous content' };
  const normalized = currentText.toLowerCase().replace(/\s+/g, ' ').trim();
  let maxSimilarity = 0;
  for (const prev of previousTexts) {
    const normalizedPrev = prev.toLowerCase().replace(/\s+/g, ' ').trim();
    const similarity = calculateSimilarity(normalized, normalizedPrev);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  return {
    check: 'duplication',
    score: maxSimilarity * 100,
    details: `Max duplication: ${(maxSimilarity * 100).toFixed(1)}%`,
  };
}

function checkRepetitiveLinks(text: string): SpamCheckResult {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlRegex) || [];
  if (urls.length === 0) return { check: 'links', score: 0, details: 'No links' };
  const domainCount = new Map<string, number>();
  for (const url of urls) {
    try {
      const domain = new URL(url).hostname;
      domainCount.set(domain, (domainCount.get(domain) || 0) + 1);
    } catch {
      // invalid URL
    }
  }
  let maxDomainRepeat = 0;
  for (const count of domainCount.values()) {
    maxDomainRepeat = Math.max(maxDomainRepeat, count);
  }
  const score = Math.min(100, maxDomainRepeat * 30);
  return {
    check: 'repetitive_links',
    score,
    details: `${urls.length} links, max domain repeat: ${maxDomainRepeat}x`,
  };
}

function getLevel(score: number): SpamRiskLevel {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function analyzeSpamRisk(input: {
  text: string;
  hashtags?: string[];
  mentions?: string[];
  recentTexts?: string[];
  recentPostTimestamps?: string[];
  previousContent?: string[];
}): SpamAnalysisResult {
  const {
    text,
    hashtags = [],
    mentions = [],
    recentTexts = [],
    recentPostTimestamps = [],
    previousContent = [],
  } = input;

  const checks: SpamCheckResult[] = [
    checkRepetition(text),
    checkSameHashtags(hashtags),
    checkSameText(recentTexts),
    checkPostFrequency(recentPostTimestamps),
    checkExcessiveMentions(mentions),
    checkSuspiciousLanguage(text),
    checkContentDuplication(text, previousContent),
    checkRepetitiveLinks(text),
  ];

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const spam_risk_score = Math.min(100, Math.round(totalScore / checks.length));
  const level = getLevel(spam_risk_score);

  const reasons = checks
    .filter((c) => c.score > 30)
    .map((c) => `${c.check}: ${c.details}`);

  return {
    spam_risk_score,
    level,
    checks,
    should_block: spam_risk_score > 80,
    reasons,
  };
}
