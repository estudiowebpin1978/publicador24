"use client"

import React from "react"
import { useRouter } from "next/navigation"
import ConvexClientProvider from "@/components/providers/convex-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { ErrorBoundary } from "@/components/error-boundary"

function getStoredUser(): { email: string } | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("autopublisher_user")
  if (!stored) return null
  try {
    const user = JSON.parse(stored)
    return user && user.email ? user : null
  } catch {
    return null
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [storedUser] = React.useState(() => getStoredUser())

  React.useEffect(() => {
    if (!storedUser) {
      router.push("/login")
    }
  }, [storedUser, router])

  if (!storedUser) {
    return null
  }

  return (
    <ConvexClientProvider>
      <AppLayout>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </AppLayout>
    </ConvexClientProvider>
  )
}
