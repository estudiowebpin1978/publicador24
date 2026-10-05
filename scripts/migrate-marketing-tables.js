#!/usr/bin/env node
/**
 * Migración idempotente: crea 5 tablas para Quiniela IA Marketing Engine
 * Ejecuta: node scripts/migrate-marketing-tables.js
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env.local o .env.vercel
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar env
function loadEnv() {
  const envFiles = ['.env.local', '.env.vercel', '.env'];
  for (const f of envFiles) {
    const path = join(process.cwd(), f);
    try {
      const content = readFileSync(path, 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
        }
      }
    } catch {}
  }
}
loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const statements = [
  // 1. content_fingerprints — anti-repetición (Módulo 3)
  `CREATE TABLE IF NOT EXISTS public.content_fingerprints (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_fingerprints_campaign ON public.content_fingerprints(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_content_fingerprints_hash ON public.content_fingerprints(combined_hash)`,

  // 2. content_library — biblioteca unificada (Módulo 26)
  `CREATE TABLE IF NOT EXISTS public.content_library (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_library_piece ON public.content_library(piece_id)`,
  `CREATE INDEX IF NOT EXISTS idx_content_library_campaign ON public.content_library(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_content_library_status ON public.content_library(status)`,

  // 3. marketing_campaigns — campañas temáticas (Módulo 27)
  `CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status)`,

  // 4. content_calendar — calendario editorial (Módulo 14)
  `CREATE TABLE IF NOT EXISTS public.content_calendar (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_calendar_campaign_date ON public.content_calendar(campaign_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_content_calendar_piece ON public.content_calendar(piece_id)`,

  // 5. analytics_content — métricas por pieza (Módulo 16)
  `CREATE TABLE IF NOT EXISTS public.analytics_content (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_content_piece ON public.analytics_content(piece_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_content_platform_date ON public.analytics_content(platform, collected_at)`,
];

async function run() {
  console.log('🚀 Iniciando migración de 5 tablas Marketing Engine...\n');
  let ok = 0, fail = 0;

  for (const sql of statements) {
    const tableMatch = sql.match(/CREATE (?:TABLE|INDEX) IF NOT EXISTS public\.(\w+)/);
    const name = tableMatch ? tableMatch[1] : 'unknown';
    try {
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      if (error) {
        // Fallback: intenta ejecutar como raw SQL vía PostgREST (no soporta DDL directo)
        // En su lugar, reporta para ejecutar manualmente en Supabase Dashboard
        console.log(`⚠️  ${name}: RPC exec_sql no disponible (${error.message})`);
        console.log(`   → Ejecuta manualmente en Supabase Dashboard > SQL Editor:\n   ${sql};\n`);
        fail++;
      } else {
        console.log(`✅ ${name}: OK`);
        ok++;
      }
    } catch (e) {
      console.log(`⚠️  ${name}: ${e.message}`);
      console.log(`   → Ejecuta manualmente en Supabase Dashboard > SQL Editor:\n   ${sql};\n`);
      fail++;
    }
  }

  console.log(`\n📊 Resumen: ${ok} OK, ${fail} requieren ejecución manual`);
  if (fail > 0) {
    console.log('\n💡 Copia los bloques SQL de arriba y pégalos en:');
    console.log('   https://supabase.com/dashboard/project/<tu-proyecto>/sql/new');
  }
  process.exit(fail > 0 ? 1 : 0);
}

run();