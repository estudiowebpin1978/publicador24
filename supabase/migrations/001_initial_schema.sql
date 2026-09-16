-- 001_initial_schema.sql
-- Migration: Initial schema for universal autonomous marketing platform
-- This migration creates all core tables for projects, campaigns, content management,
-- scheduling, analytics, strategy memory, notifications, brand profiles, and social accounts.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects: Universal business profiles
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    industry TEXT,
    location TEXT,
    target_audience TEXT,
    website_analysis JSONB,
    brand_voice JSONB,
    logo_url TEXT,
    colors JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Campaigns: Per-project campaigns
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    platforms TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    content_count INT DEFAULT 0,
    published_count INT DEFAULT 0,
    schedule_config JSONB,
    autopilot_level TEXT DEFAULT 'off' CHECK (autopilot_level IN ('off', 'review', 'full')),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Content packs: Groups of content pieces per campaign
CREATE TABLE public.content_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_pieces INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'archived')),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Content pieces: Individual content items
CREATE TABLE public.content_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    content_pack_id UUID REFERENCES public.content_packs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    hook TEXT,
    body TEXT NOT NULL,
    cta TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'story', 'reel', 'video', 'article', 'carousel', 'ad', 'email', 'thread')),
    funnel_stage TEXT DEFAULT 'awareness' CHECK (funnel_stage IN ('awareness', 'consideration', 'conversion', 'retention', 'advocacy')),
    platform TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    score FLOAT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'archived')),
    media_urls JSONB,
    external_post_id TEXT,
    scheduled_at BIGINT,
    published_at BIGINT,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    idempotency_key TEXT UNIQUE,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Scheduled posts: Publication queue
CREATE TABLE public.scheduled_posts (
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
CREATE TABLE public.analytics_daily (
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
CREATE TABLE public.strategy_memory (
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
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Brand profiles: Per-project brand configuration
CREATE TABLE public.brand_profiles (
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
CREATE TABLE public.social_accounts (
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

-- Indexes for frequently queried columns

CREATE INDEX idx_campaigns_project_id ON public.campaigns(project_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

CREATE INDEX idx_content_packs_campaign_id ON public.content_packs(campaign_id);

CREATE INDEX idx_content_pieces_campaign_id ON public.content_pieces(campaign_id);
CREATE INDEX idx_content_pieces_content_pack_id ON public.content_pieces(content_pack_id);
CREATE INDEX idx_content_pieces_platform ON public.content_pieces(platform);
CREATE INDEX idx_content_pieces_status ON public.content_pieces(status);
CREATE INDEX idx_content_pieces_scheduled_at ON public.content_pieces(scheduled_at);
CREATE INDEX idx_content_pieces_idempotency_key ON public.content_pieces(idempotency_key);

CREATE INDEX idx_scheduled_posts_campaign_id ON public.scheduled_posts(campaign_id);
CREATE INDEX idx_scheduled_posts_content_piece_id ON public.scheduled_posts(content_piece_id);
CREATE INDEX idx_scheduled_posts_platform ON public.scheduled_posts(platform);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_idempotency_key ON public.scheduled_posts(idempotency_key);

CREATE INDEX idx_analytics_daily_campaign_id ON public.analytics_daily(campaign_id);
CREATE INDEX idx_analytics_daily_platform ON public.analytics_daily(platform);
CREATE INDEX idx_analytics_daily_date ON public.analytics_daily(date);

CREATE INDEX idx_strategy_memory_campaign_id ON public.strategy_memory(campaign_id);
CREATE INDEX idx_strategy_memory_platform ON public.strategy_memory(platform);

CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_campaign_id ON public.notifications(campaign_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX idx_brand_profiles_project_id ON public.brand_profiles(project_id);

CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX idx_social_accounts_status ON public.social_accounts(status);
