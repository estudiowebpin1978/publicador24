"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, Hash, Copy } from "lucide-react"

interface Hashtag {
  tag: string
  category: string
  relevance: number
  popularity: string
}

export default function HashtagsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [hashtags, setHashtags] = React.useState<Hashtag[]>([])
  const [loading, setLoading] = React.useState(true)
  const [generating, setGenerating] = React.useState(false)
  const [topic, setTopic] = React.useState("")

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hashtags")
        if (res.ok) {
          const data = await res.json()
          setHashtags(data.hashtags || [])
        }
      } catch {
        // No data
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      })
      if (res.ok) {
        const data = await res.json()
        setHashtags(data.hashtags || [])
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const filtered = hashtags.filter(h =>
    !searchQuery || h.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const trending = filtered.filter(h => h.relevance > 60).sort((a, b) => b.relevance - a.relevance).slice(0, 10)
  const categories = Array.from(new Map(filtered.map(h => [h.category, h])).values()).slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inteligencia de Hashtags</h1>
          <p className="text-muted-foreground">Generá hashtags relevantes para tu contenido.</p>
        </div>
        <div className="h-10 w-full max-w-md animate-pulse bg-muted rounded" />
        <Card><CardContent className="h-96 animate-pulse bg-muted" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inteligencia de Hashtags</h1>
        <p className="text-muted-foreground">Generá hashtags relevantes para tu contenido.</p>
      </div>

      <div className="flex gap-3 max-w-md">
        <Input
          placeholder="Tema o industria (ej: diseño web, gastronomía)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <Button onClick={handleGenerate} disabled={generating || !topic.trim()}>
          {generating ? "Generando..." : "Generar"}
        </Button>
      </div>

      {hashtags.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CardContent className="space-y-3">
            <Hash className="mx-auto size-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Ingresá un tema y generá hashtags relevantes.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="trending">
          <TabsList>
            <TabsTrigger value="trending"><TrendingUp className="size-4" /> Recomendados</TabsTrigger>
            <TabsTrigger value="categories"><Hash className="size-4" /> Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Hashtags Recomendados</CardTitle></CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Filtrar hashtags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <div className="space-y-3">
                  {trending.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No se encontraron hashtags</p>
                  ) : (
                    trending.map((item, index) => (
                      <div key={item.tag} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold text-muted-foreground">{index + 1}</div>
                          <div>
                            <p className="font-medium">{item.tag}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{item.popularity}</span>
                              <Badge variant="secondary">{item.category}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{item.relevance}/100</Badge>
                          <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard.writeText(item.tag)}>
                            <Copy className="size-4" />
                          </Button>
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
              {categories.map((cat, i) => (
                <Card key={cat.category} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4">
                    <div className={cn("size-3 rounded-full", ["bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500", "bg-green-500"][i % 5])} />
                    <div>
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-sm text-muted-foreground">{filtered.filter(h => h.category === cat.category).length} hashtags</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
