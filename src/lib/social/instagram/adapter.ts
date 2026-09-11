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

// TODO: Instagram Graph API
// Docs: https://developers.facebook.com/docs/instagram-api/
// Required scopes: instagram_basic, instagram_content_publish, instagram_manage_insights
// Auth: Facebook OAuth 2.0 -> exchange for Instagram long-lived token
// Endpoints:
//   POST https://graph.facebook.com/v19.0/{ig-user-id}/media
//   POST https://graph.facebook.com/v19.0/{ig-user-id}/media_publish
//   GET  https://graph.facebook.com/v19.0/{ig-user-id}?fields=username,followers_count
// Rate limits: 200 calls/user/hour, 4800 calls/user/day

const log = createLogger({});

export class InstagramAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'instagram';

  constructor() {
    super('instagram');
  }

  // TODO: Use Facebook OAuth as entry point
  // 1. Redirect to https://www.facebook.com/v19.0/dialog/oauth
  //    ?client_id=<APP_ID>&redirect_uri=<URI>&scope=instagram_basic,instagram_content_publish
  // 2. Exchange code for Facebook token
  // 3. GET /me/accounts to get page access token
  // 4. GET /{page-id}?fields=instagram_business_account to get IG user ID
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('instagram_connect', 'Initiating Instagram OAuth via Facebook', {
      has_code: !!authorizationCode,
    });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://graph.facebook.com/v19.0/oauth/access_token
  // Body: grant_type=fb_exchange_token, client_id, client_secret, fb_exchange_token
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('instagram_refresh', 'Refreshing Instagram token via Facebook');
    return super.refreshToken(refreshToken);
  }

  async disconnectAccount(accountId: string): Promise<void> {
    log.info('instagram_disconnect', 'Disconnecting Instagram account', {
      account_id: accountId,
    });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://graph.facebook.com/v19.0/{ig-user-id}?fields=username,name,profile_picture_url,followers_count
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('instagram_profile', 'Fetching Instagram profile');
    return super.getProfile(accessToken);
  }

  // TODO: Validate for Business vs Creator account type
  // Creator: no product tagging, limited carousel
  // Business: full API access, product tagging, shopping
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('instagram_validate', 'Validating Instagram content');
    return super.validateContent(content);
  }

  // TODO: POST https://graph.facebook.com/v19.0/{ig-user-id}/media
  // For images: { image_url, caption }
  // For videos: { media_type=VIDEO, video_url, caption }
  // For carousels: create items first, then POST with { media_type=CAROUSEL, children }
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('instagram_upload', 'Uploading media to Instagram', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: Two-step publish:
  // 1. Create container: POST /{ig-user-id}/media (image) or /{ig-user-id}/media (video)
  // 2. Publish: POST /{ig-user-id}/media_publish with creation_id
  // For reels: POST /{ig-user-id}/media with media_type=REELS
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('instagram_publish', 'Publishing to Instagram', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: Instagram API does not support scheduling directly
  // Use app-side scheduler or Facebook Publishing API (limited)
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('instagram_schedule', 'Scheduling on Instagram', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://graph.facebook.com/v19.0/{media-id}?fields=status_code
  // status_code: ERROR, FINISHED, IN_PROGRESS, PUBLISHED
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('instagram_status', 'Checking Instagram post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://graph.facebook.com/v19.0/{media-id}
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('instagram_delete', 'Deleting Instagram post', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: GET https://graph.facebook.com/v19.0/{ig-user-id}/insights
  // metric: impressions, reach, follower_count, email_contacts, phone_call_clicks, text_message_clicks, get_directions_clicks, website_clicks, profile_views
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('instagram_analytics', 'Fetching Instagram analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 2200,
      max_hashtags: 30,
      max_mentions: 20,
      max_media: 10,
      supported_media_types: ['image', 'video', 'carousel'],
      max_video_duration: 90,
      max_image_size: 31457280,
    };
  }

  getAuthUrl(state: string): string {
    const appId = process.env.INSTAGRAM_APP_ID ?? process.env.FACEBOOK_APP_ID ?? '';
    const scopes = 'instagram_basic,instagram_content_publish,instagram_manage_insights';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI ?? '')}&scope=${scopes}&state=${state}`;
  }
}
