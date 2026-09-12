import { SocialPlatform } from '@/types';
import { SocialPlatformAdapter } from './types';
import { MockSocialAdapter } from './mock-adapter';
import { TikTokAdapter } from './tiktok/adapter';
import { TikTokRealAdapter } from './tiktok/real-adapter';
import { InstagramAdapter } from './instagram/adapter';
import { InstagramRealAdapter } from './instagram/real-adapter';
import { FacebookAdapter } from './facebook/adapter';
import { FacebookRealAdapter } from './facebook/real-adapter';
import { XAdapter } from './x/adapter';
import { XRealAdapter } from './x/real-adapter';
import { YouTubeAdapter } from './youtube/adapter';
import { YouTubeRealAdapter } from './youtube/real-adapter';
import { LinkedInAdapter } from './linkedin/adapter';

function isMockMode(): boolean {
  return process.env.SOCIAL_MOCK_MODE === 'true';
}

function createRealAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  switch (platform) {
    case 'tiktok':
      return new TikTokRealAdapter();
    case 'instagram':
      return new InstagramRealAdapter();
    case 'facebook':
      return new FacebookRealAdapter();
    case 'x':
      return new XRealAdapter();
    case 'youtube':
      return new YouTubeRealAdapter();
    case 'linkedin':
      return new LinkedInAdapter();
    default:
      throw new Error(`Plataforma no soportada: ${platform}`);
  }
}

function createMockAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  return new MockSocialAdapter(platform);
}

export function getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  if (isMockMode()) {
    return createMockAdapter(platform);
  }
  return createRealAdapter(platform);
}
