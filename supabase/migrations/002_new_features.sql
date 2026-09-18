-- 002_new_features.sql
-- Migration: Add tables for new features
-- Execute this in Supabase Dashboard > SQL Editor

-- Landing pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    html TEXT NOT NULL,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    views INT DEFAULT 0,
    leads INT DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Auto replies
CREATE TABLE IF NOT EXISTS public.auto_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    external_comment_id TEXT,
    external_reply_id TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- WhatsApp notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('lead', 'post', 'alert', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Repurposed content
CREATE TABLE IF NOT EXISTS public.repurposed_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_content_id UUID REFERENCES public.content_pieces(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    format TEXT NOT NULL CHECK (format IN ('reels', 'carousel', 'story', 'thread')),
    content JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    platform TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- A/B tests
CREATE TABLE IF NOT EXISTS public.ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    winning_variant TEXT,
    metrics JSONB,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled')),
    started_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    completed_at BIGINT
);

-- Trending topics cache
CREATE TABLE IF NOT EXISTS public.trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    topic TEXT NOT NULL,
    category TEXT,
    volume INT DEFAULT 0,
    trend_score FLOAT DEFAULT 0,
    metadata JSONB,
    fetched_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign_id ON public.landing_pages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON public.landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_auto_replies_campaign_id ON public.auto_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_auto_replies_platform ON public.auto_replies(platform);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON public.whatsapp_notifications(status);
CREATE INDEX IF NOT EXISTS idx_repurposed_content_campaign_id ON public.repurposed_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_repurposed_content_format ON public.repurposed_content(format);
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign_id ON public.ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_trending_topics_source ON public.trending_topics(source);
CREATE INDEX IF NOT EXISTS idx_trending_topics_fetched_at ON public.trending_topics(fetched_at);
