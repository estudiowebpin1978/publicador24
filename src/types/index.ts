// Enums
export type SocialPlatform = 'tiktok' | 'instagram' | 'facebook' | 'x' | 'youtube' | 'linkedin';
export type AccountStatus = 'CONNECTED' | 'TOKEN_EXPIRING' | 'TOKEN_EXPIRED' | 'REQUIRES_REAUTH' | 'ERROR' | 'DISCONNECTED';
export type ContentStatus = 'DRAFT' | 'AI_REVIEW' | 'USER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
export type PublishStatus = 'QUEUED' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'RETRY' | 'CANCELLED';
export type AutopilotLevel = 'MANUAL' | 'ASSISTED' | 'AUTO' | 'SAFE_AUTO';
export type ContentType = 'text' | 'image' | 'video' | 'carousel' | 'link' | 'mixed';
export type HealthStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';
export type RateLimitState = 'AVAILABLE' | 'WARNING' | 'THROTTLED' | 'BLOCKED';
export type SpamRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 'PUBLISH_SUCCESS' | 'PUBLISH_FAILED' | 'TOKEN_EXPIRED' | 'ACCOUNT_DISCONNECTED' | 'CONTENT_BLOCKED' | 'SPAM_RISK_HIGH' | 'API_RATE_LIMIT' | 'APPROVAL_REQUIRED';
export type TrendDirection = 'RISING' | 'STABLE' | 'DECLINING';

// Core entities
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  settings: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}

export interface BrandVoice {
  brand_name?: string;
  description?: string;
  tone?: string;
  forbidden_words?: string[];
  required_words?: string[];
  default_cta?: string;
  language?: string;
  emojis?: boolean;
  style?: string;
}

export interface WorkspaceSettings {
  timezone?: string;
  default_language?: string;
  default_country?: string;
  niche?: string;
  autopilot_level?: AutopilotLevel;
  posting_frequency?: Record<SocialPlatform, number>;
  hashtag_strategy?: HashtagStrategy;
  best_time_weights?: BestTimeWeights;
  trend_weights?: TrendWeights;
  experiment_weights?: ExperimentWeights;
}

export interface HashtagStrategy {
  high_reach_percent: number;
  medium_percent: number;
  niche_percent: number;
}

export interface BestTimeWeights {
  day_of_week: number;
  hour: number;
  engagement: number;
  audience: number;
  country: number;
  platform: number;
  content_type: number;
}

export interface TrendWeights {
  recent_growth: number;
  topic_relevance: number;
  engagement_potential: number;
  novelty: number;
  competition: number;
}

export interface ExperimentWeights {
  engagement_rate: number;
  ctr: number;
  retention: number;
  shares: number;
}

