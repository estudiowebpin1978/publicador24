import type { SocialPlatform } from '@/types';
import { getAIProvider } from '@/lib/ai/provider';
import type { HashtagResult } from '@/lib/ai/types';

export interface HashtagStrategyConfig {
  high_reach_percent: number;
  medium_percent: number;
  niche_percent: number;
}

export interface HashtagAnalysisInput {
  content: string;
  platform: SocialPlatform;
  language: string;
  country?: string;
  count?: number;
  strategy?: HashtagStrategyConfig;
}

export interface HashtagAnalysisResult {
  hashtags: HashtagResult['hashtags'];
  distribution: {
    high_reach: number;
    medium: number;
    niche: number;
  };
  data_source: 'ai' | 'estimated';
  strategy_used: HashtagStrategyConfig;
}

const DEFAULT_STRATEGY: HashtagStrategyConfig = {
  high_reach_percent: 30,
  medium_percent: 40,
  niche_percent: 30,
};

function validateStrategy(strategy: HashtagStrategyConfig): boolean {
  const total = strategy.high_reach_percent + strategy.medium_percent + strategy.niche_percent;
  return Math.abs(total - 100) < 1;
}

function countByCategory(hashtags: HashtagResult['hashtags']): { high_reach: number; medium: number; niche: number } {
  let high_reach = 0;
  let medium = 0;
  let niche = 0;

  for (const h of hashtags) {
    if (h.popularity >= 0.7) {
      high_reach++;
    } else if (h.popularity >= 0.3) {
      medium++;
    } else {
      niche++;
    }
  }

  return { high_reach, medium, niche };
}

export async function analyzeHashtags(input: HashtagAnalysisInput): Promise<HashtagAnalysisResult> {
  const strategy = input.strategy || DEFAULT_STRATEGY;

  if (!validateStrategy(strategy)) {
    throw new Error('Hashtag strategy percentages must sum to 100');
  }

  const provider = getAIProvider();
  const count = input.count || 10;

  const result = await provider.generateHashtags({
    content: input.content,
    platform: input.platform,
    language: input.language,
    country: input.country,
    count,
  });

  const allEstimated = result.hashtags.every((h) => h.is_estimated);

  return {
    hashtags: result.hashtags,
    distribution: countByCategory(result.hashtags),
    data_source: allEstimated ? 'estimated' : 'ai',
    strategy_used: strategy,
  };
}
