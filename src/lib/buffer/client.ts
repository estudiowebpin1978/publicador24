const BUFFER_API_URL = "https://api.buffer.com";

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

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Buffer API error");
  }
  return json.data;
}

export async function getBufferAccount() {
  return bufferGraphQL<{ account: { id: string; email: string; organizations: { id: string; name: string }[] } }>(
    `{ account { id email organizations { id name } } }`
  );
}

export async function getBufferChannels(organizationId: string): Promise<BufferChannel[]> {
  const data = await bufferGraphQL<{ channels: BufferChannel[] }>(
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
  assets?: { image?: { url: string; metadata?: { altText?: string } }; video?: { url: string } }[];
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; status: string }> {
  const assetsJson = input.assets
    ? input.assets.map((a) => {
        if (a.image) return `{ image: { url: "${a.image.url}"${a.image.metadata ? `, metadata: { altText: "${a.image.metadata.altText || ""}" }` : ""} } }`;
        if (a.video) return `{ video: { url: "${a.video.url}" } }`;
        return "{}";
      }).join(", ")
    : "";

  const metadataStr = input.metadata
    ? (() => {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(input.metadata)) {
          if (typeof value === "object" && value !== null) {
            const inner = Object.entries(value)
              .map(([k, v]) => `${k}: ${typeof v === "boolean" ? v : `"${v}"}`)
              .join(", ");
            parts.push(`${key}: { ${inner} }`);
          }
        }
        return parts.length > 0 ? `, metadata: { ${parts.join(", ")} }` : "";
      })()
    : "";

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

  return data.createPost.post!;
}

export async function getBufferPosts(channelId: string, first: number = 10): Promise<BufferPost[]> {
  const data = await bufferGraphQL<{ posts: { edges: { node: BufferPost }[] } }>(
    `{ posts(input: { channelId: "${channelId}" }) { edges { node { id text status createdAt sentAt } } } }`
  );
  return data.posts.edges.map((e) => e.node);
}
