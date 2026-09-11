"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Hash } from "lucide-react"
import { InstagramIcon, TwitterIcon, FacebookIcon } from "@/components/ui/social-icons"

interface ManualEditorProps {
  onSave?: (content: ManualContent) => void
  className?: string
}

interface ManualContent {
  text: string
  platforms: string[]
  media: File[]
  hashtags: string[]
  scheduleDate: string
  scheduleTime: string
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  x: TwitterIcon,
  facebook: FacebookIcon,
}

export function ManualEditor({ onSave, className }: ManualEditorProps) {
  const [content, setContent] = React.useState<ManualContent>({
    text: "",
    platforms: [],
    media: [],
    hashtags: [],
    scheduleDate: "",
    scheduleTime: "",
  })
  const [hashtagInput, setHashtagInput] = React.useState("")

  const togglePlatform = (platform: string) => {
    setContent((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const addHashtag = () => {
    if (hashtagInput.trim() && !content.hashtags.includes(hashtagInput.trim())) {
      setContent((prev) => ({
        ...prev,
        hashtags: [...prev.hashtags, hashtagInput.trim()],
      }))
      setHashtagInput("")
    }
  }

  const removeHashtag = (tag: string) => {
    setContent((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((t) => t !== tag),
    }))
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Escribí tu contenido acá..."
            className="min-h-[200px]"
            value={content.text}
            onChange={(e) => setContent({ ...content, text: e.target.value })}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.text.length} caracteres</span>
            <span>~{Math.ceil(content.text.split(/\s+/).filter(Boolean).length / 2)}s tiempo de lectura</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plataformas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["instagram", "x", "facebook", "linkedin", "tiktok"].map((platform) => {
              const Icon = platformIcons[platform]
              return (
                <Button
                  key={platform}
                  variant={content.platforms.includes(platform) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlatform(platform)}
                >
                  {Icon && <Icon className="size-4" />}
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border-2 border-dashed p-8 text-center">
            <Upload className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Arrastrá y soltá imágenes o videos, o hacé clic para buscar
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Elegir Archivos
            </Button>
          </div>
          {content.media.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {content.media.map((file, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {file.name}
                  <button onClick={() => {
                    setContent((prev) => ({
                      ...prev,
                      media: prev.media.filter((_, idx) => idx !== i),
                    }))
                  }}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hashtags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Agregar hashtag..."
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
            />
            <Button onClick={addHashtag} size="icon">
              <Hash className="size-4" />
            </Button>
          </div>
          {content.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button onClick={() => removeHashtag(tag)}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={content.scheduleDate}
                onChange={(e) => setContent({ ...content, scheduleDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={content.scheduleTime}
                onChange={(e) => setContent({ ...content, scheduleTime: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Guardar Borrador</Button>
        <Button onClick={() => onSave?.(content)}>Programar Publicación</Button>
      </div>
    </div>
  )
}
