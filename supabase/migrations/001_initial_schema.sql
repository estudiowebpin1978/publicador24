-- 001_initial_schema.sql
-- Migration: Initial schema for universal autonomous marketing platform
-- Execute this in Supabase Dashboard > SQL Editor
-- Safe to run multiple times (IF NOT EXISTS on all statements)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ALTER EXISTING TABLES (add missing columns)
-- ============================================

-- Projects: add new columns if missing
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS industry TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS location TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS target_audience TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS website_analysis JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_voice JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS logo_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS colors JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Campaigns: add autopilot_level if missing
DO $$ BEGIN
  ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_level VARCHAR(50) DEFAULT 'MANUAL';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Content pieces: add new columns if missing
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS media_urls JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS external_post_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS published_at BIGINT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS error_message TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.content_pieces ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- CREATE NEW TABLES
-- ============================================

-- Scheduled posts: Publication queue
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    content_piece_id UUID NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    channel_id TEXT,
    channel_name TEXT,
    scheduled_at BIGINT NOT NULL,
    published_at BIGINT,
    external_post_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
    error TEXT,
    retry_count INT DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Analytics daily: Daily metrics per platform
CREATE TABLE IF NOT EXISTS public.analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    date BIGINT NOT NULL,
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    clicks INT DEFAULT 0,
    views INT DEFAULT 0,
    watch_time INT DEFAULT 0,
    followers_gained INT DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Strategy memory: Learning per campaign
CREATE TABLE IF NOT EXISTS public.strategy_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    insight TEXT NOT NULL,
    recommendation TEXT,
    content_type TEXT,
    hook_type TEXT,
    platform TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Notifications: Real system notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Brand profiles: Per-project brand configuration
CREATE TABLE IF NOT EXISTS public.brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tone TEXT,
    values TEXT[] DEFAULT '{}',
    personality TEXT,
    writing_style TEXT,
    colors JSONB,
    fonts TEXT,
    logo_url TEXT,
    website TEXT,
    phone TEXT,
    location TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Social accounts: Connected social accounts
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    channel_id TEXT,
    channel_name TEXT,
    display_name TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at BIGINT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    connected_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_campaign_id ON public.scheduled_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_campaign_id ON public.analytics_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_platform ON public.analytics_daily(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_strategy_memory_campaign_id ON public.strategy_memory(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON public.notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_project_id ON public.brand_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
