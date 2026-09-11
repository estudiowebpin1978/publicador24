import { SocialPlatform, PublishResult, PlatformLimits, PostMetrics } from '@/types';
import { createLogger } from '@/lib/logger';
import {
  SocialPlatformAdapter,
  ConnectResult,
  TokenResult,
  ProfileResult,
  ContentValidationInput,
  ContentValidationResult,
  MediaUpload,
  MediaUploadResult,
  PublishInput,
  ScheduleInput,
  ScheduleResult,
  PostStatusResult,
  DateRange,
  AnalyticsResult,
} from './types';

const logger = createLogger({});

function randomId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateMetrics(): PostMetrics {
  return {
    views: Math.floor(Math.random() * 10000),
    likes: Math.floor(Math.random() * 500),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 50),
    saves: Math.floor(Math.random() * 200),
    clicks: Math.floor(Math.random() * 300),
    reach: Math.floor(Math.random() * 8000),
    impressions: Math.floor(Math.random() * 12000),
    engagement_rate: parseFloat((Math.random() * 0.1).toFixed(4)),
  };
}

export class MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform;

  constructor(platform: SocialPlatform) {
    this.platform = platform;
  }

  private async simulateDelay(ms: number = 500): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    logger.info('mock_connect', `Mock connecting ${this.platform} account`, {
      has_code: !!authorizationCode,
    });
    await this.simulateDelay();
    return {
      success: true,
      account_id: randomId(),
      access_token: `mock_token_${randomId()}`,
      refresh_token: `mock_refresh_${randomId()}`,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['read', 'write', 'publish'],
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    logger.info('mock_refresh', `Mock refreshing token for ${this.platform}`, {
      has_refresh: !!refreshToken,
    });
    await this.simulateDelay(200);
    return {
      success: true,
      access_token: `mock_token_${randomId()}`,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  async disconnectAccount(accountId: string): Promise<void> {
    logger.info('mock_disconnect', `Mock disconnecting ${this.platform} account`, {
      account_id: accountId,
    });
    await this.simulateDelay(300);
  }

  async getProfile(accessToken: string): Promise<ProfileResult> {
    logger.info('mock_profile', `Mock getting profile for ${this.platform}`, {
      has_token: !!accessToken,
    });
    await this.simulateDelay(400);
    return {
      success: true,
      user_id: randomId(),
      username: `mock_user_${this.platform}`,
      display_name: `Mock ${this.platform} User`,
      avatar_url: `https://ui-avatars.com/api/?name=${this.platform}&background=random`,
      followers: Math.floor(Math.random() * 100000),
      permissions: ['read', 'write', 'publish', 'analytics'],
    };
  }

  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    logger.info('mock_validate', `Mock validating content for ${this.platform}`, {
      caption_length: content.caption?.length,
      media_count: content.media?.length,
    });
    await this.simulateDelay(200);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (content.caption && content.caption.length > 2200) {
      errors.push('Caption exceeds maximum length');
    }
    if (content.hashtags && content.hashtags.length > 30) {
      errors.push('Too many hashtags');
    }
    if (content.media && content.media.length > 10) {
      errors.push('Too many media items');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    logger.info('mock_upload', `Mock uploading media to ${this.platform}`, {
      file_type: media.file_type,
      has_caption: !!media.caption,
    });
    await this.simulateDelay(800);
    return {
      success: true,
      media_id: randomId(),
      media_url: `https://mock-storage.example.com/${this.platform}/${randomId()}.mp4`,
    };
  }

  async publishPost(post: PublishInput): Promise<PublishResult> {
    logger.info('mock_publish', `Mock publishing to ${this.platform}`, {
      caption_length: post.caption.length,
      media_count: post.media_ids?.length ?? 0,
    });
    await this.simulateDelay(1000);
    return {
      success: true,
      platform_post_id: randomId(),
      platform_post_url: `https://${this.platform}.com/mock/post/${randomId()}`,
    };
  }

  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    logger.info('mock_schedule', `Mock scheduling on ${this.platform}`, {
      scheduled_at: post.scheduled_at,
    });
    await this.simulateDelay(600);
    return {
      success: true,
      schedule_id: randomId(),
      scheduled_at: post.scheduled_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPostStatus(postId: string, _accessToken: string): Promise<PostStatusResult> {
    logger.info('mock_status', `Mock checking post status on ${this.platform}`, {
      post_id: postId,
    });
    await this.simulateDelay(300);
    return {
      success: true,
      status: 'PUBLISHED',
      post_url: `https://${this.platform}.com/mock/post/${postId}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    logger.info('mock_delete', `Mock deleting post on ${this.platform}`, {
      post_id: postId,
    });
    await this.simulateDelay(400);
  }

  async getAnalytics(_accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    logger.info('mock_analytics', `Mock fetching analytics for ${this.platform}`, {
      start: dateRange.start,
      end: dateRange.end,
    });
    await this.simulateDelay(700);

    const days = Math.ceil(
      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86400000
    );
    const dailyData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        metrics: generateMetrics(),
      };
    });

    return {
      success: true,
      metrics: generateMetrics(),
      daily_data: dailyData,
    };
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 2200,
      max_hashtags: 30,
      max_mentions: 10,
      max_media: 10,
      supported_media_types: ['image', 'video'],
      max_video_duration: 600,
      max_video_size: 524288000,
      max_image_size: 10485760,
    };
  }

  getAuthUrl(state: string): string {
    return `https://mock-${this.platform}.com/oauth/authorize?state=${state}&scope=read+write+publish`;
  }
}
