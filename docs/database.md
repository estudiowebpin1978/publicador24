# Database Schema Documentation

Complete reference for the Supabase PostgreSQL schema.

## Overview

The database uses PostgreSQL with Row Level Security (RLS) enabled on all tables. The schema is designed for multi-tenant workspace isolation.

```
┌─────────────────────────────────────────────────────────┐
│                    Database Tables                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Core Tables:                                           │
│  ├─ users                    # User profiles            │
│  ├─ workspaces               # Multi-tenant workspaces  │
│  └─ workspace_members        # Team membership          │
│                                                         │
│  Social Tables:                                         │
│  ├─ social_accounts          # Connected platforms      │
│  └─ social_account_tokens    # Encrypted OAuth tokens   │
│                                                         │
│  Content Tables:                                        │
│  ├─ content                  # Content items            │
│  ├─ content_variants         # A/B test variants        │
│  └─ content_platform_variants # Platform adaptations     │
│                                                         │
│  Publishing Tables:                                     │
│  ├─ scheduled_posts          # Post queue               │
│  ├─ published_posts          # Published post records   │
│  └─ publish_attempts         # Attempt history          │
│                                                         │
│  Intelligence Tables:                                   │
│  ├─ hashtags                 # Hashtag database         │
│  ├─ trends                   # Trend tracking           │
│  └─ mentions                 # User mentions            │
│                                                         │
│  Analytics Tables:                                      │
│  ├─ analytics_daily          # Daily account metrics    │
│  └─ analytics_posts          # Per-post metrics         │
│                                                         │
│  Campaign Tables:                                       │
│  ├─ campaigns                # Campaign organization    │
│  └─ content_experiments      # A/B test experiments     │
│                                                         │
│  System Tables:                                         │
│  ├─ ai_generations           # AI usage tracking        │
│  ├─ ai_usage                 # Daily AI cost summary    │
│  ├─ jobs                     # Background job queue     │
│  ├─ rate_limits              # API rate limiting        │
│  ├─ notifications            # User notifications       │
│  └─ audit_logs               # Action audit trail       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Core Tables

### users
Extends Supabase `auth.users` with additional profile data.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workspaces
Multi-tenant container for all data.

```sql
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  plan plan_tier DEFAULT 'FREE',
  brand_voice JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB Fields:**
- `brand_voice`: Brand voice configuration (tone, CTA, forbidden words)
- `settings`: Workspace settings (timezone, posting frequency, hashtag strategy)

### workspace_members
Team membership with role-based access.

```sql
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role workspace_role DEFAULT 'VIEWER',
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
```

## Social Tables

### social_accounts
Connected social platform accounts.

```sql
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status account_status DEFAULT 'DISCONNECTED',
  permissions JSONB DEFAULT '[]',
  missing_permissions JSONB DEFAULT '[]',
  connected_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, platform, platform_user_id)
);
```

### social_account_tokens
Encrypted OAuth tokens (service role only).

```sql
CREATE TABLE public.social_account_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scopes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Security:** Tokens are encrypted with AES-256-GCM before storage.

## Content Tables

### content
Main content items.

```sql
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type DEFAULT 'text',
  status content_status DEFAULT 'DRAFT',
  language TEXT DEFAULT 'es',
  target_platforms JSONB DEFAULT '[]',
  media_ids JSONB DEFAULT '[]',
  ai_score NUMERIC,
  ai_score_breakdown JSONB,
  spam_risk_score INTEGER DEFAULT 0,
  content_fingerprint TEXT,
  version INTEGER DEFAULT 1,
  parent_content_id UUID,
  brand_voice JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

**Status Flow:**
```
DRAFT → AI_REVIEW → USER_REVIEW → APPROVED → SCHEDULED → PUBLISHED
  │         │            │            │            │
  └─────────┴────────────┴────────────┴────────────┘
                         ↓
                     REJECTED
```

### content_variants
A/B test variants for content.

