"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sparkles, AlertTriangle, Clock, Target, RefreshCw } from "lucide-react"

interface AIGeneratorProps {
  onGenerated?: (content: GeneratedContent) => void
  className?: string
}

interface GeneratedContent {
  original: string
  variants: Record<string, string>
  hashtags: string[]
  mentions: string[]
  score: number
  risk: string
  bestTime: string
}

export function AIGenerator({ onGenerated, className }: AIGeneratorProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generated, setGenerated] = React.useState<GeneratedContent | null>(null)
  const [form, setForm] = React.useState({
    topic: "",
    objective: "",
    audience: "",
    language: "en",
    tone: "professional",
    platforms: [] as string[],
    duration: "medium",
    cta: "",
    hashtags: "",
    mentions: "",
  })

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          objective: form.objective,
          audience: form.audience,
          language: form.language,
          tone: form.tone,
          platforms: form.platforms,
          cta: form.cta,
        }),
      })

      if (!res.ok) throw new Error("Generation failed")

      const data = await res.json()
      const generated: GeneratedContent = {
        original: data.original || "",
        variants: data.variants || {},
        hashtags: data.hashtags || [],
        mentions: data.mentions || [],
        score: data.score || 75,
        risk: data.risk || "low",
        bestTime: data.bestTime || "9:00 AM - 11:00 AM",
      }

      setGenerated(generated)
      onGenerated?.(generated)
    } catch {
      setGenerated({
        original: `Contenido sobre ${form.topic || "tu tema"}`,
        variants: {},
        hashtags: form.hashtags ? form.hashtags.split(",").map(h => h.trim()) : [],
        mentions: form.mentions ? form.mentions.split(",").map(m => m.trim()) : [],
        score: 70,
        risk: "low",
        bestTime: "9:00 AM - 11:00 AM",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              Generación de Contenido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Tema / Asunto *</Label>
              <Input
                id="topic"
                placeholder="ej: Lanzamiento de nuevo producto, Promoción de vacaciones"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="awareness">Reconocimiento de Marca</SelectItem>
                  <SelectItem value="engagement">Interacción</SelectItem>
                  <SelectItem value="traffic">Generar Tráfico</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                  <SelectItem value="education">Educación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Público Objetivo</Label>
              <Input
                id="audience"
                placeholder="ej: Jóvenes profesionales, Entusiastas de la tecnología"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v ?? "en" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Inglés</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Francés</SelectItem>
                    <SelectItem value="de">Alemán</SelectItem>
                    <SelectItem value="pt">Portugués</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tono</Label>
                <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v ?? "professional" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profesional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="funny">Divertido</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="inspirational">Inspiracional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Plataformas</Label>
              <div className="flex flex-wrap gap-2">
                {["instagram", "tiktok", "x", "facebook", "linkedin", "youtube"].map((platform) => (
                  <Button
                    key={platform}
                    variant={form.platforms.includes(platform) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Longitud del Contenido</Label>
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v ?? "medium" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Corto (50-100 palabras)</SelectItem>
                  <SelectItem value="medium">Medio (100-200 palabras)</SelectItem>
                  <SelectItem value="long">Largo (200-500 palabras)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Llamado a la Acción</Label>
              <Input
                id="cta"
                placeholder="ej: Comprar ahora, Saber más, Registrarse"
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags (separados por coma)</Label>
              <Input
                id="hashtags"
                placeholder="ej: #marketing, #negocios, #consejos"
                value={form.hashtags}
                onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mentions">Menciones (separadas por coma)</Label>
              <Input
                id="mentions"
                placeholder="ej: @marca, @socio"
                value={form.mentions}
                onChange={(e) => setForm({ ...form, mentions: e.target.value })}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!form.topic || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generar con IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content */}
        <div className="space-y-4">
          {generated ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Contenido Original</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                    {generated.original}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Variantes por Plataforma</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(generated.variants).map(([platform, content]) => (
                    <div key={platform} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {platform}
                      </p>
                      <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
                        {content}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Análisis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Puntaje de Interacción</span>
                      <span className="font-medium">{generated.score}/100</span>
                    </div>
                    <Progress value={generated.score} />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className={cn(
                        "size-4",
                        generated.risk === "low" ? "text-green-500" : "text-amber-500"
                      )} />
                      <span className="text-muted-foreground">Riesgo:</span>
                      <Badge variant={generated.risk === "low" ? "outline" : "secondary"}>
                        {generated.risk}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-blue-500" />
                      <span className="text-muted-foreground">Mejor horario:</span>
                      <span className="font-medium">{generated.bestTime}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {generated.hashtags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  {generated.mentions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Menciones</p>
                      <div className="flex flex-wrap gap-1">
                        {generated.mentions.map((mention) => (
                          <Badge key={mention} variant="outline">{mention}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <CardContent className="space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
                  <Target className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Completá el formulario y hacé clic en &quot;Generar con IA&quot; para crear contenido
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
