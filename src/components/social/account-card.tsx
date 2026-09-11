"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  RefreshCw,
  Unplug,
  ExternalLink,
  Clock,
  Shield,
} from "lucide-react"
import {
  InstagramIcon,
  TwitterIcon,
  FacebookIcon,
  YoutubeIcon,
  LinkedinIcon,
  TiktokIcon,
} from "@/components/ui/social-icons"

interface AccountCardProps {
  platform: string
  name: string
  username: string
  avatar?: string
  status: "connected" | "disconnected" | "error"
  tokenStatus: "valid" | "expiring" | "expired"
  lastPost?: string
  permissions?: string[]
  onConnect?: () => void
  onReconnect?: () => void
  onDisconnect?: () => void
  className?: string
}

const platformConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  instagram: { icon: InstagramIcon, color: "text-pink-500" },
  x: { icon: TwitterIcon, color: "text-sky-500" },
  facebook: { icon: FacebookIcon, color: "text-blue-600" },
  youtube: { icon: YoutubeIcon, color: "text-red-600" },
  linkedin: { icon: LinkedinIcon, color: "text-blue-700" },
  tiktok: { icon: TiktokIcon, color: "text-foreground" },
}

const tokenStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  valid: { label: "Token Válido", variant: "outline" },
  expiring: { label: "Token por Expirar", variant: "secondary" },
  expired: { label: "Token Expirado", variant: "destructive" },
}

export function AccountCard({
  platform,
  name,
  username,
  status,
  tokenStatus,
  lastPost,
  permissions = [],
  onConnect,
  onReconnect,
  onDisconnect,
  className,
}: AccountCardProps) {
  const config = platformConfig[platform]
  const Icon = config?.icon || ExternalLink

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex size-10 items-center justify-center rounded-xl bg-muted", config?.color)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{username}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "disconnected" ? (
                <DropdownMenuItem onClick={onConnect}>
                  <ExternalLink className="size-4" />
                  Conectar
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={onReconnect}>
                    <RefreshCw className="size-4" />
                    Reconectar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onDisconnect}>
                    <Unplug className="size-4" />
                    Desconectar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={status === "connected" ? "outline" : "secondary"}>
            {status === "connected" ? "Conectado" : "Desconectado"}
          </Badge>
          <Badge variant={tokenStatusConfig[tokenStatus]?.variant || "secondary"}>
            <Shield className="size-3" />
            {tokenStatusConfig[tokenStatus]?.label || tokenStatus}
          </Badge>
        </div>

        {lastPost && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Última publicación: {lastPost}
          </div>
        )}

        {permissions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {permissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="text-xs">
                {perm}
              </Badge>
            ))}
          </div>
        )}

        {status === "disconnected" && (
          <Button onClick={onConnect} className="w-full" size="sm">
            Conectar Cuenta
          </Button>
        )}
        {status === "error" && (
          <Button onClick={onReconnect} variant="outline" className="w-full" size="sm">
            <RefreshCw className="size-4" />
            Reconectar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
