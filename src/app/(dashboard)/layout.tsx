"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { ErrorBoundary } from "@/components/error-boundary"

function getStoredUser(): { email: string } | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    const stored = window.localStorage.getItem("autopublisher_user")
    if (!stored) return null
    const user = JSON.parse(stored)
    return user && user.email ? user : null
  } catch {
    return null
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [storedUser, setStoredUser] = React.useState<{ email: string } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const user = getStoredUser()
    setStoredUser(user)
    setLoading(false)
    if (!user) {
      // Use direct navigation instead of router.push for reliability
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold">Cargando...</h2>
        </div>
      </div>
    )
  }

  if (!storedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-[#0a0a14] to-[#1a1a2e]">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-2xl font-black text-white">24</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Necesitás iniciar sesión</h2>
          <p className="text-slate-400">Para acceder al dashboard, iniciá sesión con tu cuenta.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors">
            Ir al login
          </a>
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
