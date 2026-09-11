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

// TODO: YouTube Data API v3 + YouTube Analytics API
// Docs: https://developers.google.com/youtube/v3/getting-started
// Required scopes: youtube.upload, youtube, youtube.readonly
// Auth: OAuth 2.0
// Endpoints:
//   POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
//   GET  https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics
//   GET  https://www.googleapis.com/youtube/v3/analytics
// Rate limits: 10,000 units/day (uploads cost 1600 units each)
// Note: YouTube Shorts must be < 60 seconds, vertical (9:16 aspect ratio)

const log = createLogger({});

export class YouTubeAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'youtube';

  constructor() {
    super('youtube');
  }

  // TODO: YouTube OAuth 2.0
  // 1. Redirect to https://accounts.google.com/o/oauth2/v2/auth
  //    ?client_id=<CLIENT_ID>&redirect_uri=<URI>&scope=youtube.upload,youtube
  //    &response_type=code&access_type=offline
  // 2. Exchange code for tokens at POST https://oauth2.googleapis.com/token
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('youtube_connect', 'Initiating YouTube OAuth', { has_code: !!authorizationCode });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://oauth2.googleapis.com/token
  // Body: grant_type=refresh_token, client_id, client_secret, refresh_token
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('youtube_refresh', 'Refreshing YouTube token');
    return super.refreshToken(refreshToken);
  }

  // TODO: POST https://oauth2.googleapis.com/revoke?token=<TOKEN>
  async disconnectAccount(accountId: string): Promise<void> {
    log.info('youtube_disconnect', 'Disconnecting YouTube account', {
      account_id: accountId,
    });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('youtube_profile', 'Fetching YouTube profile');
    return super.getProfile(accessToken);
  }

  // TODO: Validate video for Shorts (< 60s, 9:16 aspect ratio)
  // Validate title (max 100 chars), description (max 5000 chars)
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('youtube_validate', 'Validating YouTube content');
    return super.validateContent(content);
  }

  // TODO: Resumable upload flow:
  // 1. POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
  //    Body: { snippet: { title, description, tags }, status: { privacyStatus } }
  // 2. PUT returned upload URL with video binary
  // 3. For shorts: set status.selfDeclaredMadeForKids=false, add #Shorts tag
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('youtube_upload', 'Uploading video to YouTube', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: Use resumable upload directly (no separate publish step)
  // For shorts: ensure video is < 60s, add #Shorts to tags
  // Set status.privacyStatus to 'public' or 'private' (then update)
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('youtube_publish', 'Publishing to YouTube', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: Set status.privacyStatus='private' then update to 'public' at scheduled time
  // Or use YouTube's scheduled publishing (limited availability)
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('youtube_schedule', 'Scheduling on YouTube', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=<ID>
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('youtube_status', 'Checking YouTube post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://www.googleapis.com/youtube/v3/videos?id=<ID>
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('youtube_delete', 'Deleting YouTube video', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: GET https://www.googleapis.com/youtube/v3/analytics
  // Dimensions: day, video
  // Metrics: views, likes, comments, shares, estimatedMinutesWatched
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('youtube_analytics', 'Fetching YouTube analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 5000,
      max_hashtags: 15,
      max_mentions: 0,
      max_media: 1,
      supported_media_types: ['video'],
      max_video_duration: 60,
      max_video_size: 268435456,
    };
  }

  getAuthUrl(state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID ?? '';
    const scopes = 'youtube.upload,youtube';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.YOUTUBE_REDIRECT_URI ?? '')}&scope=${scopes}&response_type=code&access_type=offline&state=${state}`;
  }
}
