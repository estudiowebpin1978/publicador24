import { SocialPlatform } from '@/types';

export interface PlatformConfig {
  name: string;
  slug: string;
  icon: string;
  limits: {
    maxCaptionLength: number;
    maxHashtags: number;
    maxMentions: number;
    maxMedia: number;
    supportedMediaTypes: string[];
    maxVideoDuration?: number;
    maxVideoSize?: number;
    maxImageSize?: number;
    requiresBusinessAccount?: boolean;
  };
  features: {
    supportsCarousel: boolean;
    supportsVideo: boolean;
    supportsImages: boolean;
    supportsReels: boolean;
    supportsStories: boolean;
    supportsThreads: boolean;
    supportsCaptions: boolean;
    supportsLocationTagging: boolean;
    supportsUserTagging: boolean;
    supportsScheduling: boolean;
  };
  rateLimits: {
    postsPerMinute: number;
    postsPerDay: number;
    apiCallsPerMinute: number;
  };
}

export const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  tiktok: {
    name: 'TikTok',
    slug: 'tiktok',
    icon: 'music',
    limits: {
      maxCaptionLength: 2200,
      maxHashtags: 30,
      maxMentions: 10,
      maxMedia: 12,
      supportedMediaTypes: ['video', 'image'],
      maxVideoDuration: 600,
      maxVideoSize: 524288000,
      maxImageSize: 10485760,
    },
    features: {
      supportsCarousel: true,
      supportsVideo: true,
      supportsImages: true,
      supportsReels: false,
      supportsStories: false,
      supportsThreads: false,
      supportsCaptions: true,
      supportsLocationTagging: false,
      supportsUserTagging: true,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 50,
      apiCallsPerMinute: 100,
    },
  },
  instagram: {
    name: 'Instagram',
    slug: 'instagram',
    icon: 'camera',
    limits: {
      maxCaptionLength: 2200,
      maxHashtags: 30,
      maxMentions: 20,
      maxMedia: 10,
      supportedMediaTypes: ['image', 'video', 'carousel'],
      maxVideoDuration: 90,
      maxImageSize: 31457280,
    },
    features: {
      supportsCarousel: true,
      supportsVideo: true,
      supportsImages: true,
      supportsReels: true,
      supportsStories: true,
      supportsThreads: true,
      supportsCaptions: true,
      supportsLocationTagging: true,
      supportsUserTagging: true,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 25,
      apiCallsPerMinute: 200,
    },
  },
  facebook: {
    name: 'Facebook',
    slug: 'facebook',
    icon: 'thumbs-up',
    limits: {
      maxCaptionLength: 63206,
      maxHashtags: 10,
      maxMentions: 10,
      maxMedia: 10,
      supportedMediaTypes: ['image', 'video', 'carousel'],
      maxVideoDuration: 14400,
      maxVideoSize: 10737418240,
      maxImageSize: 31457280,
    },
    features: {
      supportsCarousel: true,
      supportsVideo: true,
      supportsImages: true,
      supportsReels: true,
      supportsStories: true,
      supportsThreads: false,
      supportsCaptions: true,
      supportsLocationTagging: true,
      supportsUserTagging: true,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 100,
      apiCallsPerMinute: 200,
    },
  },
  x: {
    name: 'X (Twitter)',
    slug: 'x',
    icon: 'at-sign',
    limits: {
      maxCaptionLength: 280,
      maxHashtags: 10,
      maxMentions: 10,
      maxMedia: 4,
      supportedMediaTypes: ['image', 'video', 'gif'],
      maxVideoDuration: 140,
      maxVideoSize: 536870912,
      maxImageSize: 5242880,
    },
    features: {
      supportsCarousel: false,
      supportsVideo: true,
      supportsImages: true,
      supportsReels: false,
      supportsStories: false,
      supportsThreads: true,
      supportsCaptions: false,
      supportsLocationTagging: true,
      supportsUserTagging: true,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 50,
      apiCallsPerMinute: 15,
    },
  },
  youtube: {
    name: 'YouTube Shorts',
    slug: 'youtube',
    icon: 'play',
    limits: {
      maxCaptionLength: 5000,
      maxHashtags: 15,
      maxMentions: 0,
      maxMedia: 1,
      supportedMediaTypes: ['video'],
      maxVideoDuration: 60,
      maxVideoSize: 268435456,
    },
    features: {
      supportsCarousel: false,
      supportsVideo: true,
      supportsImages: false,
      supportsReels: false,
      supportsStories: false,
      supportsThreads: false,
      supportsCaptions: true,
      supportsLocationTagging: false,
      supportsUserTagging: false,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 15,
      apiCallsPerMinute: 30,
    },
  },
  linkedin: {
    name: 'LinkedIn',
    slug: 'linkedin',
    icon: 'briefcase',
    limits: {
      maxCaptionLength: 3000,
      maxHashtags: 10,
      maxMentions: 10,
      maxMedia: 1,
      supportedMediaTypes: ['image', 'video'],
      maxVideoDuration: 600,
      maxVideoSize: 5368709120,
      maxImageSize: 31457280,
      requiresBusinessAccount: true,
    },
    features: {
      supportsCarousel: false,
      supportsVideo: true,
      supportsImages: true,
      supportsReels: false,
      supportsStories: false,
      supportsThreads: false,
      supportsCaptions: true,
      supportsLocationTagging: false,
      supportsUserTagging: true,
      supportsScheduling: true,
    },
    rateLimits: {
      postsPerMinute: 1,
      postsPerDay: 15,
      apiCallsPerMinute: 100,
    },
  },
};

export const getPlatformConfig = (platform: SocialPlatform): PlatformConfig => {
  return PLATFORMS[platform];
};

export const getAllPlatformSlugs = (): SocialPlatform[] => {
  return Object.keys(PLATFORMS) as SocialPlatform[];
};
