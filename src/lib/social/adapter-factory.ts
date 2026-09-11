import { SocialPlatform } from '@/types';
import { SocialPlatformAdapter } from './types';
import { MockSocialAdapter } from './mock-adapter';
import { TikTokAdapter } from './tiktok/adapter';
import { InstagramAdapter } from './instagram/adapter';
import { FacebookAdapter } from './facebook/adapter';
import { XAdapter } from './x/adapter';
import { YouTubeAdapter } from './youtube/adapter';
import { LinkedInAdapter } from './linkedin/adapter';

function isMockMode(): boolean {
  return process.env.SOCIAL_MOCK_MODE === 'true';
}

function createRealAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  switch (platform) {
    case 'tiktok':
      return new TikTokAdapter();
    case 'instagram':
      return new InstagramAdapter();
    case 'facebook':
      return new FacebookAdapter();
    case 'x':
      return new XAdapter();
    case 'youtube':
      return new YouTubeAdapter();
    case 'linkedin':
      return new LinkedInAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
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
