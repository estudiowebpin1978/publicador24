import { query } from "./_generated/server"
import { callBuffer } from "./bufferActions"

export const testConnection = query({
  args: {},
  handler: async () => {
    try {
      const account = await callBuffer(`
        query { me { id name email } }
      `)
      return {
        connected: true,
        message: `Buffer conectado — ${account?.me?.name || "cuenta activa"}`,
      }
    } catch (error: any) {
      return {
        connected: false,
        message: error?.message || "Buffer no conectado — revisar API key",
      }
    }
  },
})

export const getChannels = query({
  args: {},
  handler: async () => {
    try {
      const data = await callBuffer(`
        query { channels { id service displayName status avatarUrl } }
      `)
      return data?.channels || []
    } catch {
      return []
    }
  },
})
