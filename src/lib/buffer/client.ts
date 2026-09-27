const BUFFER_API_URL = "https://api.buffer.com";

const CACHE_TTL = 120_000;
const cache = new Map<string, { data: unknown; expires: number }>();

import { isRateLimited, markRateLimited, clearRateLimit, refreshRemoteState } from "./rate-limit";

export async function isBufferRateLimited(): Promise<boolean> {
  await refreshRemoteState();
  return isRateLimited();
}

function markRL() {
  markRateLimited();
}

function clearRL() {
  clearRateLimit();
}

async function cachedGraphQL<T>(key: string, query: string): Promise<T> {
  if (isRateLimited()) {
    throw new Error("Buffer rate limited — skipping");
  }
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data as T;
  try {
    const data = await bufferGraphQL<T>(query);
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
    clearRL();
    return data;
  } catch (e) {
    if (e instanceof Error && /too many requests|429/i.test(e.message)) {
      markRL();
    }
    throw e;
  }
}

export function invalidateBufferCache() {
  cache.clear();
}

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
  displayName: string;
  avatar: string;
  isDisconnected: boolean;
}

export interface BufferPost {
  id: string;
  text: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  channel?: { id: string; service: string };
}

async function bufferGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER_API_KEY not configured");

  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    markRL();
    throw new Error("Too many requests from this client");
  }

  const json = await res.json();
  if (json.errors) {
    const msg = json.errors[0]?.message || "Buffer API error";
    if (/too many requests/i.test(msg)) markRL();
    throw new Error(msg);
  }
  clearRL();
  return json.data;
}

export async function getBufferAccount() {
  return cachedGraphQL<{ account: { id: string; email: string; organizations: { id: string; name: string }[] } }>(
    "account",
    `{ account { id email organizations { id name } } }`
  );
}

export async function getBufferChannels(organizationId: string): Promise<BufferChannel[]> {
  const data = await cachedGraphQL<{ channels: BufferChannel[] }>(
    `channels:${organizationId}`,
    `{ channels(input: { organizationId: "${organizationId}" }) { id name service displayName avatar isDisconnected } }`
  );
  return data.channels;
}

export async function createBufferPost(input: {
  channelId: string;
  text: string;
  schedulingType?: "automatic" | "notification";
  mode?: "addToQueue" | "shareNext" | "shareNow" | "customScheduled";
  scheduledAt?: string;
  assets?: { image?: { url: string; metadata?: { altText?: string } }; video?: { url: string; metadata?: { thumbnailOffset?: number } } }[];
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; status: string }> {
  const assetsJson = input.assets
    ? input.assets.map((a) => {
        if (a.image) return `{ image: { url: "${a.image.url}"${a.image.metadata ? `, metadata: { altText: "${a.image.metadata.altText || ""}" }` : ""} } }`;
        if (a.video) {
          const metaParts: string[] = [];
          if (a.video.metadata?.thumbnailOffset) metaParts.push(`thumbnailOffset: ${a.video.metadata.thumbnailOffset}`);
          const metaStr = metaParts.length > 0 ? `, metadata: { ${metaParts.join(", ")} }` : "";
          return `{ video: { url: "${a.video.url}"${metaStr} } }`;
        }
        return "{}";
      }).join(", ")
    : "";

  let metadataStr = "";
  if (input.metadata) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(input.metadata)) {
      if (typeof value === "object" && value !== null) {
        const innerParts: string[] = [];
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (typeof v === "boolean") {
            innerParts.push(k + ": " + String(v));
          } else if (typeof v === "number") {
            innerParts.push(k + ": " + String(v));
          } else if (k === "type") {
            innerParts.push(k + ": " + v);
          } else {
            innerParts.push(k + ": " + JSON.stringify(v));
          }
        }
        parts.push(key + ": { " + innerParts.join(", ") + " }");
      }
    }
    if (parts.length > 0) {
      metadataStr = ", metadata: { " + parts.join(", ") + " }";
    }
  }

  const mutation = `
    mutation CreatePost {
      createPost(input: {
        channelId: "${input.channelId}",
        text: ${JSON.stringify(input.text)},
        schedulingType: ${input.schedulingType || "automatic"},
        mode: ${input.mode || "addToQueue"}${metadataStr}${assetsJson ? `,
        assets: [${assetsJson}]` : ""}
      }) {
        ... on PostActionSuccess {
          post { id status }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const data = await bufferGraphQL<{ createPost: { post?: { id: string; status: string }; message?: string } }>(mutation);

  if (data.createPost.message) {
    throw new Error(data.createPost.message);
  }

  invalidateBufferCache();
  return data.createPost.post!;
}

export async function getBufferPosts(channelId: string, first: number = 10): Promise<BufferPost[]> {
  const accountRes = await getBufferAccount();
  const orgId = accountRes.account.organizations[0]?.id;
  if (!orgId) return [];

  const key = `posts:${channelId}:${first}`;
  const data = await cachedGraphQL<{ posts: { edges: { node: BufferPost }[] } }>(
    key,
    `{ posts(first: ${first}, input: { organizationId: "${orgId}", filter: { channelIds: ["${channelId}"] } }) { edges { node { id text status createdAt sentAt } } } }`
  );
  return data.posts.edges.map((e) => e.node);
}

export async function deleteBufferPost(postId: string): Promise<boolean> {
  try {
    await bufferGraphQL(`mutation { deletePost(input: { id: "${postId}" }) { __typename } }`);
    invalidateBufferCache();
    return true;
  } catch {
    return false;
  }
}
