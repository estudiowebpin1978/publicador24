"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Zap, Shield, Settings, Clock, Target, AlertTriangle } from "lucide-react"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

const DEFAULT_SETTINGS = {
  level: "assisted",
  platformFrequencies: { instagram: "daily", x: "daily", facebook: "daily", linkedin: "daily", tiktok: "daily" },
  topics: "Marketing, Technology, AI",
  contentPillars: "Industry insights\nTips and tutorials\nProduct updates\nCompany news",
  topicsToAvoid: "Politics",
  timeZone: "America/Argentina/Buenos_Aires",
  preferredTimeSlots: "optimal",
  excludedDays: [] as string[],
  contentGuidelines: "Siempre incluí un llamado a la acción\nUsá hashtags de marca\nMantené un tono profesional\nIncluí emojis relevantes",
  approvalRequirements: "review",
}

export default function AutopilotPage() {
  const existingSettings = useQuery(api.autopilot.getSettings)
  const [selectedLevel, setSelectedLevel] = React.useState(DEFAULT_SETTINGS.level)
  const [platformFrequencies, setPlatformFrequencies] = React.useState<Record<string, string>>(DEFAULT_SETTINGS.platformFrequencies)
  const [topics, setTopics] = React.useState(DEFAULT_SETTINGS.topics)
  const [contentPillars, setContentPillars] = React.useState(DEFAULT_SETTINGS.contentPillars)
  const [topicsToAvoid, setTopicsToAvoid] = React.useState(DEFAULT_SETTINGS.topicsToAvoid)
  const [timeZone, setTimeZone] = React.useState(DEFAULT_SETTINGS.timeZone)
  const [preferredTimeSlots, setPreferredTimeSlots] = React.useState(DEFAULT_SETTINGS.preferredTimeSlots)
  const [excludedDays, setExcludedDays] = React.useState<string[]>(DEFAULT_SETTINGS.excludedDays)
  const [contentGuidelines, setContentGuidelines] = React.useState(DEFAULT_SETTINGS.contentGuidelines)
  const [approvalRequirements, setApprovalRequirements] = React.useState(DEFAULT_SETTINGS.approvalRequirements)
  const [saved, setSaved] = React.useState(false)
  const initRef = React.useRef(false)

  React.useEffect(() => {
    if (existingSettings && !initRef.current) {
      initRef.current = true
      setSelectedLevel(existingSettings.level || DEFAULT_SETTINGS.level)
      setPlatformFrequencies(existingSettings.platformFrequencies || DEFAULT_SETTINGS.platformFrequencies)
      setTopics(existingSettings.topics || DEFAULT_SETTINGS.topics)
      setContentPillars(existingSettings.contentPillars || DEFAULT_SETTINGS.contentPillars)
      setTopicsToAvoid(existingSettings.topicsToAvoid || DEFAULT_SETTINGS.topicsToAvoid)
      setTimeZone(existingSettings.timeZone || DEFAULT_SETTINGS.timeZone)
      setPreferredTimeSlots(existingSettings.preferredTimeSlots || DEFAULT_SETTINGS.preferredTimeSlots)
      setExcludedDays(existingSettings.excludedDays || DEFAULT_SETTINGS.excludedDays)
      setContentGuidelines(existingSettings.contentGuidelines || DEFAULT_SETTINGS.contentGuidelines)
      setApprovalRequirements(existingSettings.approvalRequirements || DEFAULT_SETTINGS.approvalRequirements)
    }
  }, [existingSettings])

  const saveSettings = useMutation(api.autopilot.saveSettings)

  const handleSave = async () => {
    try {
      const settings = {
        level: selectedLevel,
        platformFrequencies,
        topics,
        contentPillars,
        topicsToAvoid,
        timeZone,
        preferredTimeSlots,
        excludedDays,
        contentGuidelines,
        approvalRequirements,
      }
      await saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // error handled silently
    }
  }

  const handleReset = () => {
    setSelectedLevel(DEFAULT_SETTINGS.level)
    setPlatformFrequencies(DEFAULT_SETTINGS.platformFrequencies)
    setTopics(DEFAULT_SETTINGS.topics)
    setContentPillars(DEFAULT_SETTINGS.contentPillars)
    setTopicsToAvoid(DEFAULT_SETTINGS.topicsToAvoid)
    setTimeZone(DEFAULT_SETTINGS.timeZone)
    setPreferredTimeSlots(DEFAULT_SETTINGS.preferredTimeSlots)
    setExcludedDays(DEFAULT_SETTINGS.excludedDays)
    setContentGuidelines(DEFAULT_SETTINGS.contentGuidelines)
    setApprovalRequirements(DEFAULT_SETTINGS.approvalRequirements)
  }

  const autopilotLevels = [
    { id: "manual", name: "Manual", description: "Vos creás y publicás todo el contenido manualmente", icon: Settings, color: "text-gray-500" },
    { id: "assisted", name: "Assisted", description: "La IA sugiere contenido, vos revisás y publicás", icon: Shield, color: "text-blue-500" },
    { id: "auto", name: "Auto", description: "La IA crea y programa contenido automáticamente", icon: Zap, color: "text-violet-500" },
    { id: "safe-auto", name: "Safe Auto", description: "Modo automático con filtros de seguridad y aprobación", icon: AlertTriangle, color: "text-amber-500" },
  ]

  const toggleExcludedDay = (day: string) => {
    setExcludedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Piloto Automático</h1>
        <p className="text-muted-foreground">
          Configurá cómo la IA automatiza la publicación de tu contenido.
        </p>
      </div>

      {/* Nivel de Piloto Automático */}
      <Card>
        <CardHeader>
          <CardTitle>Nivel de Piloto Automático</CardTitle>
          <CardDescription>Elegí cuánto control querés tener sobre el contenido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {autopilotLevels.map((level) => {
              const Icon = level.icon
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    selectedLevel === level.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", level.color)}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{level.name}</p>
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                  {selectedLevel === level.id && (
                    <Badge variant="default" className="ml-auto">Seleccionado</Badge>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Frecuencia por Plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Frecuencia por Plataforma
          </CardTitle>
          <CardDescription>Configurá con qué frecuencia publicar en cada plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {["instagram", "x", "facebook", "linkedin", "tiktok"].map((platform) => (
            <div key={platform} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium capitalize">{platform}</span>
              <Select
                value={platformFrequencies[platform]}
                onValueChange={(value) => setPlatformFrequencies(prev => ({ ...prev, [platform]: value || "daily" }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple">Varias veces al día</SelectItem>
                  <SelectItem value="daily">Una vez al día</SelectItem>
                  <SelectItem value="few-week">Varias veces por semana</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="disabled">Desactivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Topic/Niche Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4" />
            Temas y Nichos
          </CardTitle>
          <CardDescription>Definí en qué contenido debe enfocarse la IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Temas Principales</Label>
            <Input placeholder="ej: Marketing, Tecnología, Negocios" value={topics} onChange={(e) => setTopics(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pilares de Contenido</Label>
            <Textarea
              placeholder="Ingresá un tema por línea..."
              value={contentPillars}
              onChange={(e) => setContentPillars(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Temas a Evitar</Label>
            <Input placeholder="ej: Política, Controversias" value={topicsToAvoid} onChange={(e) => setTopicsToAvoid(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Preferencias de Programación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Preferencias de Programación
          </CardTitle>
          <CardDescription>Configurá cuándo debe programar publicaciones la IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Zona Horaria</Label>
              <Select value={timeZone} onValueChange={(v) => setTimeZone(v || "est")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="est">Hora del Este (ET)</SelectItem>
                  <SelectItem value="cst">Hora del Centro (CT)</SelectItem>
                  <SelectItem value="mst">Hora de la Montaña (MT)</SelectItem>
                  <SelectItem value="pst">Hora del Pacífico (PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Franjas Horarias Preferidas</Label>
              <Select value={preferredTimeSlots} onValueChange={(v) => setPreferredTimeSlots(v || "optimal")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optimal">Óptimo (elegido por IA)</SelectItem>
                  <SelectItem value="morning">Solo mañana</SelectItem>
                  <SelectItem value="afternoon">Solo tarde</SelectItem>
                  <SelectItem value="evening">Solo noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Días Excluidos</Label>
            <div className="flex flex-wrap gap-2">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
                <Button
                  key={day}
                  variant={excludedDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleExcludedDay(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reglas de Contenido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Reglas de Contenido
          </CardTitle>
          <CardDescription>Definí reglas para el contenido generado por IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pautas de Contenido</Label>
            <Textarea
              placeholder="Ingresá pautas para que la IA siga..."
              value={contentGuidelines}
              onChange={(e) => setContentGuidelines(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Requisitos de Aprobación</Label>
            <Select value={approvalRequirements} onValueChange={(v) => setApprovalRequirements(v || "review")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Publicación automática (sin aprobación)</SelectItem>
                <SelectItem value="review">Revisar antes de publicar</SelectItem>
                <SelectItem value="always">Siempre requerir aprobación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>Restablecer Valores</Button>
        <Button onClick={handleSave}>{saved ? "Guardado!" : "Guardar Configuración de Piloto Automático"}</Button>
      </div>
    </div>
  )
}
