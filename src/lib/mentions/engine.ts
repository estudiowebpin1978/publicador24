import type { SocialPlatform } from '@/types';

export interface MentionSuggestion {
  username: string;
  platform: SocialPlatform;
  category: 'brand' | 'partner' | 'influencer' | 'community' | 'media';
  relevance_score: number;
  follower_count?: number;
  is_verified?: boolean;
  reason: string;
}

export interface MentionAnalysisInput {
  content: string;
  platform: SocialPlatform;
  existing_mentions?: string[];
  brand_keywords?: string[];
  max_mentions?: number;
}

export interface MentionAnalysisResult {
  suggestions: MentionSuggestion[];
  total_relevant: number;
  excluded_count: number;
}

const MAX_MENTIONS_PER_POST: Record<SocialPlatform, number> = {
  tiktok: 5,
  instagram: 5,
  facebook: 3,
  x: 3,
  youtube: 0,
  linkedin: 3,
};

function isMentionRelevant(
  username: string,
  content: string,
  brandKeywords: string[]
): boolean {
  const lowerContent = content.toLowerCase();
  const lowerUsername = username.toLowerCase();

  if (brandKeywords.some((kw) => lowerUsername.includes(kw.toLowerCase()))) {
    return true;
  }

  const contentWords = lowerContent.split(/\s+/);
  const usernameWords = lowerUsername.split(/[_.-]/);

  const overlap = usernameWords.filter(
    (w) => w.length > 3 && contentWords.includes(w)
  );

  return overlap.length > 0;
}

export async function suggestMentions(input: MentionAnalysisInput): Promise<MentionAnalysisResult> {
  const maxMentions = input.max_mentions ?? MAX_MENTIONS_PER_POST[input.platform] ?? 3;
  const existingMentions = new Set(
    (input.existing_mentions || []).map((m) => m.toLowerCase())
  );
  const brandKeywords = input.brand_keywords || [];

  const suggestions: MentionSuggestion[] = [];
  let excludedCount = 0;

  for (const mention of generateCandidateMentions(input)) {
    if (suggestions.length >= maxMentions) break;

    if (existingMentions.has(mention.username.toLowerCase())) {
      excludedCount++;
      continue;
    }

    if (!isMentionRelevant(mention.username, input.content, brandKeywords)) {
      excludedCount++;
      continue;
    }

    suggestions.push(mention);
  }

  return {
    suggestions,
    total_relevant: suggestions.length,
    excluded_count: excludedCount,
  };
}

function generateCandidateMentions(
  input: MentionAnalysisInput
): MentionSuggestion[] {
  const content = input.content.toLowerCase();
  const candidates: MentionSuggestion[] = [];

  const mentionPatterns: Array<{
    pattern: RegExp;
    category: MentionSuggestion['category'];
    reason: string;
  }> = [
    { pattern: /\b(parce?|amigo|compa[ñn]ero)\b/i, category: 'community', reason: 'Referencia a comunidad' },
    { pattern: /\b(experto|líder|profesional|guru)\b/i, category: 'influencer', reason: 'Referencia a autoridad' },
    { pattern: /\b(marca|empresa|compañía)\b/i, category: 'brand', reason: 'Referencia a marca' },
  ];

  for (const { pattern, category, reason } of mentionPatterns) {
    if (pattern.test(content)) {
      candidates.push({
        username: extractMentionCandidate(content, pattern),
        platform: input.platform,
        category,
        relevance_score: 0.7,
        reason,
      });
    }
  }

  return candidates.filter((c) => c.username.length > 0);
}

function extractMentionCandidate(content: string, pattern: RegExp): string {
  const match = content.match(pattern);
  return match ? match[1].toLowerCase().replace(/\s+/g, '') : '';
}
