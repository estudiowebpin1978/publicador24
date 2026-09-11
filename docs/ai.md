# AI System Documentation

Complete guide to the AI-powered features in Auto Publisher.

## Overview

The AI system provides content generation, optimization, and intelligence features using OpenAI's GPT-4o-mini model.

```
┌─────────────────────────────────────────────────────────┐
│                    AI System Architecture                 │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 AI Provider Layer                  │  │
│  │  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │OpenAIProvider│  │ MockProvider │             │  │
│  │  │  (GPT-4o-mini)│  │  (Dev Mode) │             │  │
│  │  └──────┬───────┘  └──────┬───────┘             │  │
│  │         └─────────────────┘                      │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │                Prompt Templates                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Content  │ │ Hashtags │ │Optimization│         │  │
│  │  └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐                      │  │
│  │  │ Safety   │ │ Trends   │                      │  │
│  │  └──────────┘ └──────────┘                      │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Feature Engines                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │Content   │ │ Hashtag  │ │Analytics │         │  │
│  │  │Generator │ │ Engine   │ │ Engine   │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## AI Provider Architecture

### Provider Interface
```typescript
interface AIProvider {
  generateText(input: AITextInput): Promise<AITextResult>;
  analyzeContent(input: AIAnalysisInput): Promise<AIAnalysisResult>;
  generateHashtags(input: HashtagInput): Promise<HashtagResult>;
  analyzeTrend(input: TrendInput): Promise<TrendResult>;
  generateVariants(input: VariantInput): Promise<VariantResult>;
  scoreContent(input: ScoreInput): Promise<ScoreResult>;
}
```

### Provider Selection
```typescript
// src/lib/ai/provider.ts
export function getAIProvider(): AIProvider {
  const hasApiKey = !!process.env.AI_API_KEY;
  
  if (hasApiKey) {
    return new OpenAIProvider();
  }
  return new MockAIProvider();
}
```

### OpenAI Provider
```typescript
class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AI_API_KEY,
    });
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS || '2000');
    this.temperature = parseFloat(process.env.AI_TEMPERATURE || '0.7');
  }

  async generateText(input: AITextInput): Promise<AITextResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: input.system_prompt || '' },
        { role: 'user', content: input.prompt },
      ],
      max_tokens: input.max_tokens || this.maxTokens,
      temperature: input.temperature || this.temperature,
    });

    return {
      text: response.choices[0].message.content || '',
      tokens_used: response.usage?.total_tokens || 0,
      model: this.model,
    };
  }
}
```

### Mock Provider
Returns simulated data for development:
```typescript
class MockAIProvider implements AIProvider {
  async generateText(input: AITextInput): Promise<AITextResult> {
    return {
      text: `Mock generated text for: ${input.prompt.substring(0, 50)}...`,
      tokens_used: 100,
      model: 'mock',
    };
  }

  async scoreContent(input: ScoreInput): Promise<ScoreResult> {
    return {
      overall: 75,
      breakdown: {
        hook: 80,
        relevance: 70,
        clarity: 75,
        emotion: 65,
        trend: 80,
        hashtags: 70,
        platform_fit: 85,
        cta: 60,
      },
      explanation: 'Good content with room for improvement.',
      suggestions: ['Add a stronger hook', 'Include a clear CTA'],
    };
  }
}
```

## Content Generation Flow

### 1. Text Generation
```
User Input → System Prompt → OpenAI API → Response → Store
     │              │              │           │        │
     ▼              ▼              ▼           ▼        ▼
  Topic/Theme   Brand Voice    GPT-4o-mini   Generated  Database
  Platform      Content Rules               Content
```

### 2. Platform Adaptation
```
Original Content → Platform Limits → Adaptation → Platform Variant
       │                │                │              │
       ▼                ▼                ▼              ▼
   Base Caption    Character Limits   Rewrite      Optimized
   Hashtags        Media Rules       Rephrase      Content
```

### 3. Content Scoring
```
Content → AI Analysis → Score Breakdown → Overall Score
   │           │              │               │
   ▼           ▼              ▼               ▼
 Caption    Multi-factor   9 Categories   Weighted
 Hashtags   Evaluation     (0-100 each)   Average
 CTA        Metrics
