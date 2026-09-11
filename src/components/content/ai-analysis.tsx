"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Brain,
  Tag,
  Users,
  Target,
  MessageSquare,
  TrendingUp,
  Folder,
} from "lucide-react"

export interface AIAnalysisProps {
  analysis: AIAnalysisResult | null
  className?: string
}

export interface AIAnalysisResult {
  topic: string
  entities: string[]
  keywords: string[]
  intent: string
  sentiment: "positive" | "neutral" | "negative"
  audience: string
  category: string
}

function SentimentMeter({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const config = {
    positive: { label: "Positivo", color: "bg-green-500", width: "90%" },
    neutral: { label: "Neutral", color: "bg-amber-500", width: "50%" },
    negative: { label: "Negativo", color: "bg-red-500", width: "20%" },
  }
  const { label, color, width } = config[sentiment]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Sentimiento</span>
        <Badge variant={sentiment === "positive" ? "outline" : "secondary"}>
          {label}
        </Badge>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width }}
        />
      </div>
    </div>
  )
}

export function AIAnalysis({ analysis, className }: AIAnalysisProps) {
  if (!analysis) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Brain className="size-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Subí o ingresá contenido para ver el análisis de IA
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-4 text-violet-500" />
          Análisis IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Target className="size-4 text-blue-500" />
            <span className="text-muted-foreground">Tema</span>
          </div>
          <p className="text-sm font-medium">{analysis.topic}</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Tag className="size-4 text-emerald-500" />
            <span className="text-muted-foreground">Entidades</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.entities.map((entity) => (
              <Badge key={entity} variant="secondary">
                {entity}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4 text-orange-500" />
            <span className="text-muted-foreground">Palabras Clave</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4 text-cyan-500" />
              <span className="text-muted-foreground">Intención</span>
            </div>
            <p className="text-sm font-medium">{analysis.intent}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-pink-500" />
              <span className="text-muted-foreground">Audiencia</span>
            </div>
            <p className="text-sm font-medium">{analysis.audience}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Folder className="size-4 text-indigo-500" />
            <span className="text-muted-foreground">Categoría</span>
          </div>
          <p className="text-sm font-medium">{analysis.category}</p>
        </div>

        <Separator />

        <SentimentMeter sentiment={analysis.sentiment} />
      </CardContent>
    </Card>
  )
}
