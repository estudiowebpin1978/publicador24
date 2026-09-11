import type { SocialPlatform } from '@/types';

// ============================================
// CONTENT INTELLIGENCE
// ============================================

export interface ContentIntelligence {
  topic: string;
  entities: string[];
  keywords: string[];
  intent: string;
  sentiment: number;
  audience: string;
  language: string;
  country: string;
  category: string;
  trendScore: number;
  relevanceScore: number;
  originalityScore: number;
}

// ============================================
// HOOK ENGINE
// ============================================

export type HookType = 'curiosity' | 'question' | 'contrarian' | 'benefit' | 'fear' | 'story' | 'surprise' | 'problem' | 'solution' | 'list';

export interface GeneratedHook {
  text: string;
  type: HookType;
  score: number;
}

export interface HookEngineInput {
  topic: string;
  audience?: string;
  tone?: string;
  language?: string;
  country?: string;
  platform?: SocialPlatform;
  count?: number;
}

export interface HookEngineResult {
  hooks: GeneratedHook[];
  topHook: GeneratedHook;
}

// ============================================
// TITLE ENGINE
// ============================================

export interface GeneratedTitle {
  text: string;
  clarity: number;
  curiosity: number;
  relevance: number;
  length: number;
  platformFit: number;
  titleScore: number;
}

export interface TitleEngineInput {
  topic: string;
  hooks?: string[];
  platform?: SocialPlatform;
  language?: string;
  count?: number;
}

export interface TitleEngineResult {
  titles: GeneratedTitle[];
  topTitle: GeneratedTitle;
}

// ============================================
// CAPTION ENGINE
// ============================================

export type CaptionStyle = 'original' | 'short' | 'long' | 'storytelling' | 'educational' | 'promotional';

export interface GeneratedCaption {
  text: string;
  style: CaptionStyle;
  wordCount: number;
  score: number;
}

export interface CaptionEngineInput {
  topic: string;
  hook?: string;
  platform: SocialPlatform;
  language?: string;
  tone?: string;
  audience?: string;
  cta?: string;
  styles?: CaptionStyle[];
}

export interface CaptionEngineResult {
  captions: GeneratedCaption[];
  bestCaption: GeneratedCaption;
}

// ============================================
// CONTENT REPURPOSING
// ============================================

export interface RepurposeInput {
  originalContent: string;
  mediaUrls?: string[];
  topic: string;
  language?: string;
  tone?: string;
  audience?: string;
  targetPlatforms?: SocialPlatform[];
}

export interface RepurposedVariant {
  platform: SocialPlatform;
  hook: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  cta: string;
  format: string;
  score: number;
}

export interface RepurposeResult {
  original: {
    content: string;
    topic: string;
  };
  variants: RepurposedVariant[];
  totalGenerated: number;
}

// ============================================
// IDEA GENERATOR
// ============================================

export interface IdeaGeneratorInput {
  niche: string;
  language?: string;
  country?: string;
  audience?: string;
  platforms?: SocialPlatform[];
  count?: number;
  contentPillars?: ContentPillar[];
}

export interface GeneratedIdea {
  title: string;
  hook: string;
  angle: string;
  format: string;
  platform: SocialPlatform;
  pillar: string;
  score: number;
  description: string;
}

export interface IdeaGeneratorResult {
  ideas: GeneratedIdea[];
}

// ============================================
// CONTENT PILLARS
// ============================================

export type PillarType = 'educational' | 'entertainment' | 'promotional' | 'inspirational' | 'news' | 'behind_the_scenes' | 'tutorial';

export interface ContentPillar {
  type: PillarType;
  name: string;
  percentage: number;
  description?: string;
}

export interface ContentMixConfig {
  pillars: ContentPillar[];
  totalPosts: number;
}

export interface ContentMixResult {
  schedule: Array<{
    pillar: ContentPillar;
    count: number;
  }>;
  distribution: Record<PillarType, number>;
}

// ============================================
// LEARNING ENGINE
// ============================================

export interface LearningMemory {
  successfulHooks: Array<{ text: string; type: HookType; score: number }>;
  successfulTopics: Array<{ topic: string; score: number }>;
  successfulHashtags: Array<{ tag: string; platform: SocialPlatform; score: number }>;
  successfulTimes: Array<{ day: number; hour: number; platform: SocialPlatform; score: number }>;
  successfulFormats: Array<{ format: string; platform: SocialPlatform; score: number }>;
}

export interface AdaptiveWeights {
  hookWeights: Record<HookType, number>;
  hashtagWeight: number;
  topicWeight: number;
  timeWeight: number;
  formatWeight: number;
  lastUpdated: string;
}

// ============================================
// CONTENT MEMORY
// ============================================

export interface ContentMemory {
  topicsUsed: Array<{ topic: string; count: number; lastUsed: string }>;
  hooksUsed: Array<{ hook: string; count: number; lastUsed: string }>;
  hashtagsUsed: Array<{ tag: string; count: number; lastUsed: string }>;
  formatsUsed: Array<{ format: string; count: number; lastUsed: string }>;
}

// ============================================
// TREND ALERTS
// ============================================

export interface TrendAlert {
  id: string;
  keyword: string;
  relevance: number;
  score: number;
  direction: 'RISING' | 'STABLE' | 'DECLINING';
  suggestedContent: string;
  platform: SocialPlatform;
  detectedAt: string;
}

// ============================================
// BRAND MEMORY
// ============================================

export interface BrandMemory {
  successfulHooks: Array<{ text: string; engagement: number; platform: SocialPlatform }>;
  successfulCaptions: Array<{ text: string; engagement: number; platform: SocialPlatform }>;
  successfulHashtags: Array<{ tag: string; engagement: number; platform: SocialPlatform }>;
  successfulTopics: Array<{ topic: string; engagement: number }>;
  successfulFormats: Array<{ format: string; engagement: number; platform: SocialPlatform }>;
  lastUpdated: string;
}

// ============================================
// CONTENT DECAY
// ============================================

export interface ContentDecayItem {
  contentId: string;
  title: string;
  originalScore: number;
  currentScore: number;
  daysSincePublish: number;
  decayRate: number;
  suggestedAction: 'refresh' | 'repurpose' | 'archive';
  suggestedReason: string;
}

// ============================================
// PUBLISH DECISION ENGINE
// ============================================

export type PublishDecision = 'APPROVE' | 'REVIEW' | 'WAIT' | 'MANUAL_REQUIRED' | 'BLOCK';

export interface PublishDecisionInput {
  contentScore: number;
  spamRisk: number;
  platformValidation: 'PASS' | 'FAIL';
  permissions: 'OK' | 'MISSING';
  rateLimit: 'AVAILABLE' | 'WARNING' | 'THROTTLED' | 'BLOCKED';
  accountHealth: number;
  tokenValid: boolean;
  autopilotLevel: 'MANUAL' | 'ASSISTED' | 'AUTO' | 'SAFE_AUTO';
}

export interface PublishDecisionResult {
  decision: PublishDecision;
  reason: string;
  factors: Record<string, string>;
}