```

## Hashtag Intelligence

### Hashtag Strategy
```typescript
interface HashtagStrategyConfig {
  high_reach_percent: number;  // Popular hashtags (30%)
  medium_percent: number;      // Medium popularity (40%)
  niche_percent: number;       // Niche hashtags (30%)
}
```

### Hashtag Scoring
```typescript
interface HashtagRecommendation {
  hashtag: string;
  category: string;          // high_reach, medium, niche
  relevance: number;         // 0-100
  popularity: number;        // 0-100
  competition: number;       // 0-100 (lower is better)
  trend: number;             // 0-100
  final_score: number;       // Weighted average
  is_estimated: boolean;     // AI-estimated vs real data
}
```

### Hashtag Generation Flow
```
Content Analysis → AI Generation → Categorization → Strategy Distribution
       │                │                │                    │
       ▼                ▼                ▼                    ▼
   Extract         Generate         Score &           30% High Reach
   Keywords        20+ Hashtags     Categorize        40% Medium
   Topics          via AI                              30% Niche
```

### Example Output
```json
{
  "hashtags": [
    { "tag": "#marketing", "category": "high_reach", "relevance": 95, "popularity": 90, "competition": 85, "trend": 70 },
    { "tag": "#digitalmarketingtips", "category": "medium", "relevance": 88, "popularity": 60, "competition": 45, "trend": 80 },
    { "tag": "#smallbizmarketing", "category": "niche", "relevance": 92, "popularity": 30, "competition": 20, "trend": 85 }
  ],
  "distribution": { "high_reach": 3, "medium": 4, "niche": 3 },
  "data_source": "ai"
}
```

## Trend Analysis

### Trend Detection
```typescript
interface TrendInput {
  keywords: string[];
  platform?: string;
  country?: string;
  language?: string;
}

interface TrendResult {
  trends: Array<{
    keyword: string;
    direction: 'RISING' | 'STABLE' | 'DECLINING';
    score: number;
    growth_rate: number;
    related_hashtags: string[];
  }>;
}
```

### Trend Scoring Factors
```typescript
interface TrendWeights {
  recent_growth: number;       // Weight for recent growth
  topic_relevance: number;     // Weight for topic relevance
  engagement_potential: number; // Weight for engagement potential
  novelty: number;             // Weight for novelty
  competition: number;         // Weight for competition level
}
```

### Trend Analysis Flow
```
Keywords → AI Analysis → Direction Detection → Score Calculation
    │           │               │                    │
    ▼           ▼               ▼                    ▼
 Extract    Analyze        RISING/STABLE/      Weighted Score
 Topics     Context        DECLINING
