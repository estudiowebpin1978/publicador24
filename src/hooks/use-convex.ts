"use client";

import { useCallback } from "react";

export function useQuery(_fn: unknown, _args?: unknown): undefined {
  return undefined;
}

export function useMutation(_fn: unknown): (...args: unknown[]) => Promise<unknown> {
  return useCallback(async () => {
    return undefined;
  }, []);
}

export function useAction(_fn: unknown): (...args: unknown[]) => Promise<unknown> {
  return useCallback(async () => {
    return undefined;
  }, []);
}

export const api = new Proxy({} as Record<string, unknown>, {
  get: (_target, prop) => {
    if (typeof prop === "symbol") return undefined;
    return new Proxy(() => {}, {
      get: () => undefined,
      apply: () => undefined,
    });
  },
});
