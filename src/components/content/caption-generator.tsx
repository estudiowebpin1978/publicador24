"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Copy } from "lucide-react"

export interface CaptionGeneratorProps {
  captions: CaptionVariant[]
  onSelect?: (caption: CaptionVariant) => void
  selectedCaptionId?: string
  className?: string
}

export interface CaptionVariant {
  id: string
  style: string
  text: string
  wordCount: number
  score: number
}

export function CaptionGenerator({
  captions,
  onSelect,
  selectedCaptionId,
  className,
}: CaptionGeneratorProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const styleLabels: Record<string, string> = {
    Original: "Original",
    Short: "Corto",
    Long: "Largo",
    Storytelling: "Narrativa",
    Educational: "Educativo",
    Promotional: "Promocional",
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
            C
          </span>
          Variantes de Epígrafe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={captions[0]?.style.toLowerCase()}>
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            {captions.map((caption) => (
              <TabsTrigger
                key={caption.id}
                value={caption.style.toLowerCase()}
              >
                {styleLabels[caption.style] || caption.style}
              </TabsTrigger>
            ))}
          </TabsList>

          {captions.map((caption) => (
            <TabsContent
              key={caption.id}
              value={caption.style.toLowerCase()}
              className="mt-4 space-y-3"
            >
              <div
                className={cn(
                  "rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap",
                  selectedCaptionId === caption.id && "border-primary bg-primary/5"
                )}
              >
                {caption.text}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {caption.wordCount} palabras
                  </span>
                  <Badge variant={caption.score >= 80 ? "outline" : "secondary"}>
                    Puntaje: {caption.score}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(caption.text, caption.id)}
                  >
                    {copiedId === caption.id ? (
                      <CheckCircle2 className="size-3.5 text-green-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copiedId === caption.id ? "Copiado" : "Copiar"}
                  </Button>

                  <Button
                    variant={selectedCaptionId === caption.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelect?.(caption)}
                  >
                    {selectedCaptionId === caption.id && (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    Seleccionar
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
