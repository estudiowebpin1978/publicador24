"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode, useMemo } from "react"

function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (url && !url.includes("placeholder")) {
    try {
      return new ConvexReactClient(url)
    } catch {
      return null
    }
  }
  return null
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => getConvexClient(), [])

  if (!convex) {
    return <>{children}</>
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
