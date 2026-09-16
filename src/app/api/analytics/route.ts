import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const platform = searchParams.get("platform");

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range] || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    let query = supabase
      .from("analytics_daily")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: true });

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const daily = (rows || []).map((row) => ({
      date: new Date(row.date).toISOString().split("T")[0],
      impressions: row.impressions || 0,
      reach: row.reach || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
      saves: row.saves || 0,
      clicks: row.clicks || 0,
      views: row.views || 0,
      engagement: (row.likes || 0) + (row.comments || 0) + (row.shares || 0),
    }));

    const summary = {
      totalImpressions: daily.reduce((s, d) => s + d.impressions, 0),
      totalReach: daily.reduce((s, d) => s + d.reach, 0),
      totalLikes: daily.reduce((s, d) => s + d.likes, 0),
      totalComments: daily.reduce((s, d) => s + d.comments, 0),
      totalShares: daily.reduce((s, d) => s + d.shares, 0),
      totalClicks: daily.reduce((s, d) => s + d.clicks, 0),
      totalViews: daily.reduce((s, d) => s + d.views, 0),
      followersGained: daily.reduce((s, d) => s + (0), 0),
    };

    return NextResponse.json({ summary, daily });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", summary: null, daily: [] },
      { status: 500 }
    );
  }
}
