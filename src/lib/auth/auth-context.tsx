"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface User {
  userId: string
  email: string
  name: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  logout: () => {},
  loading: true,
})

function mapUser(supabaseUser: SupabaseUser): User {
  return {
    userId: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: supabaseUser.user_metadata?.name ?? supabaseUser.email?.split("@")[0] ?? "",
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        if (session?.user) {
          setUser(mapUser(session.user))
        }
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    let sub: { unsubscribe: () => void } | undefined
    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(mapUser(session.user))
        } else {
          setUser(null)
        }
      })
      sub = result.data.subscription
    } catch {
      // onAuthStateChange failed, continue without it
    }

    return () => {
      active = false
      sub?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // signOut failed, continue
    }
    setUser(null)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
