import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER NOT CONFIGURED");

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "Buffer error");
  return data.data;
}

async function getBufferChannels() {
  const accountData = await callBuffer(`{ account { id organizations { id } } }`);
  const orgId = accountData.account.organizations[0]?.id;
  if (!orgId) throw new Error("No Buffer organization found");

  const channelsData = await callBuffer(
    `{ channels(input: { organizationId: "${orgId}" }) { id service displayName isDisconnected isLocked } }`
  );
  return channelsData.channels.filter(
    (ch: { isDisconnected: boolean; isLocked: boolean }) => !ch.isDisconnected && !ch.isLocked
  );
}

export async function POST(request: NextRequest) {
  try {
    const { api } = await import("@convex/_generated/api");
    const body = await request.json();
    const { contentPieceId, platform, scheduleAt } = body;

    if (!contentPieceId) {
      return NextResponse.json(
        { error: "contentPieceId is required" },
        { status: 400 }
      );
    }

    // Get the content piece
    const piece = await convex.query(api.contentPieces.getById, { id: contentPieceId });
    if (!piece) {
      return NextResponse.json(
        { error: "Content piece not found" },
        { status: 404 }
      );
    }

    // Get Buffer channels
    const channels = await getBufferChannels();
    const targetPlatform = platform || piece.platform || "instagram";
    const channel = channels.find((c) => c.service === targetPlatform) || channels[0];

    if (!channel) {
      return NextResponse.json(
        { error: `No Buffer channel found for ${targetPlatform}` },
        { status: 400 }
      );
    }

    // Build the post text
    const text = `${piece.hook}\n\n${piece.body}\n\n${piece.hashtags?.map((h: string) => `#${h}`).join(" ") || ""}`;

    // Publish to Buffer
    const input: Record<string, unknown> = {
      channelId: channel.id,
      text,
    };

    if (scheduleAt) {
      input.scheduledAt = scheduleAt;
      input.schedulingType = "scheduled";
    } else {
      input.schedulingType = "sendNow";
    }

    const result = await callBuffer(
      `mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess { post { id text status } }
          ... on MutationError { message }
        }
      }`,
      { input }
    );

    const postResult = result.createPost;
    if (!postResult?.post?.id) {
      return NextResponse.json(
        { error: postResult?.message || "Failed to publish" },
        { status: 500 }
      );
    }

    // Record the republish
    try {
      await convex.mutation(api.publishedPosts.create, {
        scheduledPostId: contentPieceId,
        socialAccountId: channel.id,
        platform: targetPlatform,
        platformPostId: postResult.post.id,
        platformPostUrl: `https://${channel.service}.com/post/${postResult.post.id}`,
        caption: text,
        hashtags: piece.hashtags || [],
        mediaUrls: [],
        publishedAt: Date.now(),
      });
    } catch {
      // Best effort
    }

    return NextResponse.json({
      success: true,
      post: {
        id: postResult.post.id,
        platform: targetPlatform,
        channel: channel.displayName,
        status: postResult.post.status,
        url: `https://${channel.service}.com/post/${postResult.post.id}`,
      },
    });
  } catch (error) {
    console.error("Republish error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Error republishing content", details: message },
      { status: 500 }
    );
  }
}
