import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const ALL_TABLES = [
  "projects", "campaigns", "content_packs", "content_pieces",
  "scheduled_posts", "analytics_daily", "strategy_memory",
  "notifications", "brand_profiles", "social_accounts",
];

export async function GET() {
  const supabase = getSupabaseAdmin();
  const status: Record<string, { exists: boolean; count?: number; error?: string }> = {};

  for (const table of ALL_TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        status[table] = { exists: false, error: error.message };
      } else {
        status[table] = { exists: true, count: count || 0 };
      }
    } catch (e) {
      status[table] = { exists: false, error: e instanceof Error ? e.message : "unknown" };
    }
  }

  const existingTables = Object.entries(status).filter(([, v]) => v.exists).map(([k]) => k);
  const missingTables = Object.entries(status).filter(([, v]) => !v.exists).map(([k]) => k);

  return NextResponse.json({
    tables: status,
    summary: {
      total: ALL_TABLES.length,
      existing: existingTables.length,
      missing: missingTables.length,
      missingTables,
    },
    setupRequired: missingTables.length > 0,
    setupInstructions: missingTables.length > 0
      ? "Go to Supabase Dashboard > SQL Editor and paste the contents of supabase/migrations/001_initial_schema.sql"
      : "All tables are ready",
  });
}
