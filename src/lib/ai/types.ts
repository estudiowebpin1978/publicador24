export interface AIProvider {
  generateText(input: AITextInput): Promise<AITextResult>;
  analyzeContent(input: AIAnalysisInput): Promise<AIAnalysisResult>;
  generateHashtags(input: HashtagInput): Promise<HashtagResult>;
  analyzeTrend(input: TrendInput): Promise<TrendResult>;
  generateVariants(input: VariantInput): Promise<VariantResult>;
  scoreContent(input: ScoreInput): Promise<ScoreResult>;
}

export interface AITextInput {
  prompt: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AITextResult {
  text: string;
  tokens_used: number;
  model: string;
}

export interface AIAnalysisInput {
  content: string;
  platform?: string;
  language?: string;
  audience?: string;
}

export interface AIAnalysisResult {
  topic: string;
  intent: string;
  audience: string;
  tone: string;
  emotions: string[];
  keywords: string[];
  entities: string[];
  language: string;
  sentiment: number;
}

export interface HashtagInput {
  content: string;
  platform: string;
  language: string;
  country?: string;
  count?: number;
}

export interface HashtagResult {
  hashtags: Array<{
    tag: string;
    category: string;
    relevance: number;
    popularity: number;
    competition: number;
    trend: number;
    final_score: number;
    is_estimated: boolean;
  }>;
}

export interface TrendInput {
  keywords: string[];
  platform?: string;
  country?: string;
  language?: string;
}

export interface TrendResult {
  trends: Array<{
    keyword: string;
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    score: number;
    growth_rate: number;
    related_hashtags: string[];
  }>;
}

export interface VariantInput {
  content: string;
  platform: string;
  variant_count?: number;
  preserve_meaning?: boolean;
}

export interface VariantResult {
  variants: Array<{
    label: string;
    hook: string;
    caption: string;
    hashtags: string[];
    cta: string;
    score: number;
  }>;
}

export interface ScoreInput {
  content: string;
  platform: string;
  hook?: string;
  hashtags?: string[];
  cta?: string;
}

export interface ScoreResult {
  overall: number;
  breakdown: {
    hook: number;
    relevance: number;
    clarity: number;
    emotion: number;
    trend: number;
    hashtags: number;
    platform_fit: number;
    cta: number;
  };
  explanation: string;
  suggestions: string[];
}
