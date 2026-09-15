"use client"

import React from "react"
import { useRouter } from "next/navigation"
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
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">Necesitas iniciar sesión</h2>
          <p className="text-muted-foreground">Serás redirigido automáticamente...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AppLayout>
  )
}
