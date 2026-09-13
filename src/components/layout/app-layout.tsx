"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a14]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 border-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className={cn(
          "flex-1 overflow-y-auto p-6",
          "bg-gradient-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14]",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
