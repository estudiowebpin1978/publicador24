import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    const results: string[] = [];

    const tables = [
      `CREATE TABLE IF NOT EXISTS public.landing_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        html TEXT NOT NULL,
        url TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        views INT DEFAULT 0,
        leads INT DEFAULT 0,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
        updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS public.auto_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
        platform TEXT NOT NULL,
        comment_text TEXT NOT NULL,
        reply_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        external_comment_id TEXT,
        external_reply_id TEXT,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at BIGINT,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS public.repurposed_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_content_id UUID REFERENCES public.content_pieces(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
        format TEXT NOT NULL,
        content JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        platform TEXT,
        created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      )`,
      `CREATE TABLE IF NOT EXISTS public.ab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
        platform TEXT NOT NULL,
        variant_a JSONB NOT NULL,
        variant_b JSONB NOT NULL,
        winning_variant TEXT,
        metrics JSONB,
        status TEXT NOT NULL DEFAULT 'running',
        started_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
        completed_at BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS public.trending_topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL,
        topic TEXT NOT NULL,
        category TEXT,
        volume INT DEFAULT 0,
        trend_score FLOAT DEFAULT 0,
        metadata JSONB,
        fetched_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      )`,
    ];

    for (const sql of tables) {
      const { error } = await supabase.rpc("exec_sql", { query: sql });
      if (error) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS public\.(\w+)/)?.[1] || "unknown";
        results.push(`${tableName}: ${error.message}`);
      } else {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS public\.(\w+)/)?.[1] || "unknown";
        results.push(`${tableName}: OK`);
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
