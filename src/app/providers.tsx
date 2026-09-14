"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { PWARegistration } from "@/components/pwa/pwa-registration";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl && !convexUrl.includes("placeholder")
  ? new ConvexReactClient(convexUrl)
  : null;

export function Providers({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <>
        <PWARegistration />
        {children}
      </>
    );
  }
  return (
    <>
      <PWARegistration />
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </>
  );
}
