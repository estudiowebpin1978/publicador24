import { featureFlags, isEnabled, FeatureFlags } from './feature-flags';
import { PERSONAL_CONFIG, isWithinLimits, hasFeature, PersonalConfig } from './plans';
import { PLATFORMS, getPlatformConfig, getAllPlatformSlugs, PlatformConfig } from './platforms';

export interface AppEnvironment {
  NODE_ENV: 'development' | 'production' | 'test';
  VERCEL_ENV?: 'production' | 'preview' | 'development';
  IS_VERCEL: boolean;
}

export interface AIConfig {
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  maxRetries: number;
}

export interface SchedulerConfig {
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelayMs: number;
  defaultTimezone: string;
  batchSize: number;
  processingIntervalMs: number;
}

export interface RateLimitConfig {
  postsPerMinute: number;
  postsPerDay: number;
  apiCallsPerMinute: number;
  cooldownMs: number;
}

export interface SpamSafetyThresholds {
  maxHashtagsPerPost: number;
  maxMentionsPerPost: number;
  minContentDelayMs: number;
  maxSimilarContentScore: number;
  duplicateFingerprintThreshold: number;
  maxPostsPerHour: number;
  warningScore: number;
  blockScore: number;
}

export interface ContentScoreWeights {
  hook: number;
  relevance: number;
  clarity: number;
  emotion: number;
  trend: number;
  hashtags: number;
  platformFit: number;
  cta: number;
  spamRisk: number;
}

export interface PlatformRateLimits {
  [key: string]: RateLimitConfig;
}

export interface AppConfig {
  env: AppEnvironment;
  ai: AIConfig;
  scheduler: SchedulerConfig;
  rateLimits: PlatformRateLimits;
  spamSafety: SpamSafetyThresholds;
  contentScoreWeights: ContentScoreWeights;
  mockMode: boolean;
  appUrl: string;
  cronSecret: string;
}

const getEnv = (key: string, fallback = ''): string => {
  return process.env[key] ?? fallback;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
};

const getEnvBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];
  if (!value) return fallback;
  return value === 'true' || value === '1';
};

const createPlatformRateLimits = (): PlatformRateLimits => {
  const limits: PlatformRateLimits = {};
  const platforms = getAllPlatformSlugs();

  for (const platform of platforms) {
    const config = getPlatformConfig(platform);
    limits[platform] = {
      postsPerMinute: config.rateLimits.postsPerMinute,
      postsPerDay: config.rateLimits.postsPerDay,
      apiCallsPerMinute: config.rateLimits.apiCallsPerMinute,
      cooldownMs: 60000,
    };
  }

  return limits;
};

const createSpamSafetyThresholds = (): SpamSafetyThresholds => ({
  maxHashtagsPerPost: 15,
  maxMentionsPerPost: 5,
  minContentDelayMs: 300000,
  maxSimilarContentScore: 0.8,
  duplicateFingerprintThreshold: 0.95,
  maxPostsPerHour: 5,
  warningScore: 0.6,
  blockScore: 0.85,
});

const createContentScoreWeights = (): ContentScoreWeights => ({
  hook: 0.15,
  relevance: 0.15,
  clarity: 0.1,
  emotion: 0.12,
  trend: 0.13,
  hashtags: 0.1,
  platformFit: 0.1,
  cta: 0.1,
  spamRisk: 0.05,
});

const createAppEnvironment = (): AppEnvironment => ({
  NODE_ENV: (process.env.NODE_ENV as AppEnvironment['NODE_ENV']) ?? 'development',
  VERCEL_ENV: process.env.VERCEL_ENV as AppEnvironment['VERCEL_ENV'],
  IS_VERCEL: !!process.env.VERCEL,
});

export const config: AppConfig = {
  env: createAppEnvironment(),
  ai: {
    defaultModel: getEnv('AI_MODEL', 'gpt-4o-mini'),
    maxTokens: getEnvNumber('AI_MAX_TOKENS', 2000),
    temperature: parseFloat(getEnv('AI_TEMPERATURE', '0.7')),
    maxRetries: getEnvNumber('AI_MAX_RETRIES', 3),
  },
  scheduler: {
    maxConcurrentJobs: getEnvNumber('SCHEDULER_MAX_CONCURRENT', 5),
    retryAttempts: getEnvNumber('SCHEDULER_RETRY_ATTEMPTS', 3),
    retryDelayMs: getEnvNumber('SCHEDULER_RETRY_DELAY_MS', 60000),
    defaultTimezone: getEnv('SCHEDULER_DEFAULT_TIMEZONE', 'UTC'),
    batchSize: getEnvNumber('SCHEDULER_BATCH_SIZE', 10),
    processingIntervalMs: getEnvNumber('SCHEDULER_INTERVAL_MS', 30000),
  },
  rateLimits: createPlatformRateLimits(),
  spamSafety: createSpamSafetyThresholds(),
  contentScoreWeights: createContentScoreWeights(),
  mockMode: getEnvBoolean('SOCIAL_MOCK_MODE', true),
  appUrl: getEnv('APP_URL', 'http://localhost:3000'),
  cronSecret: getEnv('CRON_SECRET'),
};

export {
  featureFlags,
  isEnabled,
  PERSONAL_CONFIG,
  isWithinLimits,
  hasFeature,
  PLATFORMS,
  getPlatformConfig,
  getAllPlatformSlugs,
};

export type {
  FeatureFlags,
  PersonalConfig,
  PlatformConfig,
};
