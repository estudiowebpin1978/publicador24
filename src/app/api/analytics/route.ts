import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const BUFFER_API_URL = "https://api.buffer.com";

async function bufferGraphQL<T>(query: string): Promise<T> {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER_API_KEY not configured");

  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Buffer API error");
  }
  return json.data;
}

async function fetchBufferAnalytics(organizationId: string) {
  const data = await bufferGraphQL<{
    channels: {
      id: string;
      service: string;
      name: string;
      posts: {
        edges: {
          node: {
            id: string;
            text: string;
            status: string;
            createdAt: string;
            sentAt?: string;
            metrics?: {
              impressions?: number;
              reach?: number;
              likes?: number;
              comments?: number;
              shares?: number;
              clicks?: number;
              views?: number;
            };
          };
        }[];
      };
    }[];
  }>(
    `{ channels(input: { organizationId: "${organizationId}" }) {
      id service name
      posts(first: 50, status: "sent") {
        edges { node {
          id text status createdAt sentAt
          metrics { impressions reach likes comments shares clicks views }
        } }
      }
    } }`
  );

  return data.channels;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const platform = searchParams.get("platform");
    const sync = searchParams.get("sync") === "true";

    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[range] || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    // If sync requested, fetch from Buffer and store
    if (sync) {
      try {
        const accountRes = await bufferGraphQL<{
          account: { organizations: { id: string }[] };
        }>(`{ account { organizations { id } } }`);
        const orgId = accountRes.account.organizations[0]?.id;
        if (orgId) {
          const channels = await fetchBufferAnalytics(orgId);
          let synced = 0;

          for (const channel of channels) {
            for (const edge of channel.posts.edges) {
              const post = edge.node;
              if (!post.sentAt || !post.metrics) continue;

              const sentDate = new Date(post.sentAt);
              const dateStart = new Date(sentDate.getFullYear(), sentDate.getMonth(), sentDate.getDate()).getTime();

              // Check if exists
              const { data: existing } = await supabase
                .from("analytics_daily")
                .select("id")
                .eq("platform", channel.service)
                .eq("date", dateStart)
                .limit(1)
                .single();

              if (existing) {
                // Update
                await supabase.from("analytics_daily").update({
                  impressions: post.metrics.impressions || 0,
                  reach: post.metrics.reach || 0,
                  likes: post.metrics.likes || 0,
                  comments: post.metrics.comments || 0,
                  shares: post.metrics.shares || 0,
                  clicks: post.metrics.clicks || 0,
                  views: post.metrics.views || 0,
                }).eq("id", existing.id);
              } else {
                // Insert
                await supabase.from("analytics_daily").insert({
                  campaign_id: "00000000-0000-0000-0000-000000000000",
                  platform: channel.service,
                  date: dateStart,
                  impressions: post.metrics.impressions || 0,
                  reach: post.metrics.reach || 0,
                  likes: post.metrics.likes || 0,
                  comments: post.metrics.comments || 0,
                  shares: post.metrics.shares || 0,
                  clicks: post.metrics.clicks || 0,
                  views: post.metrics.views || 0,
                  engagement_rate: 0,
                  created_at: Date.now(),
                });
              }
              synced++;
            }
          }
        }
      } catch (e) {
        // Sync failed, continue with existing data
      }
    }

    // Query local data
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
      platform: row.platform,
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
      totalEngagement: daily.reduce((s, d) => s + d.engagement, 0),
    };

    return NextResponse.json({ summary, daily, count: daily.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", summary: null, daily: [] },
      { status: 500 }
    );
  }
}
