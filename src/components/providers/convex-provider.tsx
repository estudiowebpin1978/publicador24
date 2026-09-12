"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode, useState, useEffect } from "react"

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex, setConvex] = useState<ConvexReactClient | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (url && !url.includes("placeholder")) {
      try {
        setConvex(new ConvexReactClient(url))
      } catch {
        setConvex(null)
      }
    }
    setChecked(true)
  }, [])

  if (!checked) {
    return <>{children}</>
  }

  if (!convex) {
    return <>{children}</>
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
