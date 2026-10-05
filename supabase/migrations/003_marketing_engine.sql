-- =====================================================================
-- MIGRACIÓN 003: QUINIELA IA MARKETING ENGINE
-- 5 tablas nuevas para: Fingerprints, Biblioteca, Campañas, Calendario, Analytics
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1. content_fingerprints — Anti-repetición (Módulo 3)
-- Huella creativa única por pieza para evitar duplicados visuales/conceptuales
CREATE TABLE IF NOT EXISTS public.content_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    hook TEXT NOT NULL,
    idea TEXT NOT NULL,
    category TEXT NOT NULL,
    persona JSONB NOT NULL DEFAULT '{}',
    location TEXT,
    action TEXT,
    framing TEXT,
    lighting TEXT,
    cta TEXT,
    hashtags TEXT[],
    combined_hash TEXT NOT NULL UNIQUE,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_content_fingerprints_campaign ON public.content_fingerprints(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_fingerprints_hash ON public.content_fingerprints(combined_hash);

-- 2. content_library — Biblioteca unificada (Módulo 26)
-- Extiende content_pieces con metadatos de marketing: fingerprint, quality_score, métricas
CREATE TABLE IF NOT EXISTS public.content_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piece_id UUID NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
    fingerprint_id UUID REFERENCES public.content_fingerprints(id) ON DELETE SET NULL,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    quality_score INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    published_at BIGINT,
    metrics_json JSONB DEFAULT '{}',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_content_library_piece ON public.content_library(piece_id);
CREATE INDEX IF NOT EXISTS idx_content_library_campaign ON public.content_library(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_library_status ON public.content_library(status);

-- 3. marketing_campaigns — Campañas temáticas (Módulo 27)
-- Campañas de marketing independientes de las campañas de contenido
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    platforms TEXT[] NOT NULL DEFAULT '{}',
    content_mix_json JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    target_audience TEXT,
    brand_voice JSONB,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);

-- 4. content_calendar — Calendario editorial (Módulo 14)
-- Planificación de slots por fecha, campaña y tipo de contenido
CREATE TABLE IF NOT EXISTS public.content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    marketing_campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    slot_type TEXT NOT NULL,
    hook TEXT,
    piece_id UUID REFERENCES public.content_pieces(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    platform TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_campaign_date ON public.content_calendar(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_piece ON public.content_calendar(piece_id);

-- 5. analytics_content — Métricas por pieza (Módulo 16)
-- Métricas de rendimiento por plataforma y pieza para aprendizaje (Módulo 17)
CREATE TABLE IF NOT EXISTS public.analytics_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piece_id UUID NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    saves BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0,
    retention FLOAT DEFAULT 0,
    ctr FLOAT DEFAULT 0,
    collected_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_analytics_content_piece ON public.analytics_content(piece_id);
CREATE INDEX IF NOT EXISTS idx_analytics_content_platform_date ON public.analytics_content(platform, collected_at);

-- =====================================================================
-- POLÍTICAS RLS (Row Level Security) — opcional, activar si se usa auth
-- =====================================================================
-- ALTER TABLE public.content_fingerprints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.analytics_content ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all for service role" ON public.content_fingerprints FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON public.content_library FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON public.marketing_campaigns FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON public.content_calendar FOR ALL USING (true);
-- CREATE POLICY "Allow all for service role" ON public.analytics_content FOR ALL USING (true);