import { isBufferRateLimited } from "@/lib/buffer/client";
import { isBulkPublishRateLimited } from "@/lib/bulkpublish/client";
import { isMetaConfiguredAsync, publishToFacebook, publishToInstagram } from "@/lib/meta/graph";

export type Publisher = "buffer" | "bulkpublish" | "meta" | "none";

interface PublishInput {
  text: string;
  platform: string;
  imageUrl?: string;
  scheduledAt?: Date;
}

interface PublishResult {
  publisher: Publisher;
  success: boolean;
  externalId?: string;
  error?: string;
}

export async function publishWithRotation(input: PublishInput): Promise<PublishResult> {
  const attempts: { name: Publisher; fn: () => Promise<PublishResult> }[] = [];

  if (!(await isBufferRateLimited())) {
    attempts.push({ name: "buffer", fn: async () => publishViaBuffer(input) });
  }

  if (
    (await isMetaConfiguredAsync()) &&
    (input.platform === "facebook" || input.platform === "instagram")
  ) {
    attempts.push({ name: "meta", fn: async () => publishViaMeta(input) });
  }

  // BulkPublish solo para TikTok: su plan gratis son 30 requests/día y Facebook/
  // Instagram los agotaban reintentando cuando Meta falla (error #240). TikTok no
  // tiene otra vía gratis, así que esa cuota queda reservada para él.
  if (input.platform === "tiktok" && !isBulkPublishRateLimited()) {
    attempts.push({ name: "bulkpublish", fn: async () => publishViaBulkPublish(input) });
  }

  if (attempts.length === 0) {
    return { publisher: "none", success: false, error: "Todos los proveedores en rate limit" };
  }

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const result = await attempt.fn();
      if (result.success) return result;
      if (result.error) errors.push(`${attempt.name}: ${result.error}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/rate limited/i.test(msg)) {
        errors.push(`${attempt.name}: rate limit`);
        continue;
      }
      errors.push(`${attempt.name}: ${msg}`);
    }
  }

  return { publisher: "none", success: false, error: errors.join(" | ") || "Todos fallaron" };
}

async function publishViaBuffer(input: PublishInput): Promise<PublishResult> {
  const { getBufferAccount, getBufferChannels, createBufferPost } = await import("@/lib/buffer/client");

  const account = await getBufferAccount();
  const orgId = account.account.organizations[0]?.id;
  if (!orgId) throw new Error("No Buffer org");

  const channels = await getBufferChannels(orgId);
  const channel = channels.find(
    (c) => c.service === input.platform && !c.isDisconnected
  );
  if (!channel) throw new Error(`No Buffer channel for ${input.platform}`);

  let metadata = {};
  let schedulingType: "automatic" | "notification" = "automatic";
  if (input.platform === "instagram") {
    metadata = { instagram: { type: "post", shouldShareToFeed: true } };
  } else if (input.platform === "facebook") {
    metadata = { facebook: { type: "post" } };
    schedulingType = "notification";
  }

  const post = await createBufferPost({
    channelId: channel.id,
    text: input.text,
    schedulingType,
    mode: "addToQueue",
    metadata,
    assets: input.imageUrl ? [{ image: { url: input.imageUrl } }] : [],
  });

  return { publisher: "buffer", success: true, externalId: post.id };
}

async function publishViaMeta(input: PublishInput): Promise<PublishResult> {
  try {
    if (input.platform === "facebook") {
      const result = await publishToFacebook(input.text, undefined, input.imageUrl);
      return { publisher: "meta", success: true, externalId: result.id };
    }
    if (input.platform === "instagram") {
      if (!input.imageUrl) {
        return { publisher: "meta", success: false, error: "Instagram requiere imagen" };
      }
      const result = await publishToInstagram(input.text, input.imageUrl);
      return { publisher: "meta", success: true, externalId: result.id };
    }
    return { publisher: "meta", success: false, error: `Meta no soporta ${input.platform}` };
  } catch (e) {
    return { publisher: "meta", success: false, error: e instanceof Error ? e.message : "error" };
  }
}

async function publishViaBulkPublish(input: PublishInput): Promise<PublishResult> {
  const { getChannels, createPost } = await import("@/lib/bulkpublish/client");

  const channels = await getChannels();
  const platformLower = input.platform.toLowerCase();
  const channel = channels.find(
    (c) =>
      c.platform.toLowerCase() === platformLower ||
      (platformLower === "facebook" && c.platform.toLowerCase().includes("facebook")) ||
      (platformLower === "instagram" && c.platform.toLowerCase().includes("instagram")) ||
      (platformLower === "tiktok" && c.platform.toLowerCase().includes("tiktok")) ||
      (platformLower === "youtube" && c.platform.toLowerCase().includes("youtube"))
  );

  if (!channel) {
    return {
      publisher: "bulkpublish",
      success: false,
      error: `No hay canal ${input.platform} conectado en BulkPublish (canales: ${channels.map((c) => c.platform).join(", ")})`,
    };
  }

  const result = await createPost({
    text: input.text,
    channelIds: [channel.id],
    mediaUrls: input.imageUrl ? [input.imageUrl] : [],
    scheduledAt: input.scheduledAt?.toISOString(),
    publishNow: !input.scheduledAt,
  });

  if (!result.success) {
    return { publisher: "bulkpublish", success: false, error: result.error };
  }

  return { publisher: "bulkpublish", success: true, externalId: String(result.id) };
}

export async function getProviderStatus(): Promise<{
  buffer: "ok" | "rate_limited";
  bulkpublish: "ok" | "rate_limited";
  meta: "configured" | "not_configured";
  activeOrder: Publisher[];
}> {
  const bufferRL = await isBufferRateLimited();
  const bpRL = isBulkPublishRateLimited();
  const metaOk = await isMetaConfiguredAsync();

  const activeOrder: Publisher[] = [];
  if (!bufferRL) activeOrder.push("buffer");
  if (metaOk) activeOrder.push("meta");
  if (!bpRL) activeOrder.push("bulkpublish");
  if (activeOrder.length === 0) activeOrder.push("none");

  return {
    buffer: bufferRL ? "rate_limited" : "ok",
    bulkpublish: bpRL ? "rate_limited" : "ok",
    meta: metaOk ? "configured" : "not_configured",
    activeOrder,
  };
}
