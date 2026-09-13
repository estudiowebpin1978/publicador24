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
} from "lucide-react"
import Link from "next/link"
import { useQuery, useAction } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"
import { useParams } from "next/navigation"

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

  const campaign = useQuery(api.campaigns.get, { id: campaignId })
  const pieces = useQuery(api.contentPieces.getByCampaign, { campaignId: campaignId })
  const packs = useQuery(api.contentPacks.list, { campaignId: campaignId })
  const regeneratePiece = useAction(api.campaignGenerator.regenerateContentPiece)

  const [selectedFilter, setSelectedFilter] = React.useState<string>("all")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRegenerate = async (pieceId: string) => {
    try {
      await regeneratePiece({
        pieceId: pieceId,
        direction: "más impactante",
      })
    } catch (error) {
      console.error("Failed to regenerate:", error)
    }
  }

  const filteredPieces = pieces?.filter((piece) => {
    if (selectedFilter === "all") return true
    return piece.contentType === selectedFilter
  }) || []

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground">
            {campaign.description || campaign.idea}
          </p>
        </div>
        <Badge className={campaign.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100"}>
          {campaign.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.contentCount}</div>
            <div className="text-sm text-muted-foreground">Piezas totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.publishedCount}</div>
            <div className="text-sm text-muted-foreground">Publicadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{campaign.platforms.length}</div>
            <div className="text-sm text-muted-foreground">Plataformas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {pieces?.filter((p) => p.status === "GENERATED").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      {campaign.objective && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Estrategia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Objetivo:</strong> {campaign.objective}</div>
            {campaign.targetAudience && <div><strong>Público:</strong> {campaign.targetAudience}</div>}
            {campaign.valueProposition && <div><strong>Propuesta de valor:</strong> {campaign.valueProposition}</div>}
            {campaign.communicationAngle && <div><strong>Ángulo:</strong> {campaign.communicationAngle}</div>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFilter("all")}
        >
          Todas ({pieces?.length || 0})
        </Button>
        {CONTENT_TYPE_CONFIG.map((ct) => {
          const count = pieces?.filter((p) => p.contentType === ct.type).length || 0
          if (count === 0) return null
          return (
            <Button
              key={ct.type}
              variant={selectedFilter === ct.type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(ct.type)}
            >
              {ct.label} ({count})
            </Button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPieces.map((piece) => {
          const typeConfig = CONTENT_TYPE_CONFIG.find((ct) => ct.type === piece.contentType)
          const Icon = typeConfig?.icon || Sparkles

          return (
            <Card key={piece._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", typeConfig?.bgColor)}>
                      <Icon className={cn("size-4", typeConfig?.color)} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {piece.platform}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {piece.score}
                  </Badge>
                </div>
                <CardTitle className="text-sm mt-2 line-clamp-2">{piece.hook}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground line-clamp-3">
                  {piece.body}
                </div>

                <div className="flex flex-wrap gap-1">
                  {piece.hashtags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {piece.hashtags.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{piece.hashtags.length - 4}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-primary font-medium">
                  CTA: {piece.cta}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopy(
                      `${piece.hook}\n\n${piece.body}\n\n${piece.cta}\n\n${piece.hashtags.join(" ")}`,
                      piece._id
                    )}
                  >
                    {copiedId === piece._id ? (
                      <>Copiado!</>
                    ) : (
                      <>
                        <Copy className="size-3 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate(piece._id)}
                  >
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
            <div className="text-sm text-muted-foreground mt-1">
              Generá contenido desde el wizard de creación
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
