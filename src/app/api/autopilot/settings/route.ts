import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const SETTINGS_PLATFORM = "autopilot_settings"
const SETTINGS_USER = "00000000-0000-0000-0000-000000000000"

const DEFAULT_SETTINGS = {
  level: "auto",
  platformFrequencies: { instagram: "daily", x: "daily", facebook: "daily", linkedin: "daily", tiktok: "daily" },
  topics: "",
  contentPillars: "",
  topicsToAvoid: "",
  timeZone: "America/Argentina/Buenos_Aires",
  preferredTimeSlots: "optimal",
  excludedDays: [] as string[],
  contentGuidelines: "",
  approvalRequirements: "review",
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("social_accounts")
      .select("access_token")
      .eq("platform", SETTINGS_PLATFORM)
      .eq("user_id", SETTINGS_USER)
      .order("updated_at", { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const parsed = JSON.parse(data[0].access_token || "{}")
    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...parsed } })
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    const settingsToSave = { ...body, level: "auto" }
    const jsonStr = JSON.stringify(settingsToSave)
    const now = Date.now()

    // Delete existing entry first, then insert
    await supabase
      .from("social_accounts")
      .delete()
      .eq("user_id", SETTINGS_USER)
      .eq("platform", SETTINGS_PLATFORM)

    const { error } = await supabase
      .from("social_accounts")
      .insert({
        user_id: SETTINGS_USER,
        platform: SETTINGS_PLATFORM,
        channel_name: "Autopilot Settings",
        channel_id: null,
        display_name: null,
        access_token: jsonStr,
        refresh_token: "",
        expires_at: null,
        status: "active",
        connected_at: now,
        updated_at: now,
      })

    if (error) {
      console.error("Settings save error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: settingsToSave })
  } catch (e) {
    console.error("Settings save exception:", e)
    return NextResponse.json({ success: false, error: "Exception saving settings" }, { status: 500 })
  }
}
