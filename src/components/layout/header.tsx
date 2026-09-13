"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Bell, Menu, LogOut, Settings, User, CreditCard } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onMenuToggle?: () => void
  className?: string
}

export function Header({ onMenuToggle, className }: HeaderProps) {
  const [searchValue, setSearchValue] = React.useState("")
  const notificationCount = 5
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header
      className={cn(
        "flex h-16 items-center gap-4 border-b border-white/5 px-6",
        "bg-[#0a0a14]/80 backdrop-blur-xl",
        className
      )}
    >
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
        onClick={onMenuToggle}
      >
        <Menu className="size-5" />
        <span className="sr-only">Alternar menú</span>
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          type="search"
          placeholder="Buscar contenido, campañas..."
          className="h-10 pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-violet-500/20"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="relative text-slate-400 hover:text-white hover:bg-white/10" />
            }
          >
            <Bell className="size-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
            <span className="sr-only">Notificaciones</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-[#1a1a2e] border-white/10">
            <DropdownMenuLabel className="flex items-center justify-between text-white">
              <span>Notificaciones</span>
              <Badge variant="secondary" className="text-xs bg-violet-500/20 text-violet-400 border-0">
                {notificationCount} nuevas
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 text-white hover:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="font-medium">Publicación publicada con éxito</span>
              </div>
              <span className="text-xs text-slate-500">hace 2 minutos</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 text-white hover:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-amber-500" />
                <span className="font-medium">Aprobación requerida</span>
              </div>
              <span className="text-xs text-slate-500">hace 15 minutos</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 text-white hover:bg-white/5">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-red-500" />
                <span className="font-medium">Error al publicar</span>
              </div>
              <span className="text-xs text-slate-500">hace 1 hora</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="w-full justify-center text-sm text-slate-400 hover:bg-white/5 hover:text-white">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-white hover:bg-white/10" />
            }
          >
              <Avatar size="sm">
                <AvatarImage src="/avatars/user.jpg" alt="Usuario" />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold">EW</AvatarFallback>
              </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#1a1a2e] border-white/10">
            <DropdownMenuLabel className="text-white">
              <div className="flex flex-col">
                <span className="font-medium">estudiowebpin</span>
                <span className="text-xs text-slate-500">{user?.email || ".usuario@email.com"}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-slate-300 hover:bg-white/5 hover:text-white">
              <User className="size-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 hover:bg-white/5 hover:text-white">
              <CreditCard className="size-4" />
              Facturación
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 hover:bg-white/5 hover:text-white">
              <Settings className="size-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem variant="destructive" onClick={handleLogout} className="text-red-400 hover:bg-red-500/10 hover:text-red-400">
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
