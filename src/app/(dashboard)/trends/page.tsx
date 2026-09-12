"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, ArrowUpRight, Hash, Zap } from "lucide-react"
import { InstagramIcon, TwitterIcon, FacebookIcon } from "@/components/ui/social-icons"
import { useQuery } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

interface Trend {
  _id: string
  keyword: string
  category?: string
  platform?: string
  trendScore?: number
  growthRate?: number
  relatedHashtags?: string[]
}

export default function TrendsPage() {
  const trends = useQuery(api.trends.listRecent) as Trend[] | undefined

  if (trends === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tendencias</h1>
          <p className="text-muted-foreground">Mantenete a la vanguardia con temas en tendencia e ideas de contenido viral.</p>
        </div>
        <Tabs defaultValue="trending">
          <TabsList>
            <TabsTrigger value="trending"><TrendingUp className="size-4" /> Temas en Tendencia</TabsTrigger>
            <TabsTrigger value="platforms"><Zap className="size-4" /> Tendencias por Plataforma</TabsTrigger>
          </TabsList>
          <TabsContent value="trending" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2"><CardContent className="h-96 animate-pulse bg-muted" /></Card>
              <Card><CardContent className="h-96 animate-pulse bg-muted" /></Card>
            </div>
          </TabsContent>
          <TabsContent value="platforms" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="h-64" /></Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const trendingTopics = trends
    .filter((t: Trend) => t.trendScore && t.trendScore > 50)
    .sort((a: Trend, b: Trend) => (b.trendScore || 0) - (a.trendScore || 0))
    .slice(0, 8)

  const relatedHashtags = trends
    .flatMap((t: Trend) => t.relatedHashtags || [])
    .slice(0, 6)
    .map((tag: string, index: number) => ({ tag, volume: `${Math.floor(Math.random() * 1000 + 100)}K` }))

  const platformTrends = {
    instagram: trends.filter((t: Trend) => t.platform === "instagram").slice(0, 3),
    x: trends.filter((t: Trend) => t.platform === "x" || t.platform === "twitter").slice(0, 3),
    facebook: trends.filter((t: Trend) => t.platform === "facebook").slice(0, 3),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tendencias</h1>
        <p className="text-muted-foreground">Mantenete a la vanguardia con temas en tendencia e ideas de contenido viral.</p>
      </div>

      <Tabs defaultValue="trending">
        <TabsList>
          <TabsTrigger value="trending"><TrendingUp className="size-4" /> Temas en Tendencia</TabsTrigger>
          <TabsTrigger value="platforms"><Zap className="size-4" /> Tendencias por Plataforma</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Temas en Tendencia</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendingTopics.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No se encontraron temas en tendencia</p>
                  ) : (
                    trendingTopics.map((item: Trend, index: number) => (
                      <div key={item._id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold text-muted-foreground">{index + 1}</div>
                          <div>
                            <p className="font-medium">{item.keyword}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">{item.category || "General"}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">Puntaje: {item.trendScore || 0}</p>
                          </div>
                          <span className="flex items-center text-sm text-green-600">
                            <ArrowUpRight className="size-3" />
                            {item.growthRate ? `${item.growthRate}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Hashtags Relacionados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {relatedHashtags.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin hashtags relacionados</p>
                ) : (
                  <>
                    {relatedHashtags.map((item: { tag: string; volume: string }) => (
                      <div key={item.tag} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Hash className="size-4 text-muted-foreground" />
                          <span className="font-medium">{item.tag}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.volume}</span>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">Ver Más</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(platformTrends).map(([platform, platformTrendsData]: [string, Trend[]]) => {
              const platformConfig = {
                instagram: { icon: InstagramIcon, color: "text-pink-500" },
                x: { icon: TwitterIcon, color: "text-sky-500" },
                facebook: { icon: FacebookIcon, color: "text-blue-600" },
              }
              const config = platformConfig[platform as keyof typeof platformConfig]
              const Icon = config?.icon

              return (
                <Card key={platform}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {Icon && <Icon className={cn("size-5", config.color)} />}
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {platformTrendsData.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Sin tendencias para esta plataforma</p>
                    ) : (
                      platformTrendsData.map((trend: Trend) => (
                        <div key={trend._id} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="font-medium">{trend.keyword}</span>
                          <Badge variant="outline">{trend.trendScore || 0}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}