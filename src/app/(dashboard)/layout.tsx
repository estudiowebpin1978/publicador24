"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ConvexClientProvider from "@/components/providers/convex-provider"
import { AppLayout } from "@/components/layout/app-layout"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("autopublisher_user")
    if (stored) {
      try {
        const user = JSON.parse(stored)
        if (user && user.email) {
          setIsAuthenticated(true)
        } else {
          router.push("/login")
        }
      } catch {
        router.push("/login")
      }
    } else {
      router.push("/login")
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><p>Cargando...</p></div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ConvexClientProvider>
      <AppLayout>{children}</AppLayout>
    </ConvexClientProvider>
  )
}
