"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Search, TrendingUp, Hash, Star, Copy, ArrowUpRight } from "lucide-react"
import { useQuery } from "@/hooks/use-convex"
import { api } from "@convex/_generated/api"

export default function HashtagsPageContent() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const hashtags = useQuery(api.hashtags.list)

  if (hashtags === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inteligencia de Hashtags</h1>
          <p className="text-muted-foreground">Descubrí y optimizá hashtags para lograr el máximo alcance.</p>
        </div>
        <div className="relative max-w-md animate-pulse"><div className="h-10 bg-muted rounded" /></div>
        <Tabs defaultValue="trending">
          <TabsList>
            <TabsTrigger value="trending"><TrendingUp className="size-4" /> En Tendencia</TabsTrigger>
            <TabsTrigger value="recommended"><Star className="size-4" /> Recomendados</TabsTrigger>
            <TabsTrigger value="categories"><Hash className="size-4" /> Categorías</TabsTrigger>
          </TabsList>
          <TabsContent value="trending" className="space-y-4">
            <Card><CardContent className="h-96 animate-pulse bg-muted" /></Card>
          </TabsContent>
          <TabsContent value="recommended" className="space-y-4">
            <Card><CardContent className="h-96 animate-pulse bg-muted" /></Card>
          </TabsContent>
          <TabsContent value="categories" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const trendingHashtags = hashtags
    .filter((h: any) => h.finalScore && h.finalScore > 50)
    .sort((a: any, b: any) => (b.finalScore || 0) - (a.finalScore || 0))
    .slice(0, 10)

  const recommendedHashtags = hashtags
    .filter((h: any) => h.relevanceScore && h.relevanceScore > 60)
    .sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 6)

  const categories = Array.from(
    new Map(hashtags.map((h: any) => [h.category || "Uncategorized", h])).values()
  ).slice(0, 5).map((h: any, index: number) => ({
    name: h.category || "Uncategorized",
    count: hashtags.filter((x: any) => x.category === h.category).length,
    color: ["bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500", "bg-green-500"][index % 5],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inteligencia de Hashtags</h1>
        <p className="text-muted-foreground">Descubrí y optimizá hashtags para lograr el máximo alcance.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar hashtags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="trending">
        <TabsList>
          <TabsTrigger value="trending"><TrendingUp className="size-4" /> En Tendencia</TabsTrigger>
          <TabsTrigger value="recommended"><Star className="size-4" /> Recomendados</TabsTrigger>
          <TabsTrigger value="categories"><Hash className="size-4" /> Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Hashtags en Tendencia</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trendingHashtags.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No se encontraron hashtags en tendencia</p>
                ) : (
                  trendingHashtags.map((item: any, index: number) => (
                    <div key={item._id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-muted-foreground">{index + 1}</div>
                        <div>
                          <p className="font-medium">{item.tag}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{item.popularityScore ? `${(item.popularityScore / 1000).toFixed(1)}K` : "N/A"} publicaciones</span>
                            <Badge variant="secondary">{item.category || "General"}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.finalScore || 0}/100</p>
                          <Progress value={item.finalScore || 0} className="w-20" />
                        </div>
                        <span className="flex items-center text-sm text-green-600">
                          <ArrowUpRight className="size-3" />
                          {item.trendScore || 0}%
                        </span>
                        <Button variant="ghost" size="icon-sm"><Copy className="size-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommended" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recomendados para tu Contenido</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendedHashtags.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 col-span-2">Aún no hay recomendaciones</p>
                ) : (
                  recommendedHashtags.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{item.tag}</p>
                        <p className="text-sm text-muted-foreground">Alta relevancia para tu nicho</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.popularityScore ? `${(item.popularityScore / 1000).toFixed(1)}K` : "N/A"} publicaciones
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.relevanceScore || 0}</Badge>
                        <Button variant="ghost" size="icon-sm"><Copy className="size-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.name} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4">
                  <div className={cn("size-3 rounded-full", category.color)} />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.count} hashtags</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