// Social accounts
export interface SocialAccount {
  id: string;
  workspace_id: string;
  platform: SocialPlatform;
  platform_user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: AccountStatus;
  permissions: string[];
  missing_permissions: string[];
  connected_at: string;
  last_post_at?: string;
  token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountToken {
  id: string;
  social_account_id: string;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

// Content
export interface Content {
  id: string;
  workspace_id: string;
  campaign_id?: string;
  title: string;
  description?: string;
  content_type: ContentType;
  status: ContentStatus;
  language: string;
  target_platforms: SocialPlatform[];
  media_ids: string[];
  ai_score?: number;
  ai_score_breakdown?: AIScoreBreakdown;
  spam_risk_score: number;
  content_fingerprint?: string;
  version: number;
  parent_content_id?: string;
  brand_voice?: BrandVoice;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ContentVariant {
  id: string;
  content_id: string;
  variant_label: string;
  hook?: string;
  caption?: string;
  hashtags: string[];
  mentions: string[];
  cta?: string;
  ai_score?: number;
  is_winner?: boolean;
  created_at: string;
}

export interface ContentPlatformVariant {
  id: string;
  content_id: string;
  platform: SocialPlatform;
  hook?: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  cta?: string;
  adapted_for_platform: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIScoreBreakdown {
  hook: number;
  relevance: number;
  clarity: number;
  emotion: number;
  trend: number;
  hashtags: number;
  platform_fit: number;
  cta: number;
  spam_risk: number;
  overall: number;
}

// Media
export interface Media {
  id: string;
  workspace_id: string;
  content_id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  hash?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Publishing
export interface ScheduledPost {
  id: string;
  workspace_id: string;
  content_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  platform_variant_id?: string;
  variant_id?: string;
  scheduled_at: string;
  status: PublishStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  next_attempt_at?: string;
  locked_at?: string;
  published_at?: string;
  platform_post_id?: string;
  platform_post_url?: string;
  error_message?: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface PublishedPost {
  id: string;
  scheduled_post_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  platform_post_id: string;
  platform_post_url?: string;
  caption?: string;
  hashtags: string[];
  media_urls: string[];
  published_at: string;
  metrics: PostMetrics;
  created_at: string;
  updated_at: string;
}

export interface PublishAttempt {
  id: string;
  scheduled_post_id: string;
  attempt_number: number;
  status: PublishStatus;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  error_code?: string;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

// Analytics
export interface PostMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  reach?: number;
  impressions?: number;
  engagement_rate?: number;
  watch_time?: number;
  retention?: number;
  followers_gained?: number;
}

export interface AnalyticsDaily {
  id: string;
  workspace_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  date: string;
  followers: number;
  followers_gained: number;
  impressions: number;
  reach: number;
  engagement: number;
  engagement_rate: number;
  posts_count: number;
  top_post_id?: string;
  metrics: PostMetrics;
  created_at: string;
}

export interface AnalyticsPost {
  id: string;
  published_post_id: string;
  workspace_id: string;
  platform: SocialPlatform;
  collected_at: string;
  metrics: PostMetrics;
  created_at: string;
}

// Hashtags
export interface Hashtag {
  id: string;
  tag: string;
  category?: string;
  language: string;
  country?: string;
  platform?: SocialPlatform;
  popularity_score?: number;
  competition_score?: number;
  relevance_score?: number;
  trend_score?: number;
  final_score?: number;
  is_estimated: boolean;
  data_source?: string;
  created_at: string;
  updated_at: string;
}

export interface HashtagRecommendation {
  hashtag: string;
  category: string;
  relevance: number;
  popularity: number;
  competition: number;
  trend: number;
  final_score: number;
  is_estimated: boolean;
}

// Trends
export interface Trend {
  id: string;
  keyword: string;
  category?: string;
  platform?: SocialPlatform;
  country?: string;
  language: string;
  direction: TrendDirection;
  trend_score: number;
  volume?: number;
  growth_rate?: number;
  related_hashtags: string[];
  related_entities: string[];
  detected_at: string;
  expires_at?: string;
  created_at: string;
}

// Mentions
export interface Mention {
  id: string;
  content_id: string;
  username: string;
  platform: SocialPlatform;
  category?: string;
  relevance_score: number;
  follower_count?: number;
  is_verified?: boolean;
  approved: boolean;
  created_at: string;
}

// Experiments
export interface ContentExperiment {
  id: string;
  workspace_id: string;
  content_id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  winner_variant_id?: string;
  winner_score?: number;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export interface ExperimentVariant {
  id: string;
  experiment_id: string;
  variant_label: string;
  content_variant_id: string;
  published_post_id?: string;
  metrics: PostMetrics;
  winner_score?: number;
  created_at: string;
}

// AI
export interface AIGeneration {
  id: string;
  workspace_id: string;
  content_id?: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  duration_ms: number;
  success: boolean;
  error?: string;
  created_at: string;
}

export interface AIUsage {
  id: string;
  workspace_id: string;
  date: string;
  total_tokens: number;
  total_cost: number;
  operations_count: number;
  created_at: string;
}

// Campaigns
export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  objective?: string;
  target_audience?: string;
  platforms: SocialPlatform[];
  start_date?: string;
  end_date?: string;
  budget?: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  content_count: number;
  published_count: number;
  metrics: PostMetrics;
  created_at: string;
  updated_at: string;
}

// Jobs
export interface Job {
  id: string;
  workspace_id?: string;
  job_type: string;
  job_key: string;
  idempotency_key: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  max_attempts: number;
  next_run_at?: string;
  locked_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Rate Limiting
export interface RateLimit {
  id: string;
  social_account_id: string;
  platform: SocialPlatform;
  endpoint: string;
  state: RateLimitState;
  remaining: number;
  limit: number;
  reset_at: string;
  updated_at: string;
}

// Notifications
export interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id?: string;
  action: string;
  platform?: SocialPlatform;
  content_id?: string;
  post_id?: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  error?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Platform adapter types
export interface PublishResult {
  success: boolean;
  platform_post_id?: string;
  platform_post_url?: string;
  error?: string;
  error_code?: string;
  manual_required?: boolean;
  retry_after?: number;
}

export interface PlatformLimits {
  max_caption_length: number;
  max_hashtags: number;
  max_mentions: number;
  max_media: number;
  supported_media_types: string[];
  max_video_duration?: number;
  max_video_size?: number;
  max_image_size?: number;
  requires_business_account?: boolean;
}

// Dry run result
export interface DryRunResult {
  platform: SocialPlatform;
  validated: boolean;
  caption: string;
  hashtags: string[];
  media: string[];
  permissions: string[];
  rateLimit: RateLimitState;
  spamRisk: SpamRiskLevel;
  contentScore: number;
  finalDecision: 'APPROVED' | 'REJECTED' | 'MANUAL_REQUIRED' | 'SPAM_BLOCKED';
  errors: string[];
  warnings: string[];
}
