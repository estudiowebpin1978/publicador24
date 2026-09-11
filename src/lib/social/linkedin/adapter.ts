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

// TODO: LinkedIn Marketing API
// Docs: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
// Required scopes: w_member_social, r_liteprofile, r_emailaddress
// Auth: OAuth 2.0
// Endpoints:
//   POST https://api.linkedin.com/v2/ugcPosts
//   GET  https://api.linkedin.com/v2/me
//   POST https://api.linkedin.com/v2/assets?action=registerUpload
// Rate limits: 100 requests/minute per app

const log = createLogger({});

export class LinkedInAdapter extends MockSocialAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform = 'linkedin';

  constructor() {
    super('linkedin');
  }

  // TODO: LinkedIn OAuth 2.0
  // 1. Redirect to https://www.linkedin.com/oauth/v2/authorization
  //    ?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<URI>&scope=w_member_social,r_liteprofile
  // 2. Exchange code for tokens at POST https://www.linkedin.com/oauth/v2/accessToken
  async connectAccount(authorizationCode: string): Promise<ConnectResult> {
    log.info('linkedin_connect', 'Initiating LinkedIn OAuth', { has_code: !!authorizationCode });
    return super.connectAccount(authorizationCode);
  }

  // TODO: POST https://www.linkedin.com/oauth/v2/accessToken
  // Body: grant_type=refresh_token, client_id, client_secret, refresh_token
  async refreshToken(refreshToken: string): Promise<TokenResult> {
    log.info('linkedin_refresh', 'Refreshing LinkedIn token');
    return super.refreshToken(refreshToken);
  }

  // TODO: LinkedIn does not have a revoke endpoint
  // Simply delete stored tokens
  async disconnectAccount(accountId: string): Promise<void> {
    log.info('linkedin_disconnect', 'Disconnecting LinkedIn account', {
      account_id: accountId,
    });
    return super.disconnectAccount(accountId);
  }

  // TODO: GET https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))
  async getProfile(accessToken: string): Promise<ProfileResult> {
    log.info('linkedin_profile', 'Fetching LinkedIn profile');
    return super.getProfile(accessToken);
  }

  // TODO: Validate professional content formatting
  // Check: no all-caps, appropriate hashtags (3-5), professional tone
  // LinkedIn penalizes excessive hashtags and promotional language
  async validateContent(content: ContentValidationInput): Promise<ContentValidationResult> {
    log.info('linkedin_validate', 'Validating LinkedIn content');
    return super.validateContent(content);
  }

  // TODO: Two-step upload:
  // 1. POST https://api.linkedin.com/v2/assets?action=registerUpload (get upload URL)
  // 2. PUT returned URL with binary data
  // 3. Use returned asset URN in post
  async uploadMedia(media: MediaUpload): Promise<MediaUploadResult> {
    log.info('linkedin_upload', 'Uploading media to LinkedIn', { file_type: media.file_type });
    return super.uploadMedia(media);
  }

  // TODO: POST https://api.linkedin.com/v2/ugcPosts
  // Body: {
  //   author: 'urn:li:person:<PERSON_ID>',
  //   lifecycleState: 'PUBLISHED',
  //   specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
  //   visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  // }
  // For images: shareMediaCategory='IMAGE', media=[{ status: 'READY', media: 'urn:li:asset:<ASSET_ID>' }]
  async publishPost(post: PublishInput): Promise<PublishResult> {
    log.info('linkedin_publish', 'Publishing to LinkedIn', { caption_length: post.caption.length });
    return super.publishPost(post);
  }

  // TODO: LinkedIn does not support native scheduling via API
  // Use app-side scheduler with delayed publish
  async schedulePost(post: ScheduleInput): Promise<ScheduleResult> {
    log.info('linkedin_schedule', 'Scheduling on LinkedIn', { scheduled_at: post.scheduled_at });
    return super.schedulePost(post);
  }

  // TODO: GET https://api.linkedin.com/v2/socialActions/<POST_URN>/comments (check existence)
  // Or check UGC post status via the share endpoint
  async getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult> {
    log.info('linkedin_status', 'Checking LinkedIn post status', { post_id: postId });
    return super.getPostStatus(postId, accessToken);
  }

  // TODO: DELETE https://api.linkedin.com/v2/ugcPosts/<POST_ID>
  async deletePost(postId: string, _accessToken: string): Promise<void> {
    log.info('linkedin_delete', 'Deleting LinkedIn post', { post_id: postId });
    return super.deletePost(postId, _accessToken);
  }

  // TODO: LinkedIn Analytics API requires organization page or verified developer
  // GET https://api.linkedin.com/v2/organizationalEntityShareStatistics
  // Metrics: shareCount, likeCount, commentCount, impressionCount
  async getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult> {
    log.info('linkedin_analytics', 'Fetching LinkedIn analytics');
    return super.getAnalytics(accountId, dateRange);
  }

  getLimits(): PlatformLimits {
    return {
      max_caption_length: 3000,
      max_hashtags: 10,
      max_mentions: 10,
      max_media: 1,
      supported_media_types: ['image', 'video'],
      max_video_duration: 600,
      max_video_size: 5368709120,
      max_image_size: 31457280,
      requires_business_account: true,
    };
  }

  getAuthUrl(state: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
    const scopes = 'w_member_social,r_liteprofile,r_emailaddress';
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI ?? '')}&scope=${scopes}&state=${state}`;
  }
}
