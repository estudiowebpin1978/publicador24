"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, CheckCircle2 } from "lucide-react"

export interface TitleGeneratorProps {
  titles: Title[]
  onSelect?: (title: Title) => void
  onRegenerate?: () => void
  selectedTitleId?: string
  isGenerating?: boolean
  className?: string
}

export interface Title {
  id: string
  text: string
  score: number
  breakdown: {
    clarity: number
    curiosity: number
    relevance: number
    length: number
    platformFit: number
  }
}

export function TitleGenerator({
  titles,
  onSelect,
  onRegenerate,
  selectedTitleId,
  isGenerating,
  className,
}: TitleGeneratorProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
              T
            </span>
            Títulos Generados
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Regenerar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {titles.map((title) => (
          <div key={title.id} className="space-y-2">
            <button
              onClick={() => {
                onSelect?.(title)
                setExpandedId(expandedId === title.id ? null : title.id)
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                selectedTitleId === title.id
                  ? "border-primary bg-primary/5"
                  : "border-muted"
              )}
            >
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-snug">{title.text}</p>
                <div className="flex items-center gap-2">
                  <Progress value={title.score} className="max-w-32" />
                  <span className="text-xs text-muted-foreground">
                    {title.score}/100
                  </span>
                </div>
              </div>
              {selectedTitleId === title.id && (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              )}
            </button>

            {expandedId === title.id && (
              <div className="ml-3 space-y-2 rounded-lg border border-dashed p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Desglose del Puntaje
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(title.breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1 text-center">
                      <div className="text-xs text-muted-foreground capitalize">
                        {key === "platformFit" ? "Plataforma" : key}
                      </div>
                      <div className="text-sm font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
