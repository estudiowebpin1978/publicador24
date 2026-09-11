"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  TrendingUp,
} from "lucide-react"
import type { SpamRiskLevel } from "@/types"

export interface ContentScoringProps {
  score: ContentScore
  className?: string
}

export interface ContentScore {
  overall: number
  breakdown: {
    hook: number
    relevance: number
    clarity: number
    emotion: number
    trend: number
    hashtags: number
    platform_fit: number
    cta: number
  }
  spamRisk: SpamRiskLevel
  platformValidation: { platform: string; valid: boolean; issues: string[] }[]
  explanation: string
  suggestions: string[]
}

const spamRiskConfig: Record<
  SpamRiskLevel,
  { color: string; icon: React.ElementType; label: string }
> = {
  LOW: { color: "text-green-500", icon: CheckCircle2, label: "Riesgo Bajo" },
  MEDIUM: { color: "text-amber-500", icon: AlertTriangle, label: "Riesgo Medio" },
  HIGH: { color: "text-orange-500", icon: AlertTriangle, label: "Riesgo Alto" },
  CRITICAL: { color: "text-red-500", icon: XCircle, label: "Riesgo Crítico" },
}

function BreakdownBar({
  label,
  value,
  max = 100,
}: {
  label: string
  value: number
  max?: number
}) {
  const pct = Math.round((value / max) * 100)
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 60
        ? "bg-amber-500"
        : "bg-red-500"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-muted-foreground">
          {label.replace("_", " ")}
        </span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-amber-500" : "stroke-red-500"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          className={cn(color, "transition-all duration-700")}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

export function ContentScoring({ score, className }: ContentScoringProps) {
  const spam = spamRiskConfig[score.spamRisk]
  const SpamIcon = spam.icon

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-4 text-emerald-500" />
          Puntaje y Seguridad del Contenido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <ScoreCircle score={score.overall} />

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Desglose</p>
              {Object.entries(score.breakdown).map(([key, value]) => (
                <BreakdownBar key={key} label={key} value={value} />
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Riesgo de Spam</p>
          <div className="flex items-center gap-2">
            <SpamIcon className={cn("size-5", spam.color)} />
            <Badge
              variant={score.spamRisk === "LOW" ? "outline" : "secondary"}
              className={spam.color}
            >
              {spam.label}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Validación por Plataforma
          </p>
          <div className="space-y-2">
            {score.platformValidation.map((pv) => (
              <div
                key={pv.platform}
                className="flex items-center justify-between rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-2">
                  {pv.valid ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {pv.platform}
                  </span>
                </div>
                {pv.issues.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {pv.issues.length} problema{pv.issues.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Explicación</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {score.explanation}
          </p>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3.5" />
            Sugerencias
          </p>
          <ul className="space-y-1.5">
            {score.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-sm"
              >
                <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
