# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │Dashboard│  │Content  │  │Calendar │  │Analytics│           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                     │
│                    Next.js App Router                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                       API Layer                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Auth    │ │ Content  │ │ Publish  │ │ Scheduler│          │
│  │  Route   │ │  Routes  │ │  Route   │ │  Route   │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Analytics │ │  Cron    │ │ Webhooks │ │  Health  │          │
│  │  Routes  │ │  Route   │ │  Route   │ │  Route   │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┴─────────────┴────────────┴─────────────┴────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   Business Logic Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Core Services                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │AI Engine │ │Scheduler │ │Analytics │ │Hashtags  │   │  │
│  │  │          │ │  Engine  │ │  Engine  │ │ Engine   │   │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │  │
│  └───────┴─────────────┴────────────┴─────────────┴─────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Social Adapters                           │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │  │
│  │  │TikTok  │ │Instagram│ │Facebook│ │   X    │           │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘           │  │
│  │  ┌────────┐ ┌────────┐                                  │  │
│  │  │YouTube │ │LinkedIn│                                  │  │
│  │  └────────┘ └────────┘                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Security Layer                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │  Token   │ │   Rate   │ │  Spam    │ │Validation│   │  │
│  │  │Encryption│ │  Limit   │ │Detection │ │          │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Supabase                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │PostgreSQL│ │   Auth   │ │   RLS    │ │ Realtime │   │  │
│  │  │ Database │ │  Service │ │ Policies │ │          │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

### 1. AI Module (`src/lib/ai/`)

```
ai/
├── provider.ts          # Provider factory (OpenAI or Mock)
├── openai-provider.ts   # OpenAI GPT-4o-mini implementation
├── mock-provider.ts     # Mock AI for development
├── types.ts             # AI interface definitions
└── prompts/
    ├── content.ts       # Content generation prompts
    ├── hashtags.ts      # Hashtag generation prompts
    ├── optimization.ts  # Content optimization prompts
    ├── safety.ts        # Spam/safety detection prompts
    └── trends.ts        # Trend analysis prompts
```

**Provider Pattern:**
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

### 2. Social Module (`src/lib/social/`)

```
social/
├── adapter-factory.ts    # Adapter factory with mock mode
├── mock-adapter.ts       # Mock adapter for all platforms
├── types.ts              # Adapter interface definitions
├── tiktok/
│   └── adapter.ts        # TikTok Content Posting API
├── instagram/
│   └── adapter.ts        # Instagram Graph API
├── facebook/
│   └── adapter.ts        # Facebook Pages API
├── x/
│   └── adapter.ts        # X/Twitter API v2
├── youtube/
│   └── adapter.ts        # YouTube Data API v3
└── linkedin/
    └── adapter.ts        # LinkedIn Marketing API
```

**Adapter Pattern:**
```typescript
interface SocialPlatformAdapter {
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
```

### 3. Scheduler Module (`src/lib/scheduler/`)

```
scheduler/
├── scheduler.ts       # Core scheduling logic
├── publish-queue.ts   # Queue management
├── publisher.ts       # Publishing execution
├── best-time.ts       # Optimal posting times
├── jobs.ts            # Background job runner
└── index.ts           # Module exports
```

### 4. Analytics Module (`src/lib/analytics/`)

```
analytics/
├── engine.ts          # Data collection & aggregation
├── optimizer.ts       # Performance optimization
└── index.ts           # Module exports
```

### 5. Security Module (`src/lib/security/`)

```
security/
├── tokens.ts          # AES-256-GCM token encryption
├── rate-limit.ts      # Per-platform rate limiting
├── spam-safety.ts     # Content spam detection
└── validation.ts      # Input validation
```

## Data Flow

### 1. Content Creation Flow

```
User Input → AI Generation → Content Scoring → Platform Adaptation → Review → Schedule
     │            │              │                    │               │         │
     ▼            ▼              ▼                    ▼               ▼         ▼
  Form Data   OpenAI API    Score Engine      Platform Adapters   UI Review  Queue
     │            │              │                    │               │         │
     └────────────┴──────────────┴────────────────────┴───────────────┴─────────┘
                                    │
                              Content Table
```

### 2. Publishing Flow

```
Scheduled Post → Lock → Validate → Upload Media → Publish → Record → Unlock
      │           │        │            │            │         │        │
      ▼           ▼        ▼            ▼            ▼         ▼        ▼
   Queue DB   Advisory  Platform   Platform API  Platform   Published  Release
              Lock      Limits                    Response   Posts DB   Lock
```

### 3. Analytics Collection Flow

```
Cron Job → Fetch Accounts → Get Analytics → Normalize → Store → Aggregate
    │            │               │              │          │         │
    ▼            ▼               ▼              ▼          ▼         ▼
  /api/cron   Social DB    Platform API   Metrics    analytics_   Summary
                                           Format    daily table   API
```

## Social Adapter Pattern

### Factory Pattern
```typescript
// src/lib/social/adapter-factory.ts
export function getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  if (isMockMode()) {
    return createMockAdapter(platform);
  }
  return createRealAdapter(platform);
}
```

### Adapter Inheritance
```
SocialPlatformAdapter (Interface)
         │
         ▼
MockSocialAdapter (Base Implementation)
         │
    ┌────┴────┬────────┬────────┬────────┬────────┐
    ▼         ▼        ▼        ▼        ▼        ▼
 TikTok   Instagram Facebook   X    YouTube  LinkedIn
 Adapter   Adapter   Adapter Adapter Adapter  Adapter
```

