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
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

const STEPS = [
  { id: "idea", label: "Idea", icon: Lightbulb },
  { id: "objective", label: "Objetivo", icon: Target },
  { id: "audience", label: "Público", icon: Users },
  { id: "style", label: "Estilo", icon: Palette },
  { id: "generate", label: "Generar", icon: Sparkles },
  { id: "review", label: "Revisar", icon: Eye },
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
  contentCount: number
  generatedCampaign: any | null
  selectedPieces: string[]
  isGenerating: boolean
  isPersisting: boolean
  campaignId: string | null
  isScheduling: boolean
  scheduledCount: number
  isPublishing: boolean
  publishedCount: number
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
  contentCount: 30,
  generatedCampaign: null,
  selectedPieces: [],
  isGenerating: false,
  isPersisting: false,
  campaignId: null,
  isScheduling: false,
  scheduledCount: 0,
  isPublishing: false,
  publishedCount: 0,
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
  const router = useRouter()
  const createCampaign = useMutation(api.campaigns.create)
  const updateCampaign = useMutation(api.campaigns.update)
  const createContentPack = useMutation(api.contentPacks.create)
  const createContentPiece = useMutation(api.contentPieces.create)
  const updatePieceStatus = useMutation(api.contentPieces.updateStatus)

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

      const campaign = result.campaign
      const pieces = campaign?.contentPieces || []

      setState((prev) => ({
        ...prev,
        generatedCampaign: campaign,
        selectedPieces: pieces.map((p: any, i: number) => String(p.generatedContent?.hook || `piece-${i}`)),
        currentStep: 5,
        isGenerating: false,
      }))
    } catch (error) {
      console.error("Failed to generate campaign:", error)
      setState((prev) => ({ ...prev, isGenerating: false }))
    }
  }

  const handlePersistAndSchedule = async () => {
    setState((prev) => ({ ...prev, isPersisting: true }))
    try {
      const campaign = await createCampaign({
        name: state.generatedCampaign?.strategy?.campaignName || state.product || state.idea,
        description: state.idea,
        objective: state.objective,
        platforms: state.platforms,
        status: "ACTIVE",
        projectId: undefined,
      })

      const packId = await createContentPack({
        campaignId: campaign,
        name: `${state.product || state.idea} - Pack Inicial`,
        description: "Contenido generado por IA",
      })

      const pieces = state.generatedCampaign?.contentPieces || []
      let persistedCount = 0

      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i]
        const gen = piece.generatedContent || {}
        if (!state.selectedPieces.includes(String(gen.hook || `piece-${i}`))) continue

        await createContentPiece({
          contentPackId: packId,
          campaignId: campaign,
          title: gen.hook || piece.hook || `Pieza ${i + 1}`,
          hook: gen.hook || piece.hook || "",
          body: gen.caption || piece.copy || "",
          cta: gen.cta || piece.cta || "",
          contentType: piece.funnelStage === "conversion" ? "conversion" : piece.funnelStage === "interest" ? "capture" : "educational",
          funnelStage: piece.funnelStage || "awareness",
          platform: piece.platform || "instagram",
          hashtags: gen.hashtags || piece.hashtags || [],
          keywords: [],
          score: piece.safetyCheck?.score || 80,
          status: "GENERATED",
        })
        persistedCount++
      }

      setState((prev) => ({
        ...prev,
        campaignId: campaign,
        isPersisting: false,
        currentStep: 6,
      }))
    } catch (error) {
      console.error("Failed to persist campaign:", error)
      setState((prev) => ({ ...prev, isPersisting: false }))
    }
  }

  const handleAutoSchedule = async () => {
    if (!state.campaignId) return
    setState((prev) => ({ ...prev, isScheduling: true }))
    try {
      const response = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", campaignId: state.campaignId }),
      })
      const result = await response.json()
      setState((prev) => ({
        ...prev,
        isScheduling: false,
        scheduledCount: result.scheduled || 0,
        currentStep: 7,
      }))
    } catch (error) {
      console.error("Failed to schedule:", error)
      setState((prev) => ({ ...prev, isScheduling: false }))
    }
  }

  const handlePublish = async () => {
    setState((prev) => ({ ...prev, isPublishing: true }))
    try {
      const response = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      })
      const result = await response.json()
      setState((prev) => ({
        ...prev,
        isPublishing: false,
        publishedCount: result.published || 0,
      }))
    } catch (error) {
      console.error("Failed to publish:", error)
      setState((prev) => ({ ...prev, isPublishing: false }))
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
    const allPieces = (state.generatedCampaign.contentPieces || []).map((p: any, i: number) => String(p.generatedContent?.hook || `piece-${i}`))
    const allSelected = state.selectedPieces.length === allPieces.length
    setState((prev) => ({
      ...prev,
      selectedPieces: allSelected ? [] : allPieces,
    }))
  }

  const canGoNext = () => {
    switch (state.currentStep) {
      case 0: return state.idea.length > 10
      case 1: return state.objective.length > 5
      case 2: return true
      case 3: return state.platforms.length > 0
      default: return false
    }
  }

  const getPiecesByType = (type: string) => {
    if (!state.generatedCampaign) return []
    return (state.generatedCampaign.contentPieces || []).filter((p: any) => {
      const stage = p.funnelStage || ""
      if (type === "educational") return stage === "awareness"
      if (type === "capture") return stage === "interest"
      if (type === "objection") return stage === "consideration"
      if (type === "conversion") return stage === "conversion"
      if (type === "authority") return stage === "retention"
      return false
    })
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
                    Recomendado: 14 piezas para una primera campaña
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
                {state.offer && <div><strong>Oferta:</strong> {state.offer}</div>}
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 text-primary font-medium mb-2">
                  <Zap className="size-4" />
                  La IA va a generar automáticamente:
                </div>
                <ul className="text-sm space-y-1 ml-6">
                  <li>• Estrategia completa de campaña</li>
                  <li>• {Math.min(state.contentCount, 14)} piezas de contenido únicas</li>
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
                  Campaña generada: {state.generatedCampaign.strategy?.campaignName || state.product || state.idea}
                </CardTitle>
                <CardDescription>
                  Se generaron {(state.generatedCampaign.contentPieces || []).length} piezas de contenido.
                  Seleccioná las que querés programar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div><strong>Objetivo:</strong> {state.generatedCampaign.strategy?.objective}</div>
                  <div><strong>Público:</strong> {state.generatedCampaign.strategy?.targetAudience}</div>
                  <div><strong>Propuesta de valor:</strong> {state.generatedCampaign.strategy?.valueProposition}</div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {state.selectedPieces.length} de {(state.generatedCampaign.contentPieces || []).length} seleccionadas
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleAllPieces}>
                    {state.selectedPieces.length === (state.generatedCampaign.contentPieces || []).length
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
                          {pieces.map((piece: any, idx: number) => {
                            const gen = piece.generatedContent || {}
                            const pieceId = String(gen.hook || piece.hook || `piece-${idx}`)
                            return (
                              <div
                                key={pieceId}
                                className={cn(
                                  "rounded-lg border-2 p-4 transition-all cursor-pointer",
                                  state.selectedPieces.includes(pieceId)
                                    ? "border-primary bg-primary/5"
                                    : "border-muted hover:border-primary/50"
                                )}
                                onClick={() => togglePieceSelection(pieceId)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={state.selectedPieces.includes(pieceId)}
                                      onCheckedChange={() => togglePieceSelection(pieceId)}
                                    />
                                    <Badge variant="outline" className="text-xs">
                                      {piece.platform}
                                    </Badge>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {piece.safetyCheck?.score || piece.score || 80}
                                  </Badge>
                                </div>
                                <div className="font-medium text-sm mb-1">{gen.hook || piece.hook}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {gen.caption || piece.copy || piece.body}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(gen.hashtags || piece.hashtags || []).slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-primary font-medium">
                                  CTA: {gen.cta || piece.cta}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state.currentStep === 6 && (
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

              {state.scheduledCount > 0 && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 className="size-4" />
                    {state.scheduledCount} piezas programadas exitosamente
                  </div>
                </div>
              )}

              {state.campaignId && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-center gap-2 text-primary font-medium mb-2">
                    <Clock className="size-4" />
                    Programación automática:
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Los horarios se optimizan automáticamente para cada plataforma.
                    Se usan los mejores horarios de engagement según datos históricos.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {state.currentStep === 7 && (
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
                  <li>• Campaña: {state.generatedCampaign?.strategy?.campaignName || state.product || state.idea}</li>
                  <li>• Piezas seleccionadas: {state.selectedPieces.length}</li>
                  <li>• Plataformas: {state.platforms.map(p => PLATFORMS.find(pl => pl.id === p)?.name).join(", ")}</li>
                  {state.scheduledCount > 0 && <li>• Programadas: {state.scheduledCount}</li>}
                  {state.publishedCount > 0 && <li>• Publicadas: {state.publishedCount}</li>}
                </ul>
              </div>

              {state.publishedCount > 0 ? (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 className="size-4" />
                    ¡Campaña publicada! {state.publishedCount} piezas publicadas en Buffer.
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tu contenido está siendo publicado en las plataformas configuradas.
                  </p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handlePublish}
                    disabled={state.isPublishing}
                  >
                    {state.isPublishing ? (
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="size-4 mr-2" />
                    )}
                    Publicar ahora
                  </Button>
                  <Link href="/ai-control" className="flex-1">
                    <Button variant="outline" className="w-full" size="lg">
                      <Calendar className="size-4 mr-2" />
                      Activar Autopilot
                    </Button>
                  </Link>
                </div>
              )}
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
          {state.currentStep < 4 && (
            <Button onClick={() => setStep(state.currentStep + 1)} disabled={!canGoNext()}>
              Siguiente
              <ArrowRight className="size-4" />
            </Button>
          )}

          {state.currentStep === 4 && (
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

          {state.currentStep === 5 && (
            <Button onClick={handlePersistAndSchedule} disabled={state.isPersisting || state.selectedPieces.length === 0}>
              {state.isPersisting ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Guardar y programar
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}

          {state.currentStep === 6 && (
            <Button onClick={handleAutoSchedule} disabled={state.isScheduling || !state.campaignId}>
              {state.isScheduling ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Programando...
                </>
              ) : (
                <>
                  Programar publicaciones
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
