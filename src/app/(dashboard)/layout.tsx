"use client"

import ConvexClientProvider from "@/components/providers/convex-provider"
import { AppLayout } from "@/components/layout/app-layout"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <AppLayout>{children}</AppLayout>
    </ConvexClientProvider>
  )
}
