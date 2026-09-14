"use client"

import { createContext, useContext, useState, ReactNode } from "react"

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

function getStoredUser(): { email: string } | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("autopublisher_user")
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem("autopublisher_user")
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(() => getStoredUser())

  const logout = () => {
    setUser(null)
    localStorage.removeItem("autopublisher_user")
    window.location.href = "/login"
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
