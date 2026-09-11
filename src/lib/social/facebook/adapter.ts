import { SocialPlatform, PublishResult, PlatformLimits } from '@/types';
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
} from '../types';
import { MockSocialAdapter } from '../mock-adapter';

// TODO: Facebook Graph API
// Docs: https://developers.facebook.com/docs/pages-api/
// Required scopes: pages_manage_posts, pages_read_engagement, pages_show_list
// Auth: OAuth 2.0
// Endpoints:
//   POST https://graph.facebook.com/v19.0/{page-id}/feed
//   POST https://graph.facebook.com/v19.0/{page-id}/photos
//   GET  https://graph.facebook.com/v19.0/me/accounts
// Rate limits: 200 calls/user/hour

// TODO: Groups posting requires MANARequired (Managed Admin API)
// Groups API is restricted; publishing to groups requires app review
// and special permissions. Detect group type and warn user.

const log = createLogger({});

export class FacebookAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'facebook';

  constructor() {
    super('facebook');
  }

  // TODO: Facebook OAuth 2.0
  // 1. Redirect to https://www.facebook.com/v19.0/dialog/oauth
  //    ?client_id=<APP_ID>&redirect_uri=<URI>&scope=pages_manage_posts,pages_read_engagement
  // 2. Exchange code for user token
  // 3. GET /me/accounts to get page access tokens
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('facebook_connect', 'Initiating Facebook OAuth', { has_code: !!authorizationCode });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://graph.facebook.com/v19.0/oauth/access_token
  // Body: grant_type=fb_exchange_token, client_id, client_secret, fb_exchange_token
  // Then GET /me/accounts with new token to get page tokens
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('facebook_refresh', 'Refreshing Facebook token');
    return super.refreshToken(refreshToken);
  }

  async disconnectAccount(accountId: string): Promise<void> {
    log.info('facebook_disconnect', 'Disconnecting Facebook account', {
      account_id: accountId,
    });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://graph.facebook.com/v19.0/me?fields=id,name,picture,fan_count
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('facebook_profile', 'Fetching Facebook profile');
    return super.getProfile(accessToken);
  }

  // TODO: Detect if target is a Page or Group
  // Pages: full API access via Graph API
  // Groups: restricted, requires MANARequired app review
  // Warn user if group posting requires additional permissions
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('facebook_validate', 'Validating Facebook content');
    return super.validateContent(content);
  }

  // TODO: Pages: POST https://graph.facebook.com/v19.0/{page-id}/photos (image) or /videos (video)
  // Groups: POST https://graph.facebook.com/v19.0/{group-id}/feed (requires MANARequired)
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('facebook_upload', 'Uploading media to Facebook', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: POST https://graph.facebook.com/v19.0/{page-id}/feed
  // Body: { message, link, published, scheduled_publish_time }
  // For groups: POST /{group-id}/feed (requires additional permissions)
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('facebook_publish', 'Publishing to Facebook', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: Use scheduled_publish_time parameter with Unix timestamp
  // POST https://graph.facebook.com/v19.0/{page-id}/feed
  // Body: { message, scheduled_publish_time: <unix_timestamp>, published: false }
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('facebook_schedule', 'Scheduling on Facebook', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://graph.facebook.com/v19.0/{post-id}?fields=status
  // status values: scheduled, published, unpublished
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('facebook_status', 'Checking Facebook post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://graph.facebook.com/v19.0/{post-id}
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('facebook_delete', 'Deleting Facebook post', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: GET https://graph.facebook.com/v19.0/{page-id}/insights
  // metric: page_impressions, page_engaged_users, page_post_engagements
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('facebook_analytics', 'Fetching Facebook analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 63206,
      max_hashtags: 10,
      max_mentions: 10,
      max_media: 10,
      supported_media_types: ['image', 'video', 'carousel'],
      max_video_duration: 14400,
      max_video_size: 10737418240,
      max_image_size: 31457280,
    };
  }

  getAuthUrl(state: string): string {
    const appId = process.env.FACEBOOK_APP_ID ?? '';
    const scopes = 'pages_manage_posts,pages_read_engagement,pages_show_list';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI ?? '')}&scope=${scopes}&state=${state}`;
  }
}
