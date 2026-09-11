"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Globe,
  Hash,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import type { SocialPlatform } from "@/types"

export interface PlatformAdaptationProps {
  adaptations: PlatformAdaptation[]
  className?: string
}

export interface PlatformAdaptation {
  platform: SocialPlatform
  hook: string
  caption: string
  hashtags: string[]
  cta: string
  score: number
}

const platformIcons: Record<SocialPlatform, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  x: "𝕏",
  youtube: "▶️",
  linkedin: "💼",
}

const platformColors: Record<SocialPlatform, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-600 text-white",
  x: "bg-black text-white",
  youtube: "bg-red-600 text-white",
  linkedin: "bg-blue-700 text-white",
}

export function PlatformAdaptation({ adaptations, className }: PlatformAdaptationProps) {
  if (adaptations.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Globe className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Aún no hay adaptaciones por plataforma
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-blue-500" />
          Adaptación por Plataforma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={adaptations[0]?.platform}>
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            {adaptations.map((adapt) => (
              <TabsTrigger key={adapt.platform} value={adapt.platform}>
                <span className="mr-1">{platformIcons[adapt.platform]}</span>
                {adapt.platform.charAt(0).toUpperCase() + adapt.platform.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {adaptations.map((adapt) => (
            <TabsContent
              key={adapt.platform}
              value={adapt.platform}
              className="mt-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    platformColors[adapt.platform]
                  )}
                >
                  {platformIcons[adapt.platform]}
                  {adapt.platform.charAt(0).toUpperCase() + adapt.platform.slice(1)}
                </span>
                <Badge variant={adapt.score >= 80 ? "outline" : "secondary"}>
                  Puntaje: {adapt.score}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Gancho</p>
                  <p className="rounded-lg bg-muted/50 p-3 text-sm font-medium">
                    {adapt.hook}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Epígrafe</p>
                  <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {adapt.caption}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Hash className="size-3" />
                    Hashtags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {adapt.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <MessageCircle className="size-3" />
                    Llamado a la Acción
                  </p>
                  <Badge variant="default" className="text-sm">
                    <Sparkles className="mr-1 size-3" />
                    {adapt.cta}
                  </Badge>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
