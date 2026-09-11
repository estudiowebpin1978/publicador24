"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Clock,
  Send,
  Timer,
  Zap,
} from "lucide-react"
import type { SocialPlatform } from "@/types"

export interface SchedulePanelProps {
  recommendations: BestTimeRecommendation[]
  onSchedule?: (data: ScheduleData) => void
  onPublishNow?: () => void
  className?: string
}

export interface BestTimeRecommendation {
  platform: SocialPlatform
  bestTimes: string[]
  frequency: string
}

export interface ScheduleData {
  date: string
  time: string
  platforms: SocialPlatform[]
}

const platformEmoji: Record<SocialPlatform, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  x: "𝕏",
  youtube: "▶️",
  linkedin: "💼",
}

export function SchedulePanel({
  recommendations,
  onSchedule,
  onPublishNow,
  className,
}: SchedulePanelProps) {
  const [mode, setMode] = React.useState<"now" | "schedule">("now")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>(
    recommendations.map((r) => r.platform)
  )

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSchedule = () => {
    if (date && time) {
      onSchedule?.({ date, time, platforms: selectedPlatforms })
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-4 text-blue-500" />
          Programar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-2">
          <Button
            variant={mode === "now" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("now")}
          >
            <Zap className="size-3.5" />
            Publicar Ahora
          </Button>
          <Button
            variant={mode === "schedule" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("schedule")}
          >
            <Timer className="size-3.5" />
            Programar
          </Button>
        </div>

        {mode === "schedule" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Fecha</Label>
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Hora</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Plataformas</Label>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((rec) => (
              <Button
                key={rec.platform}
                variant={
                  selectedPlatforms.includes(rec.platform) ? "default" : "outline"
                }
                size="sm"
                onClick={() => togglePlatform(rec.platform)}
              >
                {platformEmoji[rec.platform]}
                {rec.platform.charAt(0).toUpperCase() + rec.platform.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            <Clock className="mr-1 inline size-3.5" />
            Mejores Horarios Recomendados
          </p>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={rec.platform}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span>{platformEmoji[rec.platform]}</span>
                  <span className="text-sm font-medium capitalize">
                    {rec.platform}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {rec.bestTimes.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {rec.frequency}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={mode === "now" ? onPublishNow : handleSchedule}
          disabled={mode === "schedule" && (!date || !time)}
        >
          {mode === "now" ? (
            <>
              <Send className="size-4" />
              Publicar Ahora
            </>
          ) : (
            <>
              <Calendar className="size-4" />
              Programar Publicación
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
