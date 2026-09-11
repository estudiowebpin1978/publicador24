"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  FileText,
  Calendar,
  Send,
  Activity,
  TrendingUp,
} from "lucide-react"

interface AdminStatsProps {
  stats: Record<string, unknown> | null
}

export function AdminStats({ stats }: AdminStatsProps) {
  if (!stats) return null

  const overviewCards = [
    {
      title: "Total de Usuarios",
      value: (stats.users as { total: number })?.total || 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Espacios de Trabajo",
      value: (stats.workspaces as { total: number })?.total || 0,
      icon: Building2,
      color: "text-purple-600",
    },
    {
      title: "Contenido Total",
      value: (stats.content as { total: number })?.total || 0,
      icon: FileText,
      color: "text-green-600",
    },
    {
      title: "Publicaciones Publicadas",
      value: (stats.published as { total: number })?.total || 0,
      icon: Send,
      color: "text-cyan-600",
    },
  ]

  const contentStats = stats.content as {
    avg_ai_score?: number
    avg_spam_risk?: number
    by_status?: Record<string, number>
  } | undefined

  const schedulingStats = stats.scheduling as {
    queued?: number
    processing?: number
    published?: number
    failed?: number
    retry?: number
  } | undefined

  const rateLimitStats = stats.rate_limits as {
    total?: number
    blocked?: number
    throttled?: number
    warning?: number
    available?: number
  } | undefined

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`size-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4" />
              Calidad del Contenido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Puntaje IA Promedio</span>
              <Badge variant={contentStats?.avg_ai_score && contentStats.avg_ai_score > 60 ? "default" : "secondary"}>
                {contentStats?.avg_ai_score?.toFixed(1) || "N/A"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Riesgo Spam Promedio</span>
              <Badge variant={contentStats?.avg_spam_risk && contentStats.avg_spam_risk < 30 ? "default" : "destructive"}>
                {contentStats?.avg_spam_risk?.toFixed(1) || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="size-4" />
              Cola de Programación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">En Cola</span>
              <Badge variant="secondary">{schedulingStats?.queued || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Procesando</span>
              <Badge variant="secondary">{schedulingStats?.processing || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fallidas</span>
              <Badge variant="destructive">{schedulingStats?.failed || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reintento</span>
              <Badge variant="outline">{schedulingStats?.retry || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4" />
              Límites de Tasa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Rastreados</span>
              <Badge variant="secondary">{rateLimitStats?.total || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Disponibles</span>
              <Badge variant="default">{rateLimitStats?.available || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Limitados</span>
              <Badge variant="secondary">{rateLimitStats?.throttled || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bloqueados</span>
              <Badge variant="destructive">{rateLimitStats?.blocked || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contenido por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {contentStats?.by_status && Object.entries(contentStats.by_status).map(([status, count]) => (
              <Badge key={status} variant="outline">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
