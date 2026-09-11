"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, SlidersHorizontal, X } from "lucide-react"

interface ContentFiltersProps {
  onFilterChange?: (filters: FilterState) => void
  className?: string
}

interface FilterState {
  search: string
  platform: string
  status: string
  dateRange: string
  campaign: string
  score: string
  author: string
  contentType: string
}

export function ContentFilters({ onFilterChange, className }: ContentFiltersProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    platform: "all",
    status: "all",
    dateRange: "all",
    campaign: "all",
    score: "all",
    author: "all",
    contentType: "all",
  })

  const updateFilter = (key: keyof FilterState, value: string | null) => {
    const newFilters = { ...filters, [key]: value ?? "all" }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearFilters = () => {
    const cleared = {
      search: "",
      platform: "all",
      status: "all",
      dateRange: "all",
      campaign: "all",
      score: "all",
      author: "all",
      contentType: "all",
    }
    setFilters(cleared)
    onFilterChange?.(cleared)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "all" && v !== "")

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contenido..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filters.platform} onValueChange={(v) => updateFilter("platform", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Plataformas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="x">X (Twitter)</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="pending">Aprobación Pendiente</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showAdvanced ? "default" : "outline"}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="size-4" />
            Limpiar
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <Select value={filters.dateRange} onValueChange={(v) => updateFilter("dateRange", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el Tiempo</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.campaign} onValueChange={(v) => updateFilter("campaign", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Campañas</SelectItem>
              <SelectItem value="summer-sale">Oferta de Verano</SelectItem>
              <SelectItem value="brand-awareness">Reconocimiento de Marca</SelectItem>
              <SelectItem value="product-launch">Lanzamiento de Producto</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.score} onValueChange={(v) => updateFilter("score", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Puntaje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Puntajes</SelectItem>
              <SelectItem value="high">Alto (80+)</SelectItem>
              <SelectItem value="medium">Medio (50-79)</SelectItem>
              <SelectItem value="low">Bajo (&lt;50)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.author} onValueChange={(v) => updateFilter("author", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Autores</SelectItem>
              <SelectItem value="ai">Generado por IA</SelectItem>
              <SelectItem value="john">John Doe</SelectItem>
              <SelectItem value="jane">Jane Smith</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.contentType} onValueChange={(v) => updateFilter("contentType", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagen</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="carousel">Carrusel</SelectItem>
              <SelectItem value="story">Historia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
