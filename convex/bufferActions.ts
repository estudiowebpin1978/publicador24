// Convex Action: llamar a Buffer API GraphQL
// Usa fetch nativo — no instala SDK de GraphQL

export async function callBuffer(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY
  if (!apiKey || apiKey === "tu-key-aqui" || apiKey === "your-buffer-api-key") {
    throw new Error(
      "BUFFER NOT CONFIGURED: BUFFER_API_KEY is a placeholder. " +
      "Get a real key from https://buffer.com/developers/api and set it in .env.local"
    )
  }

  const res = await fetch("https://api.buffer.com/1/graphql", {
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
  if (data.errors) throw new Error(`Buffer GraphQL error: ${data.errors[0].message}`)
  return data.data
}

export async function getBufferAccount() {
  return callBuffer(`
    query GetAccount {
      me {
        id
        name
        email
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

export async function getBufferChannels() {
  return callBuffer(`
    query GetChannels {
      channels {
        id
        service
        displayName
        status
        avatarUrl
      }
    }
  `)
}

export async function getBufferPosts() {
  return callBuffer(`
    query GetPosts {
      posts {
        id
        text
        status
        channelId
        createdAt
      }
    }
  `)
}

export async function createBufferPost({
  text,
  channelId,
  schedulingType = "public",
}: {
  text: string
  channelId: string
  schedulingType?: string
}) {
  return callBuffer(
    `
    mutation CreatePost($input: PostCreateInput!) {
      createPost(input: $input) {
        id
        text
        status
      }
    }
  `,
    {
      input: {
        text,
        channelIds: [channelId],
        schedulingType,
      },
    }
  )
}
