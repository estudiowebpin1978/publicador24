"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Target, Plus, Calendar, FileText, DollarSign } from "lucide-react"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Activo", variant: "default" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
  draft: { label: "Draft", variant: "secondary" },
}

export default function CampaignsPage() {
  const [open, setOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editingCampaign, setEditingCampaign] = React.useState<any>(null)
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    objective: "",
    targetAudience: "",
    platforms: [] as string[],
    startDate: "",
    endDate: "",
    budget: 0,
  })

  const campaigns = useQuery(api.campaigns.list)
  const createCampaign = useMutation(api.campaigns.create)
  const updateCampaign = useMutation(api.campaigns.update)
  const removeCampaign = useMutation(api.campaigns.remove)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createCampaign({
      name: formData.name,
      description: formData.description,
      objective: formData.objective,
      targetAudience: formData.targetAudience,
      platforms: formData.platforms,
      startDate: formData.startDate,
      endDate: formData.endDate,
      budget: formData.budget,
    })
    setOpen(false)
    setFormData({ name: "", description: "", objective: "", targetAudience: "", platforms: [], startDate: "", endDate: "", budget: 0 })
  }

  const handleEdit = (campaign: any) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      objective: campaign.objective || "",
      targetAudience: campaign.targetAudience || "",
      platforms: campaign.platforms || [],
      startDate: campaign.startDate || "",
      endDate: campaign.endDate || "",
      budget: campaign.budget || 0,
    })
    setEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCampaign) {
      await updateCampaign({ id: editingCampaign._id, ...formData })
      setEditOpen(false)
      setEditingCampaign(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que querés eliminar esta campaña?")) {
      await removeCampaign({ id })
    }
  }

  if (campaigns === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
            <p className="text-muted-foreground">Organizá y seguí tus campañas de marketing.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="size-4" /> Crear Campaña
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nueva Campaña</DialogTitle>
                <DialogDescription>Configurá una nueva campaña de marketing para tu contenido.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2"><Label htmlFor="campaign-name">Nombre de la Campaña</Label><Input id="campaign-name" placeholder="ej: Oferta de Verano 2024" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
                <div className="space-y-2"><Label htmlFor="campaign-desc">Descripción</Label><Textarea id="campaign-desc" placeholder="Describí los objetivos de tu campaña..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Objetivo</Label><Input placeholder="ej: Reconocimiento de marca" value={formData.objective} onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Público Objetivo</Label><Input placeholder="ej: Profesionales de marketing" value={formData.targetAudience} onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Plataformas (separadas por coma)</Label><Input placeholder="instagram, x, facebook" value={formData.platforms.join(", ")} onChange={(e) => setFormData(prev => ({ ...prev, platforms: e.target.value.split(",").map(p => p.trim()) }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha de Inicio</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Fecha de Fin</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Presupuesto</Label><Input type="number" placeholder="ej: 500" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) || 0 }))} /></div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Crear Campaña</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  const activeCount = campaigns.filter((c: any) => c.status === "active").length
  const totalPosts = campaigns.reduce((sum: number, c: any) => sum + (c.contentCount || 0), 0)
  const totalBudget = campaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground">Organizá y seguí tus campañas de marketing.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" /> Crear Campaña
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Campaña</DialogTitle>
              <DialogDescription>Configurá una nueva campaña de marketing para tu contenido.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="campaign-name">Nombre de la Campaña</Label><Input id="campaign-name" placeholder="ej: Oferta de Verano 2024" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label htmlFor="campaign-desc">Descripción</Label><Textarea id="campaign-desc" placeholder="Describí los objetivos de tu campaña..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Objetivo</Label><Input placeholder="ej: Reconocimiento de marca" value={formData.objective} onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Público Objetivo</Label><Input placeholder="ej: Profesionales de marketing" value={formData.targetAudience} onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Plataformas (separadas por coma)</Label><Input placeholder="instagram, x, facebook" value={formData.platforms.join(", ")} onChange={(e) => setFormData(prev => ({ ...prev, platforms: e.target.value.split(",").map(p => p.trim()) }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha de Inicio</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Fecha de Fin</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Presupuesto</Label><Input type="number" placeholder="ej: 500" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) || 0 }))} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Crear Campaña</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Campaña</DialogTitle>
              <DialogDescription>Actualizá tu campaña de marketing.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="edit-campaign-name">Nombre de la Campaña</Label><Input id="edit-campaign-name" placeholder="ej: Oferta de Verano 2024" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label htmlFor="edit-campaign-desc">Descripción</Label><Textarea id="edit-campaign-desc" placeholder="Describí los objetivos de tu campaña..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Objetivo</Label><Input placeholder="ej: Reconocimiento de marca" value={formData.objective} onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Público Objetivo</Label><Input placeholder="ej: Profesionales de marketing" value={formData.targetAudience} onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Plataformas (separadas por coma)</Label><Input placeholder="instagram, x, facebook" value={formData.platforms.join(", ")} onChange={(e) => setFormData(prev => ({ ...prev, platforms: e.target.value.split(",").map(p => p.trim()) }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha de Inicio</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Fecha de Fin</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Presupuesto</Label><Input type="number" placeholder="ej: 500" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) || 0 }))} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-violet-600">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Campañas</p>
              <p className="text-2xl font-bold">{campaigns.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-green-600">
              <Target className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activo</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-blue-600">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Publicaciones</p>
              <p className="text-2xl font-bold">{totalPosts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-amber-600">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Presupuesto</p>
              <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aún no hay campañas. Hacé clic en "Crear Campaña" para empezar.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign: any) => (
            <Card key={campaign._id}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge variant={statusConfig[campaign.status]?.variant || "secondary"}>
                      {statusConfig[campaign.status]?.label || campaign.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {campaign.startDate || "No definido"} - {campaign.endDate || "No definido"}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {campaign.publishedCount || 0}/{campaign.contentCount || 0} publicaciones
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="size-3" />
                      ${campaign.budget || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{campaign.metrics?.progress || 0}%</span>
                    </div>
                    <Progress value={campaign.metrics?.progress || 0} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(campaign)}>Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(campaign._id)} className="text-red-600 hover:text-red-700">Eliminar</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
