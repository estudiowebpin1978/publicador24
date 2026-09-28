import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const ALL_TABLES = [
  "projects", "campaigns", "content_packs", "content_pieces",
  "scheduled_posts", "analytics_daily", "strategy_memory",
  "notifications", "brand_profiles", "social_accounts",
];

// Settings del usuario (perfil, workspace, voz de marca) guardados como JSON,
// igual que el resto de estado interno de la app.
const SETTINGS_KEY = "user_settings";
const USER_ID = "00000000-0000-0000-0000-000000000000";
const SECTIONS = ["profile", "workspace", "brandVoice"] as const;

type Settings = Partial<Record<(typeof SECTIONS)[number], Record<string, unknown>>>;

async function readSettings(): Promise<Settings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", SETTINGS_KEY)
      .eq("user_id", USER_ID)
      .limit(1);
    return JSON.parse(data?.[0]?.access_token || "{}") as Settings;
  } catch {
    return {};
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("social_accounts")
    .delete()
    .eq("platform", SETTINGS_KEY)
    .eq("user_id", USER_ID);
  await supabase.from("social_accounts").insert({
    platform: SETTINGS_KEY,
    user_id: USER_ID,
    channel_name: "User settings",
    access_token: JSON.stringify(settings),
    status: "active",
    connected_at: Date.now(),
    updated_at: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const section = body.section as string;

    if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) {
      return NextResponse.json(
        { error: "Sección inválida (profile | workspace | brandVoice)" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = { ...body };
    delete payload.section;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No hay datos para guardar" }, { status: 400 });
    }

    const current = await readSettings();
    current[section as (typeof SECTIONS)[number]] = {
      ...(current[section as (typeof SECTIONS)[number]] || {}),
      ...payload,
      updated_at: Date.now(),
    };
    await writeSettings(current);

    return NextResponse.json({ success: true, [section]: current[section as (typeof SECTIONS)[number]] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    );
  }
}

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

  const settings = await readSettings();

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
    profile: settings.profile || null,
    workspace: settings.workspace || null,
    brandVoice: settings.brandVoice || null,
  });
}
