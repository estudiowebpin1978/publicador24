"use client";

import { ReactNode } from "react";
import { PWARegistration } from "@/components/pwa/pwa-registration";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <PWARegistration />
      {children}
    </>
  );
}
