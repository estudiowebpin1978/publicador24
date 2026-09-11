"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Eye,
  CheckCircle2,
  XCircle,
  Pencil,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react"
import type { SocialPlatform } from "@/types"

export interface ReviewPanelProps {
  previews: PlatformPreview[]
  onApprove?: () => void
  onReject?: () => void
  onEdit?: () => void
  decision?: "approved" | "rejected" | null
  className?: string
}

export interface PlatformPreview {
  platform: SocialPlatform
  hook: string
  caption: string
  hashtags: string[]
  cta: string
  mediaUrl?: string
  mediaType?: "image" | "video"
}

const platformBadgeColors: Record<SocialPlatform, string> = {
  tiktok: "bg-black text-white",
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-600 text-white",
  x: "bg-black text-white",
  youtube: "bg-red-600 text-white",
  linkedin: "bg-blue-700 text-white",
}

export function ReviewPanel({
  previews,
  onApprove,
  onReject,
  onEdit,
  decision,
  className,
}: ReviewPanelProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="size-4 text-indigo-500" />
          Revisar y Publicar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {previews.map((preview) => (
            <Card key={preview.platform} size="sm" className="overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {preview.mediaUrl ? (
                  preview.mediaType === "video" ? (
                    <video
                      src={preview.mediaUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      src={preview.mediaUrl}
                      alt="Media preview"
                      width={400}
                      height={400}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground/30" />
                )}
              </div>

              <CardContent className="space-y-2.5 p-3">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      platformBadgeColors[preview.platform]
                    )}
                  >
                    {preview.platform.charAt(0).toUpperCase() +
                      preview.platform.slice(1)}
                  </span>
                </div>

                {preview.hook && (
                  <p className="text-xs font-semibold leading-snug">
                    {preview.hook}
                  </p>
                )}

                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
                  {preview.caption}
                </p>

                {preview.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {preview.hashtags.slice(0, 5).map((tag) => (
                      <span key={tag} className="text-xs text-blue-500">
                        {tag}
                      </span>
                    ))}
                    {preview.hashtags.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{preview.hashtags.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {preview.cta && (
                  <Badge variant="default" className="w-full justify-center text-xs">
                    <MessageCircle className="mr-1 size-3" />
                    {preview.cta}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {decision && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border p-3 text-sm font-medium",
              decision === "approved"
                ? "border-green-500/30 bg-green-500/5 text-green-600"
                : "border-red-500/30 bg-red-500/5 text-red-600"
            )}
          >
            {decision === "approved" ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <XCircle className="size-5" />
            )}
            {decision === "approved"
              ? "Contenido aprobado y listo para publicar"
              : "Contenido rechazado — volvé a editar"}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onReject}
            disabled={!!decision}
          >
            <XCircle className="size-4" />
            Rechazar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onEdit}
            disabled={!!decision}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button
            className="flex-1"
            onClick={onApprove}
            disabled={!!decision}
          >
            <CheckCircle2 className="size-4" />
            Aprobar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
