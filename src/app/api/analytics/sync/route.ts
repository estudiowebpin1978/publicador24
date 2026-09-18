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

async function fetchChannelsWithPosts(organizationId: string) {
  const [channelsData, postsData] = await Promise.all([
    bufferGraphQL<{
      channels: {
        id: string;
        service: string;
        name: string;
      }[];
    }>(
      `{ channels(input: { organizationId: "${organizationId}" }) { id service name } }`
    ),
    bufferGraphQL<{
      posts: {
        edges: {
          node: {
            id: string;
            text: string;
            status: string;
            createdAt: string;
            sentAt?: string;
            channelId: string;
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
    }>(
      `{ posts(first: 200, input: { organizationId: "${organizationId}", filter: { status: [sent] } }) { edges { node { id text status createdAt sentAt channelId metrics { impressions reach likes comments shares clicks views } } } } }`
    ),
  ]);

  const postsByChannel = new Map<string, typeof postsData.posts.edges>();
  for (const edge of postsData.posts.edges) {
    const cid = edge.node.channelId;
    const list = postsByChannel.get(cid) || [];
    list.push(edge);
    postsByChannel.set(cid, list);
  }

  return channelsData.channels.map((ch) => ({
    id: ch.id,
    service: ch.service,
    name: ch.name,
    posts: { edges: postsByChannel.get(ch.id) || [] },
  }));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = Math.min(Math.max(daysParam, 1), 90);

    const accountRes = await bufferGraphQL<{
      account: { organizations: { id: string }[] };
    }>(`{ account { organizations { id } } }`);
    const orgId = accountRes.account.organizations[0]?.id;

    if (!orgId) {
      return NextResponse.json(
        { error: "No se encontró organización de Buffer", synced: 0, summary: null },
        { status: 400 }
      );
    }

    const channels = await fetchChannelsWithPosts(orgId);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    let synced = 0;
    let updated = 0;

    for (const channel of channels) {
      for (const edge of channel.posts.edges) {
        const post = edge.node;
        if (!post.sentAt || !post.metrics) continue;

        const sentTimestamp = new Date(post.sentAt).getTime();
        if (sentTimestamp < since) continue;

        const dateStart = new Date(
          new Date(post.sentAt).getFullYear(),
          new Date(post.sentAt).getMonth(),
          new Date(post.sentAt).getDate()
        ).getTime();

        const { data: existing } = await supabase
          .from("analytics_daily")
          .select("id")
          .eq("platform", channel.service)
          .eq("date", dateStart)
          .limit(1)
          .single();

        const row = {
          impressions: post.metrics.impressions || 0,
          reach: post.metrics.reach || 0,
          likes: post.metrics.likes || 0,
          comments: post.metrics.comments || 0,
          shares: post.metrics.shares || 0,
          clicks: post.metrics.clicks || 0,
          views: post.metrics.views || 0,
          engagement_rate:
            (post.metrics.impressions || 0) > 0
              ? (((post.metrics.likes || 0) + (post.metrics.comments || 0) + (post.metrics.shares || 0)) /
                  (post.metrics.impressions || 1)) *
                100
              : 0,
        };

        if (existing) {
          await supabase
            .from("analytics_daily")
            .update(row)
            .eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("analytics_daily").insert({
            campaign_id: "00000000-0000-0000-0000-000000000000",
            platform: channel.service,
            date: dateStart,
            ...row,
            created_at: Date.now(),
          });
          synced++;
        }
      }
    }

    const { data: recent, error: recentErr } = await supabase
      .from("analytics_daily")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: true });

    const isMissingTable = recentErr?.message?.includes("does not exist") || recentErr?.message?.includes("relation");
    const rows = isMissingTable ? [] : recent || [];

    const daily = rows.map((row) => ({
      date: new Date(row.date).toISOString().split("T")[0],
      platform: row.platform,
      impressions: row.impressions || 0,
      reach: row.reach || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      shares: row.shares || 0,
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

    return NextResponse.json({
      synced,
      updated,
      channelsProcessed: channels.length,
      summary,
      daily,
      count: daily.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", synced: 0, summary: null },
      { status: 500 }
    );
  }
}
