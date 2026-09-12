"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ContentTable } from "@/components/content/content-table"
import { ContentFilters } from "@/components/content/content-filters"
import {
  LayoutGrid,
  List,
  Plus,
  Trash2,
  Calendar,
  Send,
} from "lucide-react"
import Link from "next/link"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

function mapContentToTableItem(content: any) {
  return {
    id: content._id,
    title: content.title,
    platforms: content.targetPlatforms || [],
    status: content.status?.toLowerCase() || "draft",
    score: content.aiScore || 0,
    date: new Date(content._creationTime).toLocaleDateString(),
    author: content.metadata?.author || "Generado por IA",
    type: content.contentType || "text",
  }
}

export default function ContentPageContent() {
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table")
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [filterStatus, setFilterStatus] = React.useState<string | undefined>(undefined)
  const [filterPlatform, setFilterPlatform] = React.useState<string | undefined>(undefined)

  const content = useQuery(api.content.list, { status: filterStatus, platform: filterPlatform })

  const removeContent = useMutation(api.content.remove)
  const updateContentStatus = useMutation(api.content.updateStatus)

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que querés eliminar este contenido?")) {
      await removeContent({ id })
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateContentStatus({ id, status: status.toUpperCase() })
  }

  if (content === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contenido</h1>
            <p className="text-muted-foreground">Gestioná y organizá todo tu contenido en un solo lugar.</p>
          </div>
          <Link href="/content/create">
            <Button><Plus className="size-4" /> Crear Contenido</Button>
          </Link>
        </div>
        <ContentFilters />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled><List className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" disabled><LayoutGrid className="size-4" /></Button>
          </div>
        </div>
        <div className="rounded-xl border animate-pulse bg-muted/50 h-64" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Cargando...</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Anterior</Button>
            <Button variant="outline" size="sm" disabled>Siguiente</Button>
          </div>
        </div>
      </div>
    )
  }

  const mappedContent = content.map(mapContentToTableItem)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contenido</h1>
          <p className="text-muted-foreground">Gestioná y organizá todo tu contenido en un solo lugar.</p>
        </div>
        <Link href="/content/create">
          <Button><Plus className="size-4" /> Crear Contenido</Button>
        </Link>
      </div>

      <ContentFilters />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <>
              <Badge variant="secondary">{selectedItems.length} seleccionados</Badge>
              <Button variant="outline" size="sm" onClick={() => Promise.all(selectedItems.map(id => removeContent({ id })))}>
                <Trash2 className="size-4" /> Eliminar
              </Button>
              <Button variant="outline" size="sm" onClick={() => Promise.all(selectedItems.map(id => updateContentStatus({ id, status: "SCHEDULED" })))}>
                <Calendar className="size-4" /> Programar
              </Button>
              <Button variant="outline" size="sm" onClick={() => Promise.all(selectedItems.map(id => updateContentStatus({ id, status: "PUBLISHED" })))}>
                <Send className="size-4" /> Publicar
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

      <ContentTable
        items={mappedContent}
        selectedItems={selectedItems}
        onSelectItems={setSelectedItems}
        viewMode={viewMode}
        onDeleteItem={handleDelete}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando 1-{mappedContent.length} de {mappedContent.length} contenidos
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Anterior</Button>
          <Button variant="outline" size="sm" disabled>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}