```

## Content Scoring

### Score Breakdown
```typescript
interface AIScoreBreakdown {
  hook: number;           // Opening line effectiveness
  relevance: number;      // Topic relevance
  clarity: number;        // Message clarity
  emotion: number;        // Emotional impact
  trend: number;          // Trend alignment
  hashtags: number;       // Hashtag quality
  platform_fit: number;   // Platform optimization
  cta: number;            // Call-to-action strength
  spam_risk: number;      // Spam detection (lower is better)
  overall: number;        // Weighted average
}
```

### Scoring Criteria

| Factor | Weight | Description |
|--------|--------|-------------|
| Hook | 15% | Opening line grabs attention |
| Relevance | 15% | Content matches target audience |
| Clarity | 10% | Message is clear and concise |
| Emotion | 10% | Evokes appropriate emotions |
| Trend | 10% | Aligns with current trends |
| Hashtags | 10% | Relevant and strategic |
| Platform Fit | 15% | Optimized for platform |
| CTA | 10% | Clear call-to-action |
| Spam Risk | 5% | Lower is better |

### Score Interpretation
```
90-100: Excellent - Ready to publish
80-89:  Good - Minor improvements needed
70-79:  Average - Consider revisions
60-69:  Below Average - Significant improvements needed
<60:    Poor - Major revisions required
```

## Prompt Management

### Prompt Templates

#### Content Generation Prompt
```typescript
// src/lib/ai/prompts/content.ts
export const CONTENT_GENERATION_PROMPT = `
You are a social media content expert. Generate engaging content for {platform}.

Topic: {topic}
Brand Voice: {brand_voice}
Target Audience: {audience}
Language: {language}

Requirements:
1. Create a compelling hook (first line)
2. Write engaging body content
3. Include a clear call-to-action
4. Suggest relevant hashtags

Platform-specific guidelines:
{platform_guidelines}
`;
```

#### Hashtag Generation Prompt
```typescript
// src/lib/ai/prompts/hashtags.ts
export const HASHTAG_GENERATION_PROMPT = `
Generate {count} relevant hashtags for {platform}.

Content: {content}
Language: {language}
Country: {country}

Categorize each hashtag as:
- high_reach: Very popular (1M+ posts)
- medium: Moderately popular (100K-1M posts)
- niche: Specific/targeted (<100K posts)

For each hashtag provide:
- tag: The hashtag
- category: high_reach/medium/niche
- relevance: 0-100
- popularity: 0-100
- competition: 0-100
- trend: 0-100
`;
```

#### Content Scoring Prompt
```typescript
// src/lib/ai/prompts/optimization.ts
export const CONTENT_SCORING_PROMPT = `
Analyze this social media content and provide a score breakdown.

Content: {content}
Platform: {platform}
Hashtags: {hashtags}
CTA: {cta}

Score each factor from 0-100:
1. hook: Opening line effectiveness
2. relevance: Topic relevance
3. clarity: Message clarity
4. emotion: Emotional impact
5. trend: Trend alignment
6. hashtags: Hashtag quality
7. platform_fit: Platform optimization
8. cta: Call-to-action strength

Also assess spam_risk (0-100, lower is better).

Provide:
- Individual scores
- Overall weighted score
- Explanation
- Suggestions for improvement
`;
```

#### Safety Detection Prompt
```typescript
// src/lib/ai/prompts/safety.ts
export const SPAM_DETECTION_PROMPT = `
Analyze this content for spam risk.

Content: {content}

Check for:
1. Spammy language (excessive caps, exclamation marks)
2. Misleading claims
3. Prohibited content
4. Duplicate/suspicious patterns
5. Engagement bait

Provide:
- spam_risk: 0-100 (0=no risk, 100=definite spam)
- reasons: Array of detected issues
- suggestions: Array of fixes
`;
```

## Cost Tracking

### Token Usage
```typescript
interface AIGeneration {
  id: string;
  workspace_id: string;
  content_id?: string;
  model: string;
  operation: string;        // 'generate', 'score', 'hashtag', etc.
  input_tokens: number;
  output_tokens: number;
  cost: number;             // Calculated cost in dollars
  duration_ms: number;
  success: boolean;
  error?: string;
  created_at: string;
}
```

### Cost Calculation
```typescript
// GPT-4o-mini pricing (as of 2024)
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15 / 1000000,   // $0.15 per 1M input tokens
    output: 0.60 / 1000000,  // $0.60 per 1M output tokens
  },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING['gpt-4o-mini'];
  return (inputTokens * pricing.input) + (outputTokens * pricing.output);
}
```

### Daily Usage Summary
```typescript
interface AIUsage {
  id: string;
  workspace_id: string;
  date: string;
  total_tokens: number;
  total_cost: number;
  operations_count: number;
  created_at: string;
}
```

### Cost Optimization Tips
1. **Batch operations** - Process multiple items in one request
2. **Cache results** - Store and reuse AI outputs
3. **Use appropriate models** - GPT-4o-mini for simple tasks
4. **Limit retries** - Set max retry attempts
5. **Monitor usage** - Track daily costs

## Configuration

### Environment Variables
```env
# AI Provider
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
AI_MAX_RETRIES=3
```

### Model Selection
```typescript
const MODELS = {
  'gpt-4o-mini': {
    maxTokens: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    bestFor: ['content', 'hashtags', 'scoring'],
  },
  'gpt-4o': {
    maxTokens: 128000,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    bestFor: ['complex analysis', 'creative content'],
  },
};
```

## Error Handling

### Common Errors
```typescript
enum AIError {
  RATE_LIMIT = 'rate_limit',
  INVALID_REQUEST = 'invalid_request',
  AUTHENTICATION = 'authentication',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
}
```

### Retry Logic
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(delay * Math.pow(2, attempt - 1));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Fallback Behavior
When AI fails:
1. Use cached results if available
2. Fall back to mock provider
3. Return partial results
4. Log error for monitoring
