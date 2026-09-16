import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("strategy_memory")
      .select("*")
      .eq("metric_type", "autopilot_settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: JSON.parse(data.insight || "{}") });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("strategy_memory")
      .insert({
        campaign_id: "00000000-0000-0000-0000-000000000000",
        metric_type: "autopilot_settings",
        metric_value: 1,
        insight: JSON.stringify(body),
        recommendation: "Autopilot settings saved",
      });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
