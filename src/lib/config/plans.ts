import { SocialPlatform } from '@/types';

export interface PersonalConfig {
  maxAccounts: number;
  maxPostsPerMonth: number;
  maxAiGenerations: number;
  maxMediaStorageMB: number;
  maxCampaigns: number;
  supportedPlatforms: SocialPlatform[];
  features: string[];
}

export const PERSONAL_CONFIG: PersonalConfig = {
  maxAccounts: -1,
  maxPostsPerMonth: -1,
  maxAiGenerations: -1,
  maxMediaStorageMB: -1,
  maxCampaigns: -1,
  supportedPlatforms: ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'linkedin'],
  features: [
    'basic_ai_generation',
    'advanced_ai_generation',
    'auto_scheduling',
    'advanced_analytics',
    'hashtag_engine',
    'trend_detection',
    'ab_testing',
    'media_processing',
    'content_approval',
    'autopilot_auto',
    'brand_voice_custom',
  ],
};

export const isWithinLimits = (
  metric: 'accounts' | 'posts' | 'generations' | 'campaigns',
  current: number,
): boolean => {
  let limit: number;

  switch (metric) {
    case 'accounts':
      limit = PERSONAL_CONFIG.maxAccounts;
      break;
    case 'posts':
      limit = PERSONAL_CONFIG.maxPostsPerMonth;
      break;
    case 'generations':
      limit = PERSONAL_CONFIG.maxAiGenerations;
      break;
    case 'campaigns':
      limit = PERSONAL_CONFIG.maxCampaigns;
      break;
    default:
      return false;
  }

  return limit === -1 || current < limit;
};

export const hasFeature = (feature: string): boolean => {
  return PERSONAL_CONFIG.features.includes(feature);
};
