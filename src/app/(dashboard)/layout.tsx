"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import ConvexClientProvider from "@/components/providers/convex-provider"
import { AppLayout } from "@/components/layout/app-layout"
import { useAuth } from "@/lib/auth/auth-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mounted } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, mounted, router])

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <ConvexClientProvider>
      <AppLayout>{children}</AppLayout>
    </ConvexClientProvider>
  )
}
