"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react"

type Platform = "instagram" | "tiktok" | "x" | "facebook"

interface PlatformPreviewProps {
  platform: Platform
  content: string
  media?: string
  author?: string
  className?: string
}

const platformStyles: Record<Platform, { name: string; color: string }> = {
  instagram: { name: "Instagram", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500" },
  tiktok: { name: "TikTok", color: "bg-black" },
  x: { name: "X (Twitter)", color: "bg-black" },
  facebook: { name: "Facebook", color: "bg-blue-600" },
}

function InstagramPreview({ content, author }: { content: string; author: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center gap-2 border-b p-3">
        <Avatar size="sm">
          <AvatarFallback>{author[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold">{author}</span>
      </div>
      <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Imagen / Video
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Share2 className="size-5" />
          <Bookmark className="size-5 ml-auto" />
        </div>
        <p className="text-sm font-semibold">1,234 me gusta</p>
        <p className="text-sm">
          <span className="font-semibold">{author}</span>{" "}
          <span className="text-muted-foreground">{content.slice(0, 100)}</span>
        </p>
      </div>
    </div>
  )
}

function TikTokPreview({ content, author }: { content: string; author: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-black text-white">
      <div className="aspect-[9/16] relative max-h-[400px] bg-zinc-900 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-sm text-zinc-400">Video Vista Previa</p>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <Avatar size="sm">
              <AvatarFallback>{author[0]}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">@{author.toLowerCase().replace(" ", "")}</span>
            <Badge variant="secondary" className="text-xs">Seguir</Badge>
          </div>
          <p className="text-sm line-clamp-2">{content.slice(0, 80)}</p>
        </div>
      </div>
    </div>
  )
}

function XPreview({ content, author }: { content: string; author: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback>{author[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm">{author}</span>
              <span className="text-muted-foreground text-sm">@{author.toLowerCase().replace(" ", "_")}</span>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-muted-foreground">
          <button className="flex items-center gap-1 text-sm hover:text-blue-500">
            <MessageCircle className="size-4" /> 12
          </button>
          <button className="flex items-center gap-1 text-sm hover:text-green-500">
            <Share2 className="size-4" /> 5
          </button>
          <button className="flex items-center gap-1 text-sm hover:text-pink-500">
            <Heart className="size-4" /> 89
          </button>
        </div>
      </div>
    </div>
  )
}

function FacebookPreview({ content, author }: { content: string; author: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{author[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{author}</p>
            <p className="text-xs text-muted-foreground">Recién - Público</p>
          </div>
        </div>
        <p className="text-sm">{content}</p>
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
          Imagen / Video
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-muted-foreground text-sm">
          <span>124 Me gusta</span>
          <span>18 Comentarios</span>
          <span>6 Compartidos</span>
        </div>
      </div>
    </div>
  )
}

export function PlatformPreview({ platform, content, author = "John Doe", className }: PlatformPreviewProps) {
  const style = platformStyles[platform]

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn("size-2 rounded-full", style.color)} />
          <CardTitle className="text-sm">{style.name} Vista Previa</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {platform === "instagram" && <InstagramPreview content={content} author={author} />}
        {platform === "tiktok" && <TikTokPreview content={content} author={author} />}
        {platform === "x" && <XPreview content={content} author={author} />}
        {platform === "facebook" && <FacebookPreview content={content} author={author} />}
      </CardContent>
    </Card>
  )
}
