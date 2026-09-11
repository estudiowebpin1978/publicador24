export interface FeatureFlags {
  ENABLE_TIKTOK: boolean;
  ENABLE_INSTAGRAM: boolean;
  ENABLE_FACEBOOK: boolean;
  ENABLE_X: boolean;
  ENABLE_YOUTUBE: boolean;
  ENABLE_LINKEDIN: boolean;
  ENABLE_AUTOPILOT: boolean;
  ENABLE_AI_GENERATION: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_HASHTAG_ENGINE: boolean;
  ENABLE_TREND_DETECTION: boolean;
  ENABLE_A_B_TESTING: boolean;
  ENABLE_MEDIA_PROCESSING: boolean;
  ENABLE_RATE_LIMITER: boolean;
  ENABLE_SPAM_DETECTION: boolean;
  ENABLE_CONTENT_APPROVAL: boolean;
  ENABLE_SCHEDULER: boolean;
  ENABLE_WEBHOOKS: boolean;
}

const defaults: FeatureFlags = {
  ENABLE_TIKTOK: true,
  ENABLE_INSTAGRAM: true,
  ENABLE_FACEBOOK: true,
  ENABLE_X: true,
  ENABLE_YOUTUBE: true,
  ENABLE_LINKEDIN: true,
  ENABLE_AUTOPILOT: true,
  ENABLE_AI_GENERATION: true,
  ENABLE_ANALYTICS: true,
  ENABLE_HASHTAG_ENGINE: true,
  ENABLE_TREND_DETECTION: true,
  ENABLE_A_B_TESTING: true,
  ENABLE_MEDIA_PROCESSING: true,
  ENABLE_RATE_LIMITER: true,
  ENABLE_SPAM_DETECTION: true,
  ENABLE_CONTENT_APPROVAL: true,
  ENABLE_SCHEDULER: true,
  ENABLE_WEBHOOKS: false,
};

export const featureFlags: FeatureFlags = {
  ...defaults,
  ENABLE_TIKTOK: process.env.ENABLE_TIKTOK === 'true' ? true : process.env.ENABLE_TIKTOK === 'false' ? false : defaults.ENABLE_TIKTOK,
  ENABLE_INSTAGRAM: process.env.ENABLE_INSTAGRAM === 'true' ? true : process.env.ENABLE_INSTAGRAM === 'false' ? false : defaults.ENABLE_INSTAGRAM,
  ENABLE_FACEBOOK: process.env.ENABLE_FACEBOOK === 'true' ? true : process.env.ENABLE_FACEBOOK === 'false' ? false : defaults.ENABLE_FACEBOOK,
  ENABLE_X: process.env.ENABLE_X === 'true' ? true : process.env.ENABLE_X === 'false' ? false : defaults.ENABLE_X,
  ENABLE_YOUTUBE: process.env.ENABLE_YOUTUBE === 'true' ? true : process.env.ENABLE_YOUTUBE === 'false' ? false : defaults.ENABLE_YOUTUBE,
  ENABLE_LINKEDIN: process.env.ENABLE_LINKEDIN === 'true' ? true : process.env.ENABLE_LINKEDIN === 'false' ? false : defaults.ENABLE_LINKEDIN,
  ENABLE_AUTOPILOT: process.env.ENABLE_AUTOPILOT === 'true' ? true : process.env.ENABLE_AUTOPILOT === 'false' ? false : defaults.ENABLE_AUTOPILOT,
  ENABLE_AI_GENERATION: process.env.ENABLE_AI_GENERATION === 'true' ? true : process.env.ENABLE_AI_GENERATION === 'false' ? false : defaults.ENABLE_AI_GENERATION,
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true' ? true : process.env.ENABLE_ANALYTICS === 'false' ? false : defaults.ENABLE_ANALYTICS,
  ENABLE_HASHTAG_ENGINE: process.env.ENABLE_HASHTAG_ENGINE === 'true' ? true : process.env.ENABLE_HASHTAG_ENGINE === 'false' ? false : defaults.ENABLE_HASHTAG_ENGINE,
  ENABLE_TREND_DETECTION: process.env.ENABLE_TREND_DETECTION === 'true' ? true : process.env.ENABLE_TREND_DETECTION === 'false' ? false : defaults.ENABLE_TREND_DETECTION,
  ENABLE_A_B_TESTING: process.env.ENABLE_A_B_TESTING === 'true' ? true : process.env.ENABLE_A_B_TESTING === 'false' ? false : defaults.ENABLE_A_B_TESTING,
  ENABLE_MEDIA_PROCESSING: process.env.ENABLE_MEDIA_PROCESSING === 'true' ? true : process.env.ENABLE_MEDIA_PROCESSING === 'false' ? false : defaults.ENABLE_MEDIA_PROCESSING,
  ENABLE_RATE_LIMITER: process.env.ENABLE_RATE_LIMITER === 'true' ? true : process.env.ENABLE_RATE_LIMITER === 'false' ? false : defaults.ENABLE_RATE_LIMITER,
  ENABLE_SPAM_DETECTION: process.env.ENABLE_SPAM_DETECTION === 'true' ? true : process.env.ENABLE_SPAM_DETECTION === 'false' ? false : defaults.ENABLE_SPAM_DETECTION,
  ENABLE_CONTENT_APPROVAL: process.env.ENABLE_CONTENT_APPROVAL === 'true' ? true : process.env.ENABLE_CONTENT_APPROVAL === 'false' ? false : defaults.ENABLE_CONTENT_APPROVAL,
  ENABLE_SCHEDULER: process.env.ENABLE_SCHEDULER === 'true' ? true : process.env.ENABLE_SCHEDULER === 'false' ? false : defaults.ENABLE_SCHEDULER,
  ENABLE_WEBHOOKS: process.env.ENABLE_WEBHOOKS === 'true' ? true : process.env.ENABLE_WEBHOOKS === 'false' ? false : defaults.ENABLE_WEBHOOKS,
};

export const isEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags[flag];
};
