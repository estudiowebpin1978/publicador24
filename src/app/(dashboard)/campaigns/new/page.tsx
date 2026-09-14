"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Send,
  CheckCircle2,
  Copy,
  RefreshCw,
  Eye,
  Zap,
  Target,
  Users,
  Palette,
  Calendar,
  BarChart3,
  Lightbulb,
  Megaphone,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Shield,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"

const STEPS = [
  { id: "idea", label: "Idea", icon: Lightbulb },
  { id: "objective", label: "Objetivo", icon: Target },
  { id: "audience", label: "Público", icon: Users },
  { id: "style", label: "Estilo", icon: Palette },
  { id: "references", label: "Imágenes", icon: ImageIcon },
  { id: "generate", label: "Generar", icon: Sparkles },
  { id: "review", label: "Revisar", icon: Eye },
  { id: "adapt", label: "Plataformas", icon: Megaphone },
  { id: "schedule", label: "Programar", icon: Calendar },
  { id: "publish", label: "Publicar", icon: Send },
] as const

interface CampaignWizardState {
  currentStep: number
  idea: string
  product: string
  objective: string
  audience: string
  platforms: string[]
  style: string
  offer: string
  url: string
  referenceImages: string[]
  contentCount: number
  generatedCampaign: any | null
  selectedPieces: string[]
  isGenerating: boolean
}

const initialState: CampaignWizardState = {
  currentStep: 0,
  idea: "",
  product: "",
  objective: "",
  audience: "",
  platforms: ["instagram", "facebook"],
  style: "profesional",
  offer: "",
  url: "",
  referenceImages: [],
  contentCount: 30,
  generatedCampaign: null,
  selectedPieces: [],
  isGenerating: false,
}

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📸", color: "bg-pink-500" },
  { id: "facebook", name: "Facebook", icon: "👤", color: "bg-blue-600" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "bg-black" },
  { id: "x", name: "X (Twitter)", icon: "𝕏", color: "bg-black" },
  { id: "youtube", name: "YouTube", icon: "▶️", color: "bg-red-600" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "bg-blue-700" },
]

const STYLES = [
  { id: "profesional", name: "Profesional", description: "Tono serio y confiable" },
  { id: "casual", name: "Casual", description: "Tono relajado y cercano" },
  { id: "divertido", name: "Divertido", description: "Tono humorístico y entretenido" },
  { id: "emocional", name: "Emocional", description: "Tono inspirador y emotivo" },
  { id: "urgente", name: "Urgente", description: "Tono de acción inmediata" },
  { id: "educativo", name: "Educativo", description: "Tono informativo y de valor" },
]

const CONTENT_TYPES = [
  { type: "educational", label: "Educativo", icon: BookOpen, color: "text-blue-500", description: "Contenido que enseña y aporta valor" },
  { type: "capture", label: "Captación", icon: Target, color: "text-green-500", description: "Contenido que genera interés" },
  { type: "objection", label: "Objeciones", icon: MessageSquare, color: "text-yellow-500", description: "Resuelve dudas y objeciones" },
  { type: "authority", label: "Autoridad", icon: Shield, color: "text-purple-500", description: "Posiciona como experto" },
  { type: "conversion", label: "Conversión", icon: TrendingUp, color: "text-red-500", description: "Genera ventas o consultas" },
]

