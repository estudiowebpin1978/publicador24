"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { InstagramIcon, TwitterIcon, YoutubeIcon, LinkedinIcon, TiktokIcon } from "@/components/ui/social-icons"

interface ContentItem {
  id: string
  title: string
  platform: string
  status: "publicado" | "programado" | "borrador" | "fallido"
  date: string
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  x: TwitterIcon,
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  publicado: "default",
  programado: "secondary",
  borrador: "outline",
  fallido: "destructive",
}

export function RecentContent() {
  const [items, setItems] = React.useState<ContentItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/content-pieces?limit=5")
        if (res.ok) {
          const data = await res.json()
          const pieces = (data.pieces || data || []).slice(0, 5)
          setItems(pieces.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: (p.title as string) || (p.hook as string) || "Sin título",
            platform: (p.platform as string) || "instagram",
            status: p.status === "published" ? "publicado"
              : p.status === "scheduled" ? "programado"
              : p.status === "failed" ? "fallido"
              : "borrador",
            date: p.created_at ? new Date(p.created_at as number).toLocaleDateString("es-AR") : "Hoy",
          })))
        }
      } catch {
        // No data yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Contenido Reciente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Contenido Reciente</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay contenido creado todavía.</p>
          <p className="text-xs text-muted-foreground">Creá una campaña para generar contenido.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contenido Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const PlatformIcon = platformIcons[item.platform] || FileText
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <PlatformIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <Badge variant={statusVariants[item.status]} className="capitalize">
                  {item.status}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