```sql
CREATE TABLE public.content_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  hook TEXT,
  caption TEXT,
  hashtags JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  cta TEXT,
  ai_score NUMERIC,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### content_platform_variants
Platform-specific content adaptations.

```sql
CREATE TABLE public.content_platform_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  hook TEXT,
  caption TEXT NOT NULL,
  hashtags JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  cta TEXT,
  adapted_for_platform BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, platform)
);
```

## Publishing Tables

### scheduled_posts
Post queue with retry logic.

```sql
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_variant_id UUID,
  variant_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status publish_status DEFAULT 'QUEUED',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_post_url TEXT,
  error_message TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status Flow:**
```
QUEUED → PROCESSING → PUBLISHED
   │         │
   │         └─→ FAILED → RETRY → QUEUED (with delay)
   │
   └─→ CANCELLED
```

### published_posts
Record of successfully published posts.

```sql
CREATE TABLE public.published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_post_id TEXT NOT NULL,
  platform_post_url TEXT,
  caption TEXT,
  hashtags JSONB DEFAULT '[]',
  media_urls JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ NOT NULL,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### publish_attempts
History of publish attempts.

```sql
CREATE TABLE public.publish_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status publish_status NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Intelligence Tables

### hashtags
Hashtag database with scoring.

```sql
CREATE TABLE public.hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag TEXT NOT NULL,
  category TEXT,
  language TEXT DEFAULT 'es',
  country TEXT,
  platform social_platform,
  popularity_score NUMERIC,
  competition_score NUMERIC,
  relevance_score NUMERIC,
  trend_score NUMERIC,
  final_score NUMERIC,
  is_estimated BOOLEAN DEFAULT TRUE,
  data_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tag, language, country, platform)
);
```

### trends
Trending topics and keywords.

```sql
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  category TEXT,
  platform social_platform,
  country TEXT,
  language TEXT DEFAULT 'es',
  direction trend_direction DEFAULT 'STABLE',
  trend_score NUMERIC DEFAULT 0,
  volume INTEGER,
  growth_rate NUMERIC,
  related_hashtags JSONB DEFAULT '[]',
  related_entities JSONB DEFAULT '[]',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### mentions
User mentions in content.

```sql
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  platform social_platform NOT NULL,
  category TEXT,
  relevance_score NUMERIC DEFAULT 0,
  follower_count INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Analytics Tables

### analytics_daily
Daily aggregated metrics per account.

```sql
CREATE TABLE public.analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  date DATE NOT NULL,
  followers INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  top_post_id UUID,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, social_account_id, date)
);
```

### analytics_posts
Per-post analytics.

```sql
CREATE TABLE public.analytics_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  published_post_id UUID NOT NULL REFERENCES public.published_posts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Campaign Tables

### campaigns
Campaign organization.

```sql
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  target_audience TEXT,
  platforms JSONB DEFAULT '[]',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  status TEXT DEFAULT 'DRAFT',
  content_count INTEGER DEFAULT 0,
  published_count INTEGER DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### content_experiments
A/B test experiments.

```sql
CREATE TABLE public.content_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  winner_variant_id UUID,
  winner_score NUMERIC,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### experiment_variants
Experiment variant metrics.

```sql
CREATE TABLE public.experiment_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES public.content_experiments(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL,
  content_variant_id UUID NOT NULL REFERENCES public.content_variants(id) ON DELETE CASCADE,
  published_post_id UUID REFERENCES public.published_posts(id),
  metrics JSONB DEFAULT '{}',
  winner_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## System Tables

### ai_generations
AI generation tracking.

```sql
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_id UUID,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_usage
Daily AI usage summary.

```sql
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  operations_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, date)
);
```

### jobs
Background job queue.

```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  job_key TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'PENDING',
  payload JSONB,
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_run_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rate_limits
API rate limiting.

```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  endpoint TEXT NOT NULL,
  state rate_limit_state DEFAULT 'AVAILABLE',
  remaining INTEGER DEFAULT 100,
  limit INTEGER DEFAULT 100,
  reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(social_account_id, endpoint)
);
```

### notifications
User notifications.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_logs
Action audit trail.

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  platform social_platform,
  content_id UUID,
  post_id UUID,
  result TEXT NOT NULL,
  error TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Relationships

