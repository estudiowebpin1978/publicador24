"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Calendar,
  Zap,
  Users,
  Target,
  BarChart3,
  Hash,
  TrendingUp,
  CheckCircle,
  Settings,
  Key,
  ChevronDown,
  Sparkles,
  Palette,
  Briefcase,
  Bot,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const navItems: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Centro AI", href: "/ai-control", icon: Bot },
  { label: "Proyectos", href: "/projects", icon: Briefcase },
  { label: "Contenido", href: "/content", icon: FileText },
  { label: "Crear", href: "/content/create", icon: PlusCircle },
  { label: "Calendario", href: "/calendar", icon: Calendar },
  { label: "Piloto Automático", href: "/autopilot", icon: Zap },
  { label: "Cuentas", href: "/accounts", icon: Users },
  { label: "Campañas", href: "/campaigns", icon: Target },
  { label: "Analíticas", href: "/analytics", icon: BarChart3 },
  { label: "Hashtags", href: "/hashtags", icon: Hash },
  { label: "Tendencias", href: "/trends", icon: TrendingUp },
  { label: "Aprobación", href: "/approval", icon: CheckCircle, badge: 3 },
  { label: "Configuración API", href: "/setup", icon: Key },
  { label: "Brand Kit", href: "/brand-kit", icon: Palette },
  { label: "Configuración", href: "/settings", icon: Settings },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [activeWorkspace, setActiveWorkspace] = React.useState({ id: "1", name: "Mi Marca", plan: "Pro" })
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)

  return (
    <div className={cn(
      "flex h-full w-64 flex-col border-r border-white/5",
      "bg-gradient-to-b from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14]",
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
          <Sparkles className="size-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white">Auto Publisher</span>
          <span className="ml-1 text-xs font-medium text-violet-400">IA</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3 px-3">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-violet-500/15 text-violet-400 shadow-sm shadow-violet-500/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
                )}>
                  <item.icon className="size-4" />
                </div>
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Workspace Selector */}
      <div className="border-t border-white/5 p-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/5 hover:text-white"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-xs font-bold text-violet-400 border border-violet-500/20">
            {activeWorkspace.name.charAt(0)}
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm font-medium">{activeWorkspace.name}</span>
            <span className="text-xs text-slate-500">{activeWorkspace.plan}</span>
          </div>
          <ChevronDown
            className={cn(
              "size-4 text-slate-500 transition-transform duration-200",
              workspaceOpen && "rotate-180"
            )}
          />
        </button>
        {workspaceOpen && (
          <div className="mt-1 flex flex-col gap-0.5 pl-2">
            <button
              onClick={() => setWorkspaceOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <span>{activeWorkspace.name}</span>
              <Badge variant="secondary" className="ml-auto text-xs bg-violet-500/20 text-violet-400 border-0">
                {activeWorkspace.plan}
              </Badge>
            </button>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar size="sm">
            <AvatarImage src="/avatars/user.jpg" alt="Usuario" />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold">JD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">John Doe</span>
            <span className="text-xs text-slate-500">john@example.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
