"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Sparkles,
  BarChart3,
  Eye,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  description: string
  idea: string
  objective: string
  platforms: string[]
  status: string
  content_count: number
  published_count: number
  created_at: number
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-gray-100 text-gray-500",
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-500",
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const fetchCampaigns = () => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta campaña y todo su contenido?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="h-48 animate-pulse bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-muted-foreground">Administrá tus campañas de contenido</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Crear campaña con IA
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/campaigns/new">
          <Card className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Sparkles className="size-8 text-primary mb-3" />
              <div className="font-medium text-lg">Crear nueva campaña</div>
              <div className="text-sm text-muted-foreground text-center mt-1">
                Escribí tu idea y la IA se encarga del resto
              </div>
            </CardContent>
          </Card>
        </Link>

        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {campaign.description || campaign.idea || "Sin descripción"}
                  </CardDescription>
                </div>
                <Badge className={STATUS_COLORS[campaign.status] || "bg-gray-100"}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaign.objective && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Objetivo:</span>{" "}
                    <span className="line-clamp-1">{campaign.objective}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {(campaign.platforms || []).map((platform) => (
                    <Badge key={platform} variant="outline" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{campaign.content_count} piezas</span>
                  <span>{campaign.published_count} publicadas</span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="size-4 mr-1" />
                      Ver
                    </Button>
                  </Link>
                  <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="size-4 mr-1" />
                      Editar
                    </Button>
                  </Link>
                  <Link href={`/analytics?campaign=${campaign.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <BarChart3 className="size-4 mr-1" />
                      Métricas
                    </Button>
                  </Link>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDelete(campaign.id)}
                    disabled={deletingId === campaign.id}
                  >
                    {deletingId === campaign.id ? (
                      <Loader2 className="size-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 mr-1" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="size-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium">No tenés campañas todavía</div>
            <div className="text-sm text-muted-foreground mt-1">
              Creá tu primera campaña con IA para empezar a generar contenido
            </div>
            <Link href="/campaigns/new" className="mt-4">
              <Button>
                <Plus className="size-4 mr-2" />
                Crear primera campaña
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
