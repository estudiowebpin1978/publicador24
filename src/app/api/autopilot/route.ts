import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";
import { wrapProviderWithCostTracking, getTodayCost } from "@/lib/ai/cost-tracker";
import { readStrategyMemory, writeStrategyMemory } from "@/lib/ai/strategy-memory";
import { checkPublicationSafety } from "@/lib/ai/publication-safety";
import { runLearningLoop, collectMetrics, updateStrategyScores, generateInsights } from "@/lib/ai/learning-loop";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface LoopResult {
  timestamp: number;
  campaignsChecked: number;
  contentGenerated: number;
  contentScheduled: number;
  contentPublished: number;
  safetyChecks: number;
  metricsCollected: number;
  learningUpdates: number;
  errors: string[];
  details: string[];
}

async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey || apiKey === "tu-key-aqui" || apiKey === "your-buffer-api-key") {
    throw new Error("BUFFER NOT CONFIGURED");
  }

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("BUFFER_RATE_LIMIT");
    throw new Error(`Buffer HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.errors) {
    const code = data.errors[0]?.extensions?.code;
    if (code === "RATE_LIMIT_EXCEEDED") throw new Error("BUFFER_RATE_LIMIT");
    throw new Error(`Buffer: ${data.errors[0]?.message || "unknown"}`);
  }
  return data.data;
}

async function getBufferChannels() {
  const accountData = await callBuffer(`{ account { id organizations { id } } }`);
  const orgId = accountData.account.organizations[0]?.id;
  if (!orgId) throw new Error("No Buffer organization found");

  const channelsData = await callBuffer(
    `{ channels(input: { organizationId: "${orgId}" }) { id service displayName name isDisconnected isLocked } }`
  );
  return channelsData.channels.filter((ch: { isDisconnected: boolean; isLocked: boolean }) => !ch.isDisconnected && !ch.isLocked);
}

async function publishToBuffer(text: string, channelId: string, scheduledAt?: string) {
  const input: Record<string, unknown> = { channelId, text };
  if (scheduledAt) {
    input.scheduledAt = scheduledAt;
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
  return result.createPost;
}

async function collectRealMetrics(channelId: string, platform: string) {
  try {
    const data = await callBuffer(
      `{ channel(input: { id: "${channelId}" }) { id service displayName } }`
    );
    return {
      channel: data.channel,
      collectedAt: new Date().toISOString(),
      platform,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const result: LoopResult = {
    timestamp: Date.now(),
    campaignsChecked: 0,
    contentGenerated: 0,
    contentScheduled: 0,
    contentPublished: 0,
    safetyChecks: 0,
    metricsCollected: 0,
    learningUpdates: 0,
    errors: [],
    details: [],
  };

  try {
    const { api } = await import("@convex/_generated/api");

    // Check autopilot settings
    const settings = await convex.query(api.autopilot.getSettings);
    if (settings?.level === "STOPPED") {
      return NextResponse.json({ ...result, errors: ["Autopilot is STOPPED"] });
    }

    // Get Buffer channels
    let channels: { id: string; service: string; displayName: string }[] = [];
    try {
      channels = await getBufferChannels();
      result.details.push(`Buffer: ${channels.length} channels connected`);
    } catch (e) {
      result.errors.push(`Buffer: ${e instanceof Error ? e.message : "connection failed"}`);
      return NextResponse.json(result);
    }

    if (channels.length === 0) {
      result.errors.push("No active Buffer channels found");
      return NextResponse.json(result);
    }

    // Get active campaigns
    const campaigns = await convex.query(api.campaigns.list, { status: "ACTIVE" });
    result.campaignsChecked = campaigns.length;

    if (campaigns.length === 0) {
      result.details.push("No active campaigns");
      return NextResponse.json(result);
    }

    const ai = wrapProviderWithCostTracking(getAIProvider(), "openrouter");

    for (const campaign of campaigns) {
      try {
        if (campaign.autopilotLevel === "MANUAL") continue;

        // Get content pieces for this campaign
        const pieces = await convex.query(api.contentPieces.getByCampaign, {
          campaignId: campaign._id,
        });

        const queueMinimum = campaign.queueMinimum || 7;
        const generated = pieces.filter((p: { status: string }) => p.status === "GENERATED");
        const scheduled = pieces.filter((p: { status: string }) => p.status === "SCHEDULED");

        // STEP 1: Generate new content if queue is low
        if (generated.length < queueMinimum) {
          const needed = Math.min(queueMinimum - generated.length, 5);
          result.details.push(`${campaign.name}: Queue low (${generated.length}/${queueMinimum}), generating ${needed} pieces`);

          // Read strategy memory for learning
          const memory = await readStrategyMemory(campaign._id);
          const avoidHooks = memory.worstPerforming.map((w) => w.hook);
          const boostFormats = memory.bestPerforming.map((b) => b.format);

          for (let i = 0; i < needed; i++) {
            try {
              const platform = channels[i % channels.length]?.service || "instagram";
              const memoryContext = avoidHooks.length > 0
                ? `\nEVITAR estos hooks (bajo rendimiento): ${avoidHooks.slice(0, 3).join('; ')}`
                : "";
              const formatContext = boostFormats.length > 0
                ? `\nPRIORIZAR estos formatos (alto rendimiento): ${boostFormats.slice(0, 3).join(', ')}`
                : "";

              const genResult = await ai.generateText({
                prompt: `Generá contenido para ${campaign.name} en ${platform}.${memoryContext}${formatContext}

OBJETIVO: ${campaign.objective || "conseguir clientes"}
PÚBLICO: ${campaign.targetAudience || "general"}

Generá:
1. Hook (primera línea)
2. Caption completo
3. 8 hashtags
4. CTA

Respondé con JSON:
{
  "hook": "...",
  "caption": "...",
  "hashtags": ["#tag1"],
  "cta": "..."
}`,
                system_prompt: "Sos un experto en copywriting. Creá contenido que GENERE DEMANDA. Respondé con JSON válido.",
                max_tokens: 1500,
              });

              let content: { hook: string; caption: string; hashtags: string[]; cta: string };
              try {
                const match = genResult.text.match(/```json\s*([\s\S]*?)```/);
                content = JSON.parse(match ? match[1] : genResult.text);
              } catch {
                content = { hook: "", caption: genResult.text, hashtags: [], cta: "" };
              }

              // Safety check
              const safety = await checkPublicationSafety(
                `gen-${campaign._id}-${Date.now()}-${i}`,
                content.hook,
                content.caption,
                platform
              );
              result.safetyChecks++;

              if (safety.approved) {
                // Ensure campaign has a content pack for auto-generated content
                let packId = campaign._id; // Use campaign ID as fallback pack reference
                try {
                  const packs = await convex.query(api.contentPacks.list, { campaignId: campaign._id });
                  if (packs && packs.length > 0) {
                    packId = packs[0]._id;
                  } else {
                    // Create an auto-pack for this campaign
                    packId = await convex.mutation(api.contentPacks.create, {
                      campaignId: campaign._id,
                      name: "Auto-generated content",
                      totalPieces: 0,
                      generatedPieces: 0,
                      status: "active",
                    });
                  }
                } catch {
                  // If pack creation fails, skip this piece
                  continue;
                }

                // Save to Convex
                await convex.mutation(api.contentPieces.create, {
                  contentPackId: packId,
                  campaignId: campaign._id,
                  title: content.hook,
                  hook: content.hook,
                  body: content.caption,
                  cta: content.cta,
                  contentType: "post",
                  funnelStage: "interest",
                  platform,
                  hashtags: content.hashtags,
                  keywords: [],
                  score: safety.safetyScore,
                  status: "GENERATED",
                });
                result.contentGenerated++;
                result.details.push(`Generated: ${content.hook.substring(0, 50)}... (${platform})`);
              } else {
                result.details.push(`Blocked by safety: ${content.hook.substring(0, 30)}... — ${safety.reason}`);
              }
            } catch (e) {
              result.errors.push(`Generate: ${e instanceof Error ? e.message : "failed"}`);
            }
          }
        }

        // STEP 2: Schedule generated content to Buffer
        const unscheduled = generated.slice(0, 3);
        for (const piece of unscheduled) {
          try {
            const channel = channels.find((c) => c.service === piece.platform) || channels[0];
            if (!channel) continue;

            const text = `${piece.hook}\n\n${piece.body}\n\n${piece.hashtags?.map((h: string) => `#${h}`).join(" ") || ""}`;

            const postResult = await publishToBuffer(text, channel.id);
            if (postResult?.post?.id) {
              // Mark piece as published directly (Buffer handles scheduling)
              await convex.mutation(api.contentPieces.updateStatus, {
                id: piece._id,
                status: "PUBLISHED",
              });

              // Record in publishedPosts
              try {
                await convex.mutation(api.publishedPosts.create, {
                  scheduledPostId: piece._id as unknown as string,
                  socialAccountId: channel.id as unknown as string,
                  platform: piece.platform,
                  platformPostId: postResult.post.id,
                  platformPostUrl: `https://${channel.service}.com/post/${postResult.post.id}`,
                  caption: text,
                  hashtags: piece.hashtags || [],
                  mediaUrls: [],
                  publishedAt: Date.now(),
                });
              } catch {
                // publishedPosts creation is best-effort
              }

              result.contentScheduled++;
              result.details.push(`Published: ${piece.hook.substring(0, 40)}... → ${channel.displayName}`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : "failed";
            if (msg.includes("RATE_LIMIT")) {
              result.errors.push("Buffer rate limited — skipping scheduling");
              break;
            }
            result.errors.push(`Schedule: ${msg}`);
          }
        }

        // STEP 3: Publish scheduled content directly to Buffer
        const readyToPublish = scheduled.filter(
          (p: { status: string; scheduledAt?: number }) =>
            p.status === "SCHEDULED" && (!p.scheduledAt || p.scheduledAt <= Date.now())
        );

        if (readyToPublish.length > 0 && campaign.autopilotLevel === "AUTONOMOUS") {
          for (const piece of readyToPublish.slice(0, 2)) {
            try {
              const channel = channels.find((c) => c.service === piece.platform) || channels[0];
              if (!channel) continue;

              const text = `${piece.hook}\n\n${piece.body}\n\n${piece.hashtags?.map((h: string) => `#${h}`).join(" ") || ""}`;
              const pubResult = await publishToBuffer(text, channel.id);

              if (pubResult?.post?.id) {
                await convex.mutation(api.contentPieces.updateStatus, {
                  id: piece._id,
                  status: "PUBLISHED",
                });
                result.contentPublished++;
                result.details.push(`Published: ${piece.hook.substring(0, 40)}... → ${channel.displayName}`);

                // Learn from this publication (initial score, will be updated by learning loop)
                await writeStrategyMemory({
                  campaignId: campaign._id,
                  topic: campaign.name,
                  hook: piece.hook,
                  contentType: piece.contentType,
                  platform: piece.platform,
                  funnelStage: piece.funnelStage,
                  score: 50, // Initial score, updated by learning loop after metrics collection
                  publishedPostId: postResult.post.id,
                });
                result.learningUpdates++;
              }
            } catch (e) {
              result.errors.push(`Publish: ${e instanceof Error ? e.message : "failed"}`);
            }
          }
        }

        // STEP 5: Run learning loop (metrics + scores + insights)
        try {
          const learningResult = await runLearningLoop(campaign._id);
          result.metricsCollected += learningResult.metricsCollected;
          result.learningUpdates += learningResult.scoresUpdated;

          for (const adjustment of learningResult.strategyAdjustments) {
            result.details.push(`Learning: ${adjustment}`);
          }

          if (learningResult.insightsGenerated > 0) {
            result.details.push(`Generated ${learningResult.insightsGenerated} new insights`);
          }
        } catch {
          // Learning loop is best-effort
        }

        // Update campaign health
        const newGenerated = await convex.query(api.contentPieces.getByCampaign, { campaignId: campaign._id });
        const genCount = newGenerated.filter((p: { status: string }) => p.status === "GENERATED").length;
        const schedCount = newGenerated.filter((p: { status: string }) => p.status === "SCHEDULED").length;
        const pubCount = newGenerated.filter((p: { status: string }) => p.status === "PUBLISHED").length;
        const total = newGenerated.length;

        const healthScore = total === 0 ? 50 : Math.round(
          (Math.min(100, (genCount / 7) * 100) * 0.4) +
          (Math.min(100, (schedCount / 3) * 100) * 0.3) +
          (Math.min(100, (pubCount / Math.max(total * 0.3, 1)) * 100) * 0.3)
        );

        await convex.mutation(api.campaigns.update, {
          id: campaign._id,
          healthScore,
          lastGeneratedAt: Date.now(),
        });

      } catch (e) {
        result.errors.push(`Campaign ${campaign.name}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    result.details.push(`Cost today: $${getTodayCost().totalCost.toFixed(4)} | ${getTodayCost().totalTokens} tokens`);

    return NextResponse.json(result);
  } catch (error) {
    result.errors.push(`Fatal: ${error instanceof Error ? error.message : "unknown"}`);
    return NextResponse.json(result, { status: 500 });
  }
}
