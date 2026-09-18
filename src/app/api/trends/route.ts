import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTrendingTopics } from "@/lib/ai/trends";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    if (!force) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const { data: cached } = await supabase
        .from("trends_cache")
        .select("topics, fetched_at")
        .gte("fetched_at", oneHourAgo)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        const topics = JSON.parse(cached.topics || "[]");
        return NextResponse.json({
          topics,
          cached: true,
          fetchedAt: new Date(cached.fetched_at).toISOString(),
          count: topics.length,
        });
      }
    }

    const topics = await getTrendingTopics();

    return NextResponse.json({
      topics,
      cached: false,
      fetchedAt: new Date().toISOString(),
      count: topics.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", topics: [], count: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const topics = await getTrendingTopics();

    return NextResponse.json({
      success: true,
      topics,
      fetchedAt: new Date().toISOString(),
      count: topics.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", success: false },
      { status: 500 }
    );
  }
}
