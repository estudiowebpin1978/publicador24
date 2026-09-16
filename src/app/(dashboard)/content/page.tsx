"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ContentTable } from "@/components/content/content-table"
import { ContentFilters } from "@/components/content/content-filters"
import { LayoutGrid, List, Plus, Trash2, Calendar, Send } from "lucide-react"
import Link from "next/link"

interface ContentPiece {
  id: string
  title: string
  platform: string
  status: string
  score: number
  date: string
  type: string
}

export default function ContentPage() {
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table")
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [items, setItems] = React.useState<ContentPiece[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/content-pieces")
        if (res.ok) {
          const data = await res.json()
          const pieces = (data.pieces || data || [])
          setItems(pieces.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            title: (p.title as string) || (p.hook as string) || "Sin título",
            platform: (p.platform as string) || "instagram",
            status: (p.status as string)?.toLowerCase() || "draft",
            score: (p.score as number) || 0,
            date: p.created_at ? new Date(p.created_at as number).toLocaleDateString("es-AR") : "",
            type: (p.content_type as string) || "post",
          })))
        }
      } catch {
        // No data
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que querés eliminar este contenido?")) return
    try {
      await fetch(`/api/content-pieces?id=${id}`, { method: "DELETE" })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { /* ignore */ }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch("/api/content-pieces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: status.toUpperCase() }),
      })
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: status.toLowerCase() } : i))
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contenido</h1>
            <p className="text-muted-foreground">Gestioná y organizá todo tu contenido en un solo lugar.</p>
          </div>
          <Link href="/content/create"><Button><Plus className="size-4" /> Crear Contenido</Button></Link>
        </div>
        <div className="rounded-xl border animate-pulse bg-muted/50 h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contenido</h1>
          <p className="text-muted-foreground">Gestioná y organizá todo tu contenido en un solo lugar.</p>
        </div>
        <Link href="/content/create"><Button><Plus className="size-4" /> Crear Contenido</Button></Link>
      </div>

      <ContentFilters />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <>
              <Badge variant="secondary">{selectedItems.length} seleccionados</Badge>
              <Button variant="outline" size="sm" onClick={() => Promise.all(selectedItems.map(id => handleDelete(id)))}>
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setViewMode("table")}>
            <List className="size-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay contenido creado todavía.</p>
          <p className="text-xs text-muted-foreground mt-1">Creá una campaña para generar contenido.</p>
        </div>
      ) : (
        <ContentTable
          items={items}
          selectedItems={selectedItems}
          onSelectItems={setSelectedItems}
          viewMode={viewMode}
          onDeleteItem={handleDelete}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {items.length} contenidos
        </p>
      </div>
    </div>
  )
}
