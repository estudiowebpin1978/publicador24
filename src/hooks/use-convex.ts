"use client"

import { useCallback } from "react"

// Supabase-based replacement for Convex hooks
// All data goes through /api/* routes

export function useQuery(_fn: unknown, _args?: unknown): undefined {
  // This stub is only used for type compatibility.
  // All pages should use fetch() directly for Supabase data.
  return undefined
}

export function useMutation(_fn: unknown): (...args: unknown[]) => Promise<unknown> {
  return useCallback(async () => { return undefined }, [])
}

export function useAction(_fn: unknown): (...args: unknown[]) => Promise<unknown> {
  return useCallback(async () => { return undefined }, [])
}

// Proxy that returns undefined for any property access
export const api = new Proxy({} as Record<string, unknown>, {
  get: (_target, prop) => {
    if (typeof prop === "symbol") return undefined
    return new Proxy(() => {}, {
      get: () => undefined,
      apply: () => undefined,
    })
  },
})
