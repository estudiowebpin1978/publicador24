import { SocialPlatform, PublishResult, PlatformLimits, PostMetrics } from '@/types';

export interface SocialPlatformAdapter {
  platform: SocialPlatform;
  connectAccount(authorizationCode: string): Promise<ConnectResult>;
  refreshToken(refreshToken: string): Promise<TokenResult>;
  disconnectAccount(accountId: string): Promise<void>;
  getProfile(accessToken: string): Promise<ProfileResult>;
  validateContent(content: ContentValidationInput): Promise<ContentValidationResult>;
  uploadMedia(media: MediaUpload): Promise<MediaUploadResult>;
  publishPost(post: PublishInput): Promise<PublishResult>;
  schedulePost(post: ScheduleInput): Promise<ScheduleResult>;
  getPostStatus(postId: string, accessToken: string): Promise<PostStatusResult>;
  deletePost(postId: string, accessToken: string): Promise<void>;
  getAnalytics(accountId: string, dateRange: DateRange): Promise<AnalyticsResult>;
  getLimits(): PlatformLimits;
  getAuthUrl(state: string): string;
}

export interface ConnectResult {
  success: boolean;
  account_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  scopes?: string[];
  error?: string;
}

export interface TokenResult {
  success: boolean;
  access_token?: string;
  expires_at?: string;
  error?: string;
}

export interface ProfileResult {
  success: boolean;
  user_id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  followers?: number;
  permissions?: string[];
  error?: string;
}

export interface ContentValidationInput {
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  media?: MediaValidationInput[];
  platform: SocialPlatform;
}

export interface MediaValidationInput {
  type: 'image' | 'video' | 'audio';
  url?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MediaUpload {
  file_url: string;
  file_type: string;
  caption?: string;
  access_token: string;
}

export interface MediaUploadResult {
  success: boolean;
  media_id?: string;
  media_url?: string;
  error?: string;
}

export interface PublishInput {
  caption: string;
  media_ids?: string[];
  hashtags?: string[];
  mentions?: string[];
  privacy?: string;
  access_token: string;
  scheduled_at?: string;
}

export interface ScheduleInput extends PublishInput {
  scheduled_at: string;
}

export interface ScheduleResult {
  success: boolean;
  schedule_id?: string;
  scheduled_at?: string;
  error?: string;
  manual_required?: boolean;
}

export interface PostStatusResult {
  success: boolean;
  status: 'PUBLISHED' | 'PROCESSING' | 'FAILED' | 'UNKNOWN';
  post_url?: string;
  error?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AnalyticsResult {
  success: boolean;
  metrics?: PostMetrics;
  daily_data?: DailyAnalytics[];
  error?: string;
}

export interface DailyAnalytics {
  date: string;
  metrics: PostMetrics;
}
