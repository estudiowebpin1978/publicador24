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

// TODO: X (Twitter) API v2
// Docs: https://developer.x.com/en/docs/twitter-api
// Required scopes: tweet.read, tweet.write, users.read, offline.access
// Auth: OAuth 2.0 with PKCE (preferred) or OAuth 1.0a
// Endpoints:
//   POST https://api.x.com/2/tweets
//   POST https://api.x.com/1.1/media/upload.json (for media)
//   GET  https://api.x.com/2/users/me
// Rate limits: 300 tweets/15min (app), 200 tweets/15min (user)
// Note: X has strict rate limits; implement exponential backoff

const log = createLogger({});

export class XAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'x';

  constructor() {
    super('x');
  }

  // TODO: X OAuth 2.0 with PKCE
  // 1. Generate code_verifier and code_challenge
  // 2. Redirect to https://twitter.com/i/oauth2/authorize
  //    ?client_id=<CLIENT_ID>&redirect_uri=<URI>&scope=tweet.read,tweet.write,users.read,offline.access
  //    &response_type=code&state=<STATE>&code_challenge=<CHALLENGE>&code_challenge_method=S256
  // 3. Exchange code for tokens at POST https://api.x.com/2/oauth2/token
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('x_connect', 'Initiating X OAuth', { has_code: !!authorizationCode });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://api.x.com/2/oauth2/token
  // Body: grant_type=refresh_token, client_id, refresh_token
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('x_refresh', 'Refreshing X token');
    return super.refreshToken(refreshToken);
  }

  // TODO: POST https://api.x.com/2/oauth2/revoke (if using OAuth 2.0)
  // Or simply delete stored tokens for OAuth 1.0a
  async disconnectAccount(accountId: string): Promise<void> {
    log.info('x_disconnect', 'Disconnecting X account', { account_id: accountId });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://api.x.com/2/users/me?fields=profile_image_url,public_metrics
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('x_profile', 'Fetching X profile');
    return super.getProfile(accessToken);
  }

  // TODO: Validate tweet length (280 chars), media count (max 4)
  // Check for community notes eligibility
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('x_validate', 'Validating X content', {
      caption_length: content.caption?.length,
    });
    return super.validateContent(content);
  }

  // TODO: POST https://api.x.com/1.1/media/upload.json (chunked for large files)
  // For images: upload directly
  // For videos: use chunked upload endpoint
  // Returns media_id_string for use in tweet creation
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('x_upload', 'Uploading media to X', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: POST https://api.x.com/2/tweets
  // Body: { text, media: { media_ids: [...] } }
  // For thread: POST multiple tweets with reply settings
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('x_publish', 'Publishing to X', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: X API does not support native tweet scheduling
  // Use app-side scheduler with delayed publish
  // Or use Twitter Advanced Search API for scheduled tweets (not recommended)
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('x_schedule', 'Scheduling on X', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://api.x.com/2/tweets/:id?fields=created_at,public_metrics
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('x_status', 'Checking X post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://api.x.com/2/tweets/:id
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('x_delete', 'Deleting X post', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: GET https://api.x.com/2/users/:id/tweets?fields=public_metrics,created_at
  // Aggregate: impressions, retweets, likes, replies, quote tweets
  // Note: X rate limits analytics heavily; cache results
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('x_analytics', 'Fetching X analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 280,
      max_hashtags: 10,
      max_mentions: 10,
      max_media: 4,
      supported_media_types: ['image', 'video', 'gif'],
      max_video_duration: 140,
      max_video_size: 536870912,
      max_image_size: 5242880,
    };
  }

  getAuthUrl(state: string): string {
    const clientId = process.env.X_CLIENT_ID ?? '';
    const scopes = 'tweet.read,tweet.write,users.read,offline.access';
    return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.X_REDIRECT_URI ?? '')}&scope=${scopes}&response_type=code&state=${state}`;
  }
}
