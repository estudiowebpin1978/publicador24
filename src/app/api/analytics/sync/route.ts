import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getBufferAccount, getBufferChannels } from "@/lib/buffer/client";

async function bufferGraphQL<T>(query: string): Promise<T> {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER_API_KEY not configured");

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Buffer API error");
  }
  return json.data;
}

async function fetchChannelsWithPosts(organizationId: string) {
  const channels = await getBufferChannels(organizationId);
  const postsData = await bufferGraphQL<{
    posts: {
      edges: {
        node: {
          id: string;
          text: string;
          status: string;
          createdAt: string;
          sentAt?: string;
          channelId: string;
        };
      }[];
    };
  }>(
    `{ posts(first: 100, input: { organizationId: "${organizationId}", filter: { status: [sent] } }) { edges { node { id text status createdAt sentAt channelId } } } }`
  );

  const postsByChannel = new Map<string, typeof postsData.posts.edges>();
  for (const edge of postsData.posts.edges) {
    const cid = edge.node.channelId;
    const list = postsByChannel.get(cid) || [];
    list.push(edge);
    postsByChannel.set(cid, list);
  }

  return channels.map((ch) => ({
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

    const accountRes = await getBufferAccount();
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
        if (!post.sentAt) continue;

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
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          views: 0,
          engagement_rate: 0,
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
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Un rate limit de Buffer no es un error del servidor: responde 200 para
    // que el dashboard pueda seguir mostrando los datos que ya tenía.
    const isRate = /rate limited|too many requests|\b429\b/i.test(msg);
    return NextResponse.json(
      { error: msg, degraded: isRate, synced: 0, summary: null },
      { status: isRate ? 200 : 500 }
    );
  }
}
