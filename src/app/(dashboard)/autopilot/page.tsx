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
import { Zap, Shield, Settings, Clock, Target, AlertTriangle, Loader2 } from "lucide-react"

const DEFAULT_SETTINGS = {
  level: "assisted",
  platformFrequencies: { instagram: "daily", x: "daily", facebook: "daily", linkedin: "daily", tiktok: "daily" },
  topics: "",
  contentPillars: "",
  topicsToAvoid: "",
  timeZone: "America/Argentina/Buenos_Aires",
  preferredTimeSlots: "optimal",
  excludedDays: [] as string[],
  contentGuidelines: "",
  approvalRequirements: "review",
}

export default function AutopilotPage() {
  const [settings, setSettings] = React.useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = React.useState(true)
  const [saved, setSaved] = React.useState(false)
  const [running, setRunning] = React.useState(false)
  const [lastRun, setLastRun] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/autopilot/settings")
        if (res.ok) {
          const data = await res.json()
          if (data.settings) setSettings(data.settings)
        }
      } catch { /* use defaults */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      await fetch("/api/autopilot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
  }

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/autopilot", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setLastRun(`Publicado: ${data.contentPublished || 0} | Errores: ${data.errors?.length || 0}`)
      }
    } catch { /* ignore */ }
    finally { setRunning(false) }
  }

  const autopilotLevels = [
    { id: "manual", name: "Manual", description: "Vos creás y publicás todo el contenido manualmente", icon: Settings, color: "text-gray-500" },
    { id: "assisted", name: "Assisted", description: "La IA sugiere contenido, vos revisás y publicás", icon: Shield, color: "text-blue-500" },
    { id: "auto", name: "Auto", description: "La IA crea y programa contenido automáticamente", icon: Zap, color: "text-violet-500" },
    { id: "safe-auto", name: "Safe Auto", description: "Modo automático con filtros de seguridad y aprobación", icon: AlertTriangle, color: "text-amber-500" },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Piloto Automático</h1></div>
        <Card><CardContent className="h-40 animate-pulse bg-muted" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Piloto Automático</h1>
          <p className="text-muted-foreground">Configurá cómo la IA automatiza la publicación de tu contenido.</p>
        </div>
        <Button onClick={handleRunNow} disabled={running}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          Ejecutar Ahora
        </Button>
      </div>

      {lastRun && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardContent className="py-3"><p className="text-sm text-violet-400">{lastRun}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Nivel de Piloto Automático</CardTitle><CardDescription>Elegí cuánto control querés tener</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {autopilotLevels.map((level) => {
              const Icon = level.icon
              return (
                <button key={level.id} onClick={() => setSettings(s => ({ ...s, level: level.id }))}
                  className={cn("flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    settings.level === level.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"
                  )}>
                  <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", level.color)}><Icon className="size-5" /></div>
                  <div><p className="font-medium">{level.name}</p><p className="text-sm text-muted-foreground">{level.description}</p></div>
                  {settings.level === level.id && <Badge variant="default" className="ml-auto">Seleccionado</Badge>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-4" />Temas y Nichos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Temas Principales</Label><Input placeholder="ej: Marketing, Tecnología, Negocios" value={settings.topics} onChange={(e) => setSettings(s => ({ ...s, topics: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Pilares de Contenido</Label><Textarea placeholder="Un tema por línea..." value={settings.contentPillars} onChange={(e) => setSettings(s => ({ ...s, contentPillars: e.target.value }))} className="min-h-[100px]" /></div>
          <div className="space-y-2"><Label>Temas a Evitar</Label><Input placeholder="ej: Política" value={settings.topicsToAvoid} onChange={(e) => setSettings(s => ({ ...s, topicsToAvoid: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="size-4" />Preferencias de Programación</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Zona Horaria</Label><Select value={settings.timeZone} onValueChange={(v) => setSettings(s => ({ ...s, timeZone: v || "America/Argentina/Buenos_Aires" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</SelectItem>
                <SelectItem value="America/Mexico_City">Ciudad de México (CST)</SelectItem>
                <SelectItem value="America/Bogota">Bogotá (COT)</SelectItem>
                <SelectItem value="America/Santiago">Santiago (CLT)</SelectItem>
              </SelectContent></Select></div>
            <div className="space-y-2"><Label>Requisitos de Aprobación</Label><Select value={settings.approvalRequirements} onValueChange={(v) => setSettings(s => ({ ...s, approvalRequirements: v || "review" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="auto">Publicación automática</SelectItem>
                <SelectItem value="review">Revisar antes de publicar</SelectItem>
                <SelectItem value="always">Siempre requerir aprobación</SelectItem>
              </SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Pautas de Contenido</Label><Textarea placeholder="Ingresá pautas para la IA..." value={settings.contentGuidelines} onChange={(e) => setSettings(s => ({ ...s, contentGuidelines: e.target.value }))} className="min-h-[80px]" /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>Restablecer</Button>
        <Button onClick={handleSave}>{saved ? "Guardado!" : "Guardar Configuración"}</Button>
      </div>
    </div>
  )
}
