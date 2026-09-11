"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Zap, CheckCircle2 } from "lucide-react"

export interface HookGeneratorProps {
  hooks: Hook[]
  onSelect?: (hook: Hook) => void
  onRegenerate?: () => void
  selectedHookId?: string
  isGenerating?: boolean
  className?: string
}

export interface Hook {
  id: string
  text: string
  type: "Curiosity" | "Question" | "Contrarian" | "Benefit" | "Story"
  score: number
}

const hookTypeColors: Record<Hook["type"], string> = {
  Curiosity: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  Question: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Contrarian: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Benefit: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Story: "bg-pink-500/10 text-pink-600 border-pink-500/20",
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : score >= 60
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
        : "bg-red-500/10 text-red-600 border-red-500/20"

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", color)}>
      {score}
    </span>
  )
}

export function HookGenerator({
  hooks,
  onSelect,
  onRegenerate,
  selectedHookId,
  isGenerating,
  className,
}: HookGeneratorProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            Ganchos Generados
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
        {hooks.map((hook) => (
          <button
            key={hook.id}
            onClick={() => onSelect?.(hook)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
              selectedHookId === hook.id
                ? "border-primary bg-primary/5"
                : "border-muted"
            )}
          >
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium leading-snug">{hook.text}</p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    hookTypeColors[hook.type]
                  )}
                >
                  {hook.type}
                </span>
                <ScoreBadge score={hook.score} />
              </div>
            </div>
            {selectedHookId === hook.id && (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
