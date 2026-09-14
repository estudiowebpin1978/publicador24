// Convex Action: llamar a Buffer API GraphQL
// Uses Buffer's new GraphQL API at https://api.buffer.com

export async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY
  if (!apiKey || apiKey === "tu-key-aqui" || apiKey === "your-buffer-api-key") {
    throw new Error(
      "BUFFER NOT CONFIGURED: BUFFER_API_KEY is a placeholder. " +
      "Get a real key from https://buffer.com/settings/api and set it in .env.local"
    )
  }

  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error("Buffer 401 — API key inválida")
    if (res.status === 429) throw new Error("Buffer 429 — Rate limit")
    throw new Error(`Buffer HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.errors) {
    const firstError = data.errors[0]
    const code = firstError?.extensions?.code
    if (code === "UNAUTHORIZED") throw new Error("Buffer UNAUTHORIZED — API key inválida")
    if (code === "RATE_LIMIT_EXCEEDED") throw new Error("Buffer RATE_LIMIT_EXCEEDED — Esperá y reintentá")
    throw new Error(`Buffer GraphQL error: ${firstError?.message || JSON.stringify(data.errors)}`)
  }
  return data.data
}

export async function getBufferAccount() {
  return callBuffer(`
    query GetAccount {
      account {
        id
        email
        name
        avatar
        timezone
      }
    }
  `)
}

export async function getBufferOrganizations() {
  return callBuffer(`
    query GetOrganizations {
      organizations {
        id
        name
      }
    }
  `)
}

export async function getBufferChannels(organizationId: string) {
  return callBuffer(
    `
    query GetChannels($input: ChannelsInput!) {
      channels(input: $input) {
        id
        service
        displayName
        name
        avatar
        type
        isDisconnected
        isLocked
        isQueuePaused
      }
    }
  `,
    { input: { organizationId } }
  )
}

export async function getBufferPosts(channelId: string) {
  return callBuffer(
    `
    query GetPosts($input: PostsInput!) {
      posts(input: $input) {
        edges {
          node {
            id
            text
            status
            createdAt
          }
        }
      }
    }
  `,
    { input: { channelIds: [channelId] } }
  )
}

export async function createBufferPost({
  text,
  channelId,
  scheduledAt,
  imageUrl,
  platform,
}: {
  text: string
  channelId: string
  scheduledAt?: string
  imageUrl?: string
  platform?: string
}) {
  const input: Record<string, unknown> = {
    channelId,
    text,
    mode: scheduledAt ? "addToQueue" : "shareNow",
    schedulingType: "automatic",
    needsApproval: false,
  }

  if (scheduledAt) {
    input.mode = "addToQueue"
  }

  if (imageUrl) {
    input.assets = { image: { url: imageUrl } }
  }

  // Platform-specific metadata
  if (platform === "instagram") {
    input.metadata = { instagram: { type: "post", shouldShareToFeed: true } }
  } else if (platform === "facebook") {
    input.metadata = { facebook: { type: "post" } }
  } else if (platform === "tiktok") {
    input.metadata = { tiktok: {} }
  }

  return callBuffer(
    `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
            status
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `,
    { input }
  )
}

export async function getDailyPostingLimits(channelId: string, date: string) {
  return callBuffer(
    `
    query GetDailyLimits($input: DailyPostingLimitsInput!) {
      dailyPostingLimits(input: $input) {
        channelId
        limit
        scheduled
        isAtLimit
      }
    }
  `,
    { input: { channelIds: [channelId], date } }
  )
}
