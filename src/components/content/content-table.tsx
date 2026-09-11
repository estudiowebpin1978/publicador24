"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
} from "lucide-react"
import { InstagramIcon, TwitterIcon, FacebookIcon, TiktokIcon } from "@/components/ui/social-icons"

interface ContentItem {
  id: string
  title: string
  platforms: string[]
  status: "draft" | "scheduled" | "published" | "failed" | "pending"
  score: number
  date: string
  author: string
  type: string
}

interface ContentTableProps {
  items: ContentItem[]
  selectedItems: string[]
  onSelectItems: (ids: string[]) => void
  onViewItem?: (id: string) => void
  onEditItem?: (id: string) => void
  onDeleteItem?: (id: string) => void
  viewMode?: "table" | "grid"
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  scheduled: { label: "Programado", variant: "default" },
  published: { label: "Publicado", variant: "outline" },
  failed: { label: "Fallido", variant: "destructive" },
  pending: { label: "Pendiente", variant: "secondary" },
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  x: TwitterIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
}

const platformColors: Record<string, string> = {
  instagram: "text-pink-500",
  x: "text-sky-500",
  facebook: "text-blue-600",
  tiktok: "text-foreground",
  linkedin: "text-blue-700",
  youtube: "text-red-600",
}

function ContentGrid({ items, selectedItems, onSelectItems }: ContentTableProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "group relative rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
            selectedItems.includes(item.id) && "ring-2 ring-primary"
          )}
        >
          <div className="absolute top-3 left-3">
            <Checkbox
              checked={selectedItems.includes(item.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectItems([...selectedItems, item.id])
                } else {
                  onSelectItems(selectedItems.filter((id) => id !== item.id))
                }
              }}
            />
          </div>
          <div className="aspect-[4/3] rounded-lg bg-muted mb-3 flex items-center justify-center text-muted-foreground text-xs">
            Vista previa
          </div>
          <h3 className="font-medium text-sm line-clamp-2 mb-2">{item.title}</h3>
          <div className="flex items-center gap-1 mb-2">
            {item.platforms.map((p) => {
              const Icon = platformIcons[p]
              return Icon ? (
                <Icon key={p} className={cn("size-4", platformColors[p])} />
              ) : null
            })}
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={statusConfig[item.status]?.variant || "secondary"}>
              {statusConfig[item.status]?.label || item.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.score}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ContentTable({
  items,
  selectedItems,
  onSelectItems,
  onViewItem,
  onEditItem,
  onDeleteItem,
  viewMode = "table",
}: ContentTableProps) {
  const allSelected = items.length > 0 && selectedItems.length === items.length

  const toggleAll = () => {
    if (allSelected) {
      onSelectItems([])
    } else {
      onSelectItems(items.map((item) => item.id))
    }
  }

  if (viewMode === "grid") {
    return (
      <ContentGrid
        items={items}
        selectedItems={selectedItems}
        onSelectItems={onSelectItems}
      />
    )
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Plataformas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Puntaje</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectItems([...selectedItems, item.id])
                    } else {
                      onSelectItems(selectedItems.filter((id) => id !== item.id))
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    Vista previa
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.author}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {item.platforms.map((p) => {
                    const Icon = platformIcons[p]
                    return Icon ? (
                      <Icon key={p} className={cn("size-4", platformColors[p])} />
                    ) : null
                  })}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusConfig[item.status]?.variant || "secondary"}>
                  {statusConfig[item.status]?.label || item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.score >= 80 ? "bg-green-500" : item.score >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{item.score}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewItem?.(item.id)}>
                      <Eye className="size-4" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditItem?.(item.id)}>
                      <Edit className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="size-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Calendar className="size-4" />
                      Programar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDeleteItem?.(item.id)}>
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