```
users
  ├─< workspaces (owner_id)
  ├─< workspace_members (user_id)
  └─< notifications (user_id)

workspaces
  ├─< workspace_members
  ├─< social_accounts
  ├─< content
  ├─< media
  ├─< scheduled_posts
  ├─< analytics_daily
  ├─< campaigns
  ├─< content_experiments
  ├─< ai_generations
  ├─< ai_usage
  ├─< notifications
  └─< audit_logs

social_accounts
  ├─< social_account_tokens
  ├─< scheduled_posts
  ├─< published_posts
  └─< rate_limits

content
  ├─< content_variants
  ├─< content_platform_variants
  ├─< scheduled_posts
  ├─< mentions
  └─< content_experiments

scheduled_posts
  ├─< published_posts
  └─< publish_attempts

published_posts
  ├─< analytics_posts
  └─< experiment_variants
```

## Row Level Security (RLS) Policies

### Policy Summary

| Table | SELECT Policy | INSERT/UPDATE/DELETE Policy |
|-------|--------------|---------------------------|
| users | Own profile only | Own profile only |
| workspaces | Workspace members | Owner only |
| workspace_members | Workspace members | Admins+ |
| social_accounts | Workspace members | Editors+ |
| social_account_tokens | Service role only | Service role only |
| media | Workspace members | Editors+ |
| content | Workspace members | Editors+ |
| content_variants | Workspace members | Editors+ |
| content_platform_variants | Workspace members | Editors+ |
| scheduled_posts | Workspace members | Editors+ |
| published_posts | Workspace members | Service role only |
| publish_attempts | Workspace members | Service role only |
| hashtags | Public | Service role only |
| trends | Public | Service role only |
| mentions | Workspace members | Editors+ |
| analytics_daily | Workspace members | Service role only |
| analytics_posts | Workspace members | Service role only |
| content_experiments | Workspace members | Editors+ |
| experiment_variants | Workspace members | Editors+ |
| ai_generations | Workspace members | Service role only |
| ai_usage | Workspace members | Service role only |
| campaigns | Workspace members | Editors+ |
| jobs | Service role only | Service role only |
| rate_limits | Service role only | Service role only |
| notifications | Own notifications | Service role (INSERT) |
| audit_logs | Service role only | Service role only |

### Role Hierarchy
```
OWNER > ADMIN > EDITOR > ANALYST > VIEWER
```

## Indexes

Key indexes for performance:

```sql
-- Workspace queries
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- Social accounts
CREATE INDEX idx_social_accounts_workspace ON public.social_accounts(workspace_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);

-- Content
CREATE INDEX idx_content_workspace ON public.content(workspace_id);
CREATE INDEX idx_content_status ON public.content(status);

-- Scheduling
CREATE INDEX idx_scheduled_posts_workspace ON public.scheduled_posts(workspace_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_idempotency ON public.scheduled_posts(idempotency_key);

-- Analytics
CREATE INDEX idx_analytics_daily_workspace ON public.analytics_daily(workspace_id);
CREATE INDEX idx_analytics_daily_date ON public.analytics_daily(date);

-- Jobs
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_next_run ON public.jobs(next_run_at);
```

## Common Queries

### Get Scheduled Posts
```sql
SELECT sp.*, sa.username, sa.platform
FROM scheduled_posts sp
JOIN social_accounts sa ON sa.id = sp.social_account_id
WHERE sp.workspace_id = :workspace_id
  AND sp.status IN ('QUEUED', 'PROCESSING')
  AND sp.scheduled_at <= NOW()
ORDER BY sp.scheduled_at
LIMIT 10;
```

### Get Analytics Summary
```sql
SELECT 
  platform,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  SUM(engagement) as total_engagement,
  AVG(engagement_rate) as avg_engagement_rate
FROM analytics_daily
WHERE workspace_id = :workspace_id
  AND date BETWEEN :start_date AND :end_date
GROUP BY platform;
```

### Get Content with Variants
```sql
SELECT 
  c.*,
  json_agg(DISTINCT cv.*) as variants,
  json_agg(DISTINCT cpv.*) as platform_variants
FROM content c
LEFT JOIN content_variants cv ON cv.content_id = c.id
LEFT JOIN content_platform_variants cpv ON cpv.content_id = c.id
WHERE c.workspace_id = :workspace_id
GROUP BY c.id;
```