export default function CampaignWizardPage() {
  const [state, setState] = React.useState<CampaignWizardState>(initialState)

  const setStep = (step: number) =>
    setState((prev) => ({ ...prev, currentStep: Math.max(0, Math.min(step, STEPS.length - 1)) }))

  const handleGenerate = async () => {
    setState((prev) => ({ ...prev, isGenerating: true }))
    try {
      const response = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: state.product || state.idea,
          website: state.url || undefined,
          description: state.idea,
          objective: state.objective,
          platforms: state.platforms,
          frequency: "diaria",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al generar")
      }

      setState((prev) => ({
        ...prev,
        generatedCampaign: result.campaign,
        selectedPieces: (result.campaign?.contentPieces || []).map((p: Record<string, unknown>) => String(p._id || "")),
        currentStep: 6,
        isGenerating: false,
      }))
    } catch (error) {
      console.error("Failed to generate campaign:", error)
      setState((prev) => ({ ...prev, isGenerating: false }))
    }
  }

  const togglePieceSelection = (pieceId: string) => {
    setState((prev) => ({
      ...prev,
      selectedPieces: prev.selectedPieces.includes(pieceId)
        ? prev.selectedPieces.filter((id) => id !== pieceId)
        : [...prev.selectedPieces, pieceId],
    }))
  }

  const toggleAllPieces = () => {
    if (!state.generatedCampaign) return
    const allSelected = state.selectedPieces.length === state.generatedCampaign.pieces.length
    setState((prev) => ({
      ...prev,
      selectedPieces: allSelected ? [] : prev.generatedCampaign.pieces.map((p: any) => p.id),
    }))
  }

  const canGoNext = () => {
    switch (state.currentStep) {
      case 0: return state.idea.length > 10
      case 1: return state.objective.length > 5
      case 2: return true
      case 3: return state.platforms.length > 0
      case 4: return true
      case 5: return true
      case 6: return state.selectedPieces.length > 0
      case 7: return true
      case 8: return true
      default: return false
    }
  }

  const getPiecesByType = (type: string) => {
    if (!state.generatedCampaign) return []
    return state.generatedCampaign.pieces.filter((p: any) => p.contentType === type)
  }

  const getPiecesByPlatform = (platform: string) => {
    if (!state.generatedCampaign) return []
    return state.generatedCampaign.pieces.filter((p: any) => p.platform === platform)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crear Campaña con IA</h1>
          <p className="text-muted-foreground">
            Transformá tu idea en una campaña completa de contenido
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => i <= state.currentStep && setStep(i)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  i === state.currentStep
                    ? "bg-primary text-primary-foreground"
                    : i < state.currentStep
                      ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                      : "text-muted-foreground cursor-default"
                )}
                disabled={i > state.currentStep}
              >
                {i < state.currentStep ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 flex-shrink-0",
                    i < state.currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div className="min-h-[500px]">
        {state.currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-5 text-yellow-500" />
                ¿Qué querés promocionar?
              </CardTitle>
              <CardDescription>
                Escribí tu idea. La IA va a encargarse de todo lo demás.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idea">Tu idea *</Label>
                <Textarea
                  id="idea"
                  placeholder="Ejemplo: Quiero conseguir clientes para instalación de climatizadores de piscinas en Rosario"
                  value={state.idea}
                  onChange={(e) => setState((prev) => ({ ...prev, idea: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Producto o servicio</Label>
                <Input
                  id="product"
                  placeholder="Ejemplo: Climatización de piscinas"
                  value={state.product}
                  onChange={(e) => setState((prev) => ({ ...prev, product: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer">Oferta especial (opcional)</Label>
                <Input
                  id="offer"
                  placeholder="Ejemplo: 20% de descuento en la primera instalación"
                  value={state.offer}
                  onChange={(e) => setState((prev) => ({ ...prev, offer: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Sitio web (opcional)</Label>
                <Input
                  id="url"
                  placeholder="Ejemplo: https://tusitio.com"
                  value={state.url}
                  onChange={(e) => setState((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5 text-green-500" />
                Objetivo de la campaña
              </CardTitle>
              <CardDescription>
                ¿Qué querés lograr con esta campaña?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo principal *</Label>
                <Textarea
                  id="objective"
                  placeholder="Ejemplo: Generar consultas comerciales de gente que necesita climatizar su piscina antes del verano"
                  value={state.objective}
                  onChange={(e) => setState((prev) => ({ ...prev, objective: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-blue-500" />
                Público objetivo
              </CardTitle>
              <CardDescription>
                ¿A quién le querés llegar? La IA puede inferir esto si no lo sabés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audience">Público objetivo (opcional)</Label>
                <Textarea
                  id="audience"
                  placeholder="Ejemplo: Propietarios de piscinas en Rosario, 30-55 años, nivel socioeconómico medio-alto"
                  value={state.audience}
                  onChange={(e) => setState((prev) => ({ ...prev, audience: e.target.value }))}
                  className="min-h-[80px]"
                />
                <p className="text-sm text-muted-foreground">
                  Si lo dejás vacío, la IA va a inferir el público más adecuado para tu idea.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="size-5 text-purple-500" />
                  Estilo de comunicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setState((prev) => ({ ...prev, style: style.id }))}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left transition-all",
                        state.style === style.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <div className="font-medium">{style.name}</div>
                      <div className="text-sm text-muted-foreground">{style.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="size-5 text-red-500" />
                  Plataformas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setState((prev) => ({
                          ...prev,
                          platforms: prev.platforms.includes(platform.id)
                            ? prev.platforms.filter((p) => p !== platform.id)
                            : [...prev.platforms, platform.id],
                        }))
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
                        state.platforms.includes(platform.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{platform.icon}</span>
                      <div className="font-medium">{platform.name}</div>
                      {state.platforms.includes(platform.id) && (
                        <CheckCircle2 className="ml-auto size-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cantidad de piezas de contenido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={state.contentCount}
                    onChange={(e) => setState((prev) => ({ ...prev, contentCount: parseInt(e.target.value) || 30 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Recomendado: 30 piezas (10 educativas + 8 captación + 5 objeciones + 4 autoridad + 3 conversión)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state.currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-yellow-500" />
                Generar campaña con IA
              </CardTitle>
              <CardDescription>
                Revisá tu configuración y generá la campaña completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div><strong>Idea:</strong> {state.idea}</div>
                {state.product && <div><strong>Producto:</strong> {state.product}</div>}
                <div><strong>Objetivo:</strong> {state.objective}</div>
                {state.audience && <div><strong>Público:</strong> {state.audience}</div>}
                <div><strong>Estilo:</strong> {STYLES.find(s => s.id === state.style)?.name}</div>
                <div><strong>Plataformas:</strong> {state.platforms.map(p => PLATFORMS.find(pl => pl.id === p)?.name).join(", ")}</div>
                <div><strong>Piezas:</strong> {state.contentCount}</div>
                {state.referenceImages.length > 0 && (
                  <div><strong>Imágenes de referencia:</strong> {state.referenceImages.length} imagen(es)</div>
                )}
                {state.offer && <div><strong>Oferta:</strong> {state.offer}</div>}
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 text-primary font-medium mb-2">
                  <Zap className="size-4" />
                  La IA va a generar automáticamente:
                </div>
                <ul className="text-sm space-y-1 ml-6">
                  <li>• Estrategia completa de campaña</li>
                  <li>• {state.contentCount} piezas de contenido únicas</li>
                  <li>• Adaptación por plataforma</li>
                  <li>• Prompts de imagen para cada pieza</li>
                  <li>• Hashtags y CTAs optimizados</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 5 && state.generatedCampaign && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-500" />
                  Campaña generada: {state.generatedCampaign.strategy.campaignName}
                </CardTitle>
                <CardDescription>
                  Se generaron {state.generatedCampaign.totalGenerated} piezas de contenido.
                  Seleccioná las que querés programar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div><strong>Objetivo:</strong> {state.generatedCampaign.strategy.objective}</div>
                  <div><strong>Público:</strong> {state.generatedCampaign.strategy.targetAudience}</div>
                  <div><strong>Propuesta de valor:</strong> {state.generatedCampaign.strategy.valueProposition}</div>
                  <div><strong>Ángulo:</strong> {state.generatedCampaign.strategy.communicationAngle}</div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {state.selectedPieces.length} de {state.generatedCampaign.pieces.length} seleccionadas
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleAllPieces}>
                    {state.selectedPieces.length === state.generatedCampaign.pieces.length
                      ? "Deseleccionar todas"
                      : "Seleccionar todas"}
                  </Button>
                </div>

                <div className="space-y-6">
                  {CONTENT_TYPES.map((ct) => {
                    const pieces = getPiecesByType(ct.type)
                    if (pieces.length === 0) return null
                    const Icon = ct.icon
                    return (
                      <div key={ct.type}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={cn("size-4", ct.color)} />
                          <span className="font-medium">{ct.label}</span>
                          <Badge variant="secondary">{pieces.length}</Badge>
                          <span className="text-sm text-muted-foreground">— {ct.description}</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {pieces.map((piece: any) => (
                            <div
                              key={piece.id}
                              className={cn(
                                "rounded-lg border-2 p-4 transition-all cursor-pointer",
                                state.selectedPieces.includes(piece.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-primary/50"
                              )}
                              onClick={() => togglePieceSelection(piece.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={state.selectedPieces.includes(piece.id)}
                                    onCheckedChange={() => togglePieceSelection(piece.id)}
                                  />
                                  <Badge variant="outline" className="text-xs">
                                    {piece.platform}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {piece.score}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRegeneratePiece(piece.id)
                                    }}
                                  >
                                    <RefreshCw className="size-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="font-medium text-sm mb-1">{piece.hook}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {piece.body}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {piece.hashtags.slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-primary font-medium">
                                CTA: {piece.cta}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state.currentStep === 6 && state.generatedCampaign && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="size-5 text-blue-500" />
                Adaptación por plataforma
              </CardTitle>
              <CardDescription>
                Cada pieza se adapta automáticamente al formato de cada plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.platforms.map((platform) => {
                const platformInfo = PLATFORMS.find((p) => p.id === platform)
                const pieces = getPiecesByPlatform(platform)
                return (
                  <div key={platform} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{platformInfo?.icon}</span>
                      <span className="font-medium">{platformInfo?.name}</span>
                      <Badge variant="secondary">{pieces.length} piezas</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {platform === "x" && "Captions cortos (máx. 280 caracteres), hashtags limitados"}
                      {platform === "instagram" && "Visual + hook + caption + hashtags (máx. 2200 caracteres)"}
                      {platform === "facebook" && "Más contexto,CTA claro, communauté engagement"}
                      {platform === "tiktok" && "Hook rápido, lenguaje natural, texto en pantalla"}
                      {platform === "youtube" && "Título optimizado, descripción detallada,CTA en suscripción"}
                      {platform === "linkedin" && "Tono profesional, insights de industria, storytelling"}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {state.currentStep === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-orange-500" />
                Programar publicaciones
              </CardTitle>
              <CardDescription>
                Elegí cuándo publicar cada pieza de contenido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  Las {state.selectedPieces.length} piezas seleccionadas se programarán
                  automáticamente distribuidas a lo largo de la próxima semana.
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  La IA recomienda los mejores horarios para cada plataforma basándose en datos de engagement.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 9 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="size-5 text-green-500" />
                Publicar contenido
              </CardTitle>
              <CardDescription>
                Revisá y publicá tu campaña.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="font-medium mb-2">Resumen de la campaña:</div>
                <ul className="text-sm space-y-1">
                  <li>• Campaña: {state.generatedCampaign?.strategy.campaignName}</li>
                  <li>• Piezas seleccionadas: {state.selectedPieces.length}</li>
                  <li>• Plataformas: {state.platforms.map(p => PLATFORMS.find(pl => pl.id === p)?.name).join(", ")}</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" size="lg">
                  <Send className="size-4 mr-2" />
                  Publicar ahora
                </Button>
                <Button variant="outline" className="flex-1" size="lg">
                  <Calendar className="size-4 mr-2" />
                  Programar para después
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(state.currentStep - 1)}
          disabled={state.currentStep === 0}
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Button>

        <div className="flex gap-2">
        {state.currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="size-5 text-pink-500" />
                Imágenes de referencia
              </CardTitle>
              <CardDescription>
                Subí imágenes que representen el estilo visual que querés para tu campaña.
                La IA las usará como inspiración para generar imágenes consistentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-white/10 p-8 text-center hover:border-violet-500/30 transition-colors">
                <ImageIcon className="mx-auto size-12 text-slate-500 mb-4" />
                <p className="text-sm text-slate-400 mb-2">
                  Arrastrá imágenes aquí o hacé click para seleccionar
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Formatos: JPG, PNG, WebP. Máximo 5MB por imagen.
                </p>
                <input
                  type="file"
                  id="reference-images"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach(file => {
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const result = ev.target?.result as string
                        if (result) {
                          setState(prev => ({
                            ...prev,
                            referenceImages: [...prev.referenceImages, result]
                          }))
                        }
                      }
                      reader.readAsDataURL(file)
                    })
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('reference-images')?.click()}
                  className="border-white/10 bg-white/5 hover:bg-white/10"
                >
                  <ImageIcon className="size-4 mr-2" />
                  Seleccionar imágenes
                </Button>
              </div>

              {state.referenceImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Imágenes seleccionadas ({state.referenceImages.length})</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {state.referenceImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10">
                        <img
                          src={img}
                          alt={`Referencia ${idx + 1}`}
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              referenceImages: prev.referenceImages.filter((_, i) => i !== idx)
                            }))
                          }}
                          className="absolute top-2 right-2 size-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-sm text-slate-400">
                  <strong className="text-white">Tip:</strong> Subí imágenes de tu marca, productos,
                  o ejemplos de contenido que te guste. La IA generará imágenes con un estilo visual similar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {state.currentStep === 5 && (
            <Button onClick={handleGenerate} disabled={state.isGenerating} size="lg">
              {state.isGenerating ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Generando campaña...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Generar campaña con IA
                </>
              )}
            </Button>
          )}

          {state.currentStep < 5 && (
            <Button onClick={() => setStep(state.currentStep + 1)} disabled={!canGoNext()}>
              Siguiente
              <ArrowRight className="size-4" />
            </Button>
          )}

          {state.currentStep === 6 && (
            <Button onClick={() => setStep(7)} disabled={state.selectedPieces.length === 0}>
              Adaptar para plataformas
              <ArrowRight className="size-4" />
            </Button>
          )}

          {state.currentStep === 7 && (
            <Button onClick={() => setStep(8)}>
              Programar
              <ArrowRight className="size-4" />
            </Button>
          )}

        {state.currentStep === 8 && (
            <Button onClick={() => setStep(9)}>
              Revisar y publicar
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