### Platform Limits
Each adapter defines its platform-specific limits:
```typescript
getLimits(): PlatformLimits {
  return {
    max_caption_length: 280,      // X: 280, Instagram: 2200, etc.
    max_hashtags: 10,             // Varies by platform
    max_mentions: 10,
    max_media: 4,                 // X: 4, Instagram: 10, etc.
    supported_media_types: ['image', 'video'],
    max_video_duration: 140,      // seconds
    max_video_size: 536870912,    // bytes
    max_image_size: 5242880,      // bytes
  };
}
```

## AI Provider Pattern

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

### Content Scoring Breakdown
```typescript
interface AIScoreBreakdown {
  hook: number;        // Opening line effectiveness (0-100)
  relevance: number;   // Topic relevance (0-100)
  clarity: number;     // Message clarity (0-100)
  emotion: number;     // Emotional impact (0-100)
  trend: number;       // Trend alignment (0-100)
  hashtags: number;    // Hashtag quality (0-100)
  platform_fit: number; // Platform optimization (0-100)
  cta: number;         // Call-to-action strength (0-100)
  spam_risk: number;   // Spam detection (0-100, lower is better)
  overall: number;     // Weighted average (0-100)
}
```

## Scheduler System

### Job Processing
```
┌─────────────────────────────────────────────────────────┐
│                    Scheduler Loop                        │
│                                                         │
│  1. Requeue Retry Posts                                 │
│     └─ Find posts with status=RETRY and next_attempt_at │
│                                                         │
│  2. Process Queue                                       │
│     ├─ Fetch locked posts (status=QUEUED, scheduled_at) │
│     ├─ Acquire advisory lock                            │
│     ├─ Execute publish via adapter                      │
│     ├─ Update status (PUBLISHED/FAILED)                 │
│     └─ Release lock                                     │
│                                                         │
│  3. Run Background Jobs                                 │
│     ├─ Token refresh                                    │
│     ├─ Analytics collection                             │
│     └─ Trend updates                                    │
└─────────────────────────────────────────────────────────┘
```

### Retry Logic
```
Attempt 1 → Failed → Wait 60s → Attempt 2 → Failed → Wait 120s → Attempt 3 → Failed → Max Attempts
     │                    │                    │                    │
     └────────────────────┴────────────────────┴────────────────────┘
                              Exponential Backoff
```

## Queue System

### Queue States
```
QUEUED → PROCESSING → PUBLISHED
   │         │
   │         └─→ FAILED → RETRY → QUEUED (with delay)
   │
   └─→ CANCELLED
```

### Idempotency
Each queued item has a unique idempotency key:
```typescript
idempotency_key = `${workspace_id}:${social_account_id}:${content_id}:${variant_id}`
```

This prevents duplicate publishing if the same content is queued multiple times.

## Security Model

### Token Encryption
```
Plaintext Token → AES-256-GCM Encryption → Encrypted Token
                         │
                    IV (16 bytes)
                    Auth Tag (16 bytes)
                    Ciphertext
```

Storage format: `iv:authTag:ciphertext` (base64 encoded)

### Row Level Security (RLS)
```
┌─────────────────────────────────────────────────────────┐
│                    RLS Policy Layers                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Users Table                                            │
│  ├─ Users can view own profile                          │
│  └─ Users can update own profile                        │
│                                                         │
│  Workspaces Table                                       │
│  ├─ Members can view workspace                          │
│  └─ Owners can manage workspace                         │
│                                                         │
│  Social Accounts Table                                  │
│  ├─ Members can view social accounts                    │
│  └─ Editors can manage social accounts                  │
│                                                         │
│  Content Table                                          │
│  ├─ Members can view content                            │
│  └─ Editors can manage content                          │
│                                                         │
│  Tokens Table                                           │
│  └─ Service role only (no direct user access)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Role Hierarchy
```
OWNER → ADMIN → EDITOR → ANALYST → VIEWER
  │       │       │         │         │
  │       │       │         │         └─ Read only
  │       │       │         └─ Read + Analytics
  │       │       └─ Read + Write + Publish
  │       └─ Read + Write + Publish + Manage Members
  └─ Full Control + Billing
```

## API Design

### RESTful Endpoints
```
POST   /api/auth/callback/[platform]  # OAuth callbacks
GET    /api/content                   # List content
POST   /api/content                   # Create content
POST   /api/content/generate          # AI generation
POST   /api/content/dry-run           # Validation
POST   /api/publish                   # Publish/schedule
GET    /api/scheduler                 # Get scheduled posts
POST   /api/scheduler/reschedule      # Reschedule post
POST   /api/scheduler/cancel          # Cancel scheduled
GET    /api/analytics                 # Get analytics
POST   /api/webhooks/[platform]       # Platform webhooks
GET    /api/cron                      # Scheduled jobs
GET    /api/health                    # Health check
```

### Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
```

## Error Handling

### Error Categories
```
┌─────────────────────────────────────────────────────────┐
│                    Error Categories                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Validation Errors (400)                                │
│  ├─ Invalid input format                                │
│  ├─ Missing required fields                             │
│  └─ Business rule violations                            │
│                                                         │
│  Authentication Errors (401/403)                        │
│  ├─ Invalid/expired tokens                              │
│  ├─ Insufficient permissions                            │
│  └─ Account not connected                               │
│                                                         │
│  Platform Errors (422/429)                              │
│  ├─ Token expired/requires reauth                       │
│  ├─ Rate limit exceeded                                 │
│  ├─ Content rejected by platform                        │
│  └─ API unavailable                                     │
│                                                         │
│  System Errors (500)                                    │
│  ├─ Database errors                                     │
│  ├─ AI provider errors                                  │
│  └─ Internal server errors                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Monitoring

### Structured Logging
```typescript
logger.info('event_name', 'Human readable message', {
  key: 'value',
  metrics: { duration_ms: 123 }
});
```

### Health Check
```typescript
GET /api/health
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```
