"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  user: { email: string } | null
  mounted: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  mounted: false,
  login: () => false,
  logout: () => {},
})

const VALID_USER = {
  email: "estudiowebpin@gmail.com",
  password: "admin24",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("autopublisher_user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem("autopublisher_user")
      }
    }
    setMounted(true)
  }, [])

  const login = (email: string, password: string): boolean => {
    if (email === VALID_USER.email && password === VALID_USER.password) {
      const userData = { email }
      setUser(userData)
      localStorage.setItem("autopublisher_user", JSON.stringify(userData))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("autopublisher_user")
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, mounted, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
