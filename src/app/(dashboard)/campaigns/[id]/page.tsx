"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Eye,
  Send,
  Calendar,
  BarChart3,
  Sparkles,
  BookOpen,
  Target,
  MessageSquare,
  Shield,
  TrendingUp,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Campaign {
  id: string; name: string; description?: string; idea: string; status: string;
  platforms: string[]; content_count?: number; published_count?: number;
  objective?: string; target_audience?: string; value_proposition?: string; communication_angle?: string;
}

interface ContentPiece {
  id: string; campaign_id: string; platform: string; content_type: string;
  hook: string; body: string; cta: string; hashtags: string[]; status: string;
  score?: number; created_at?: number;
}

const CONTENT_TYPE_CONFIG = [
  { type: "educational", label: "Educativo", icon: BookOpen, color: "text-blue-500", bgColor: "bg-blue-50" },
  { type: "capture", label: "Captación", icon: Target, color: "text-green-500", bgColor: "bg-green-50" },
  { type: "objection", label: "Objeciones", icon: MessageSquare, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  { type: "authority", label: "Autoridad", icon: Shield, color: "text-purple-500", bgColor: "bg-purple-50" },
  { type: "conversion", label: "Conversión", icon: TrendingUp, color: "text-red-500", bgColor: "bg-red-50" },
]

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string
  const [campaign, setCampaign] = React.useState<Campaign | null>(null)
  const [pieces, setPieces] = React.useState<ContentPiece[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`)
        if (res.ok) {
          const data = await res.json()
          setCampaign(data.campaign)
        }
        const piecesRes = await fetch(`/api/content-pieces?campaign_id=${campaignId}`)
        if (piecesRes.ok) {
          const piecesData = await piecesRes.json()
          setPieces(piecesData.content_pieces || [])
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    if (campaignId) load()
  }, [campaignId])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRegenerate = async (pieceId: string) => {
    try {
      await fetch(`/api/content-pieces/${pieceId}/regenerate`, { method: "POST" })
    } catch { /* ignore */ }
  }

  const filteredPieces = pieces.filter((piece) => {
    if (selectedFilter === "all") return true
    return piece.content_type === selectedFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Campaña no encontrada</p>
        <Link href="/campaigns"><Button variant="link">Volver a campañas</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground">{campaign.description || campaign.idea}</p>
        </div>
        <Badge className={campaign.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100"}>
          {campaign.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.content_count || pieces.length}</div>
            <div className="text-sm text-muted-foreground">Piezas totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.published_count || pieces.filter(p => p.status === "published").length}</div>
            <div className="text-sm text-muted-foreground">Publicadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.platforms?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Plataformas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pieces.filter(p => p.status === "draft").length}</div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      {campaign.objective && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Estrategia</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Objetivo:</strong> {campaign.objective}</div>
            {campaign.target_audience && <div><strong>Público:</strong> {campaign.target_audience}</div>}
            {campaign.value_proposition && <div><strong>Propuesta de valor:</strong> {campaign.value_proposition}</div>}
            {campaign.communication_angle && <div><strong>Ángulo:</strong> {campaign.communication_angle}</div>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={selectedFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedFilter("all")}>
          Todas ({pieces.length})
        </Button>
        {CONTENT_TYPE_CONFIG.map((ct) => {
          const count = pieces.filter(p => p.content_type === ct.type).length
          if (count === 0) return null
          return (
            <Button key={ct.type} variant={selectedFilter === ct.type ? "default" : "outline"} size="sm" onClick={() => setSelectedFilter(ct.type)}>
              {ct.label} ({count})
            </Button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPieces.map((piece) => {
          const typeConfig = CONTENT_TYPE_CONFIG.find(ct => ct.type === piece.content_type)
          const Icon = typeConfig?.icon || Sparkles
          return (
            <Card key={piece.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", typeConfig?.bgColor)}>
                      <Icon className={cn("size-4", typeConfig?.color)} />
                    </div>
                    <Badge variant="outline" className="text-xs">{piece.platform}</Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">{piece.score || 0}</Badge>
                </div>
                <CardTitle className="text-sm mt-2 line-clamp-2">{piece.hook}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground line-clamp-3">{piece.body}</div>
                <div className="flex flex-wrap gap-1">
                  {(piece.hashtags || []).slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  {(piece.hashtags || []).length > 4 && (
                    <Badge variant="outline" className="text-xs">+{(piece.hashtags || []).length - 4}</Badge>
                  )}
                </div>
                <div className="text-xs text-primary font-medium">CTA: {piece.cta}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopy(`${piece.hook}\n\n${piece.body}\n\n${piece.cta}\n\n${(piece.hashtags || []).join(" ")}`, piece.id)}>
                    {copiedId === piece.id ? <>Copiado!</> : <><Copy className="size-3 mr-1" />Copiar</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRegenerate(piece.id)}>
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPieces.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="size-12 text-muted-foreground mb-4" />
            <div className="text-lg font-medium">No hay piezas en esta categoría</div>
            <div className="text-sm text-muted-foreground mt-1">Generá contenido desde el wizard de creación</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
