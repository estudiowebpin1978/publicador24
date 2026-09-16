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

export async function getBufferChannel(channelId: string): Promise<BufferChannel> {
  const data = await bufferGraphQL<{ channel: BufferChannel }>(
    `{ channel(input: { id: "${channelId}" }) { id name service displayName avatar isDisconnected } }`
  );
  return data.channel;
}

export async function createBufferPost(input: {
  channelId: string;
  text: string;
  schedulingType?: "addnow" | "next" | "custom";
  scheduledAt?: string;
  media?: { url: string; type?: string };
}): Promise<{ id: string; status: string }> {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        post {
          id
          status
        }
      }
    }
  `;

  const variables = {
    input: {
      channelId: input.channelId,
      text: input.text,
      schedulingType: input.schedulingType || "addnow",
      ...(input.scheduledAt && { scheduledAt: input.scheduledAt }),
      ...(input.media && { media: input.media }),
    },
  };

  const data = await bufferGraphQL<{ createPost: { post: { id: string; status: string } } }>(mutation, variables);
  return data.createPost.post;
}

export async function getBufferPosts(channelId: string, first: number = 10): Promise<BufferPost[]> {
  const data = await bufferGraphQL<{ posts: { edges: { node: BufferPost }[] } }>(
    `{ posts(input: { channelId: "${channelId}" }) { edges { node { id text status createdAt sentAt } } } }`
  );
  return data.posts.edges.map((e) => e.node);
}

export async function getDailyLimits(organizationId: string, channelIds: string[]) {
  const data = await bufferGraphQL<{ dailyPostingLimits: { channelId: string; limit: number; scheduled: number; sent: number; isAtLimit: boolean }[] }>(
    `{ dailyPostingLimits(input: { organizationId: "${organizationId}", channelIds: ${JSON.stringify(channelIds)} }) { channelId limit scheduled sent isAtLimit } }`
  );
  return data.dailyPostingLimits;
}
