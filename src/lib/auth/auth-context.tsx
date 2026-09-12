"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  user: { email: string } | null
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("autopublisher_user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem("autopublisher_user")
      }
    }
    setLoading(false)
  }, [])

  const logout = () => {
    setUser(null)
    localStorage.removeItem("autopublisher_user")
    window.location.href = "/login"
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><p>Cargando...</p></div>
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
