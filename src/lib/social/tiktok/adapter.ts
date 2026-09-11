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

// TODO: TikTok Content Posting API v2
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
// Required scopes: user.info.basic, video.publish, video.upload
// Auth: OAuth 2.0 with PKCE
// Endpoints:
//   POST https://open.tiktokapis.com/v2/post/publish/video/init/
//   POST https://open.tiktokapis.com/v2/post/publish/video/upload/
//   GET  https://open.tiktokapis.com/v2/user/info/
// Rate limits: 1000 requests/day per app, 60 requests/minute per user

const log = createLogger({});

export class TikTokAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'tiktok';

  constructor() {
    super('tiktok');
  }

  // TODO: Implement OAuth 2.0 with PKCE
  // 1. Generate code_verifier and code_challenge (S256)
  // 2. Redirect to https://www.tiktok.com/v2/auth/authorize/
  //    ?client_key=<APP_KEY>&scope=user.info.basic,video.publish,video.upload
  //    &response_type=code&state=<STATE>&code_challenge=<CHALLENGE>&code_challenge_method=S256
  // 3. Exchange code for tokens at POST https://open.tiktokapis.com/v2/oauth/token/
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('tiktok_connect', 'Initiating TikTok OAuth', { has_code: !!authorizationCode });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://open.tiktokapis.com/v2/oauth/token/
  // Body: client_key, client_secret, grant_type=refresh_token, refresh_token
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('tiktok_refresh', 'Refreshing TikTok token');
    return super.refreshToken(refreshToken);
  }

  // TODO: Call revoke endpoint or simply delete stored tokens
  async disconnectAccount(accountId: string): Promise<void> {
    log.info('tiktok_disconnect', 'Disconnecting TikTok account', { account_id: accountId });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('tiktok_profile', 'Fetching TikTok profile');
    return super.getProfile(accessToken);
  }

  // TODO: Validate video format (MP4/MOV), size (max 500MB), duration (max 10min)
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('tiktok_validate', 'Validating TikTok content', {
      caption_length: content.caption?.length,
    });
    return super.validateContent(content);
  }

  // TODO: Implement resumable upload flow
  // 1. POST /v2/post/publish/video/init/ to get upload URL and publish_id
  // 2. Upload video chunks to returned upload_url
  // 3. Monitor upload status
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('tiktok_upload', 'Uploading video to TikTok', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: POST https://open.tiktokapis.com/v2/post/publish/video/init/
  // Body: { post_info: { title, privacy_level, disable_duet, disable_comment, disable_stitch }, source_info: { source: 'FILE_UPLOAD', video_size, chunk_size, total_chunk_count } }
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('tiktok_publish', 'Publishing to TikTok', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: TikTok does not support native scheduling via API
  // Implement app-side scheduling with delayed publish
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('tiktok_schedule', 'Scheduling on TikTok', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://open.tiktokapis.com/v2/post/publish/status/?publish_id=<ID>
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('tiktok_status', 'Checking TikTok post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://open.tiktokapis.com/v2/post/publish/video/delete/?video_id=<ID>
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('tiktok_delete', 'Deleting TikTok post', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: GET https://open.tiktokapis.com/v2/post/publish/video/query/?video_ids=<IDS>
  // Then aggregate metrics: views, likes, comments, shares
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('tiktok_analytics', 'Fetching TikTok analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 2200,
      max_hashtags: 30,
      max_mentions: 10,
      max_media: 12,
      supported_media_types: ['video', 'image'],
      max_video_duration: 600,
      max_video_size: 524288000,
      max_image_size: 10485760,
    };
  }

  getAuthUrl(state: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
    const scopes = 'user.info.basic,video.publish,video.upload';
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&state=${state}`;
  }
}
