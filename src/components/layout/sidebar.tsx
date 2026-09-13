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

const workspaces = [
  { id: "1", name: "Mi Marca", plan: "Pro" },
  { id: "2", name: "Proyecto Secundario", plan: "Gratis" },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [activeWorkspace, setActiveWorkspace] = React.useState(workspaces[0])
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)

  return (
    <div className={cn("flex h-full w-64 flex-col bg-slate-900 text-white", className)}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-700/50 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
          <Sparkles className="size-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">Auto Publisher IA</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-600/20 text-violet-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
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
      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
            {activeWorkspace.name.charAt(0)}
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm font-medium">{activeWorkspace.name}</span>
            <span className="text-xs text-slate-500">{activeWorkspace.plan}</span>
          </div>
          <ChevronDown
            className={cn(
              "size-4 text-slate-500 transition-transform",
              workspaceOpen && "rotate-180"
            )}
          />
        </button>
        {workspaceOpen && (
          <div className="mt-1 flex flex-col gap-0.5 pl-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActiveWorkspace(ws)
                  setWorkspaceOpen(false)
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeWorkspace.id === ws.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <span>{ws.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {ws.plan}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="border-t border-slate-700/50 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar size="sm">
            <AvatarImage src="/avatars/user.jpg" alt="Usuario" />
            <AvatarFallback className="bg-slate-700 text-slate-300">JD</AvatarFallback>
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
