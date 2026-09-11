"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  X,
  Image as ImageIcon,
  Video,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Package,
} from "lucide-react"

export interface ContentInputProps {
  onSubmit?: (data: ContentInputData) => void
  isAnalyzing?: boolean
  className?: string
}

export interface ContentInputData {
  text: string
  url: string
  productName: string
  image: File | null
  video: File | null
}

export function ContentInput({ onSubmit, isAnalyzing, className }: ContentInputProps) {
  const [text, setText] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [productName, setProductName] = React.useState("")
  const [image, setImage] = React.useState<File | null>(null)
  const [video, setVideo] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [videoPreview, setVideoPreview] = React.useState<string | null>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideo(file)
      const reader = new FileReader()
      reader.onloadend = () => setVideoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent, type: "image" | "video") => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (type === "image" && file.type.startsWith("image/")) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    } else if (type === "video" && file.type.startsWith("video/")) {
      setVideo(file)
      const reader = new FileReader()
      reader.onloadend = () => setVideoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    onSubmit?.({ text, url, productName, image, video })
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" />
          Ingresar Contenido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="content-text">Ideas / Frases</Label>
          <Textarea
            id="content-text"
            placeholder="Describí tu idea, pegá un guión o escribí tu contenido..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-28"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content-url" className="flex items-center gap-1.5">
            <LinkIcon className="size-3.5" />
            URL
          </Label>
          <Input
            id="content-url"
            type="url"
            placeholder="https://example.com/article-or-product"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-name" className="flex items-center gap-1.5">
            <Package className="size-3.5" />
            Nombre del Producto
          </Label>
          <Input
            id="product-name"
            placeholder="ej: ProBrand Social Suite"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Imagen</Label>
            <div
              className="relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-4 text-center transition-colors hover:border-muted-foreground/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "image")}
              onClick={() => imageInputRef.current?.click()}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Vista previa"
                    width={96}
                    height={96}
                    className="max-h-24 rounded object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImage(null)
                      setImagePreview(null)
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </>
              ) : (
                <>
                  <ImageIcon className="size-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Arrastrá y soltá o hacé clic
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Video</Label>
            <div
              className="relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-4 text-center transition-colors hover:border-muted-foreground/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "video")}
              onClick={() => videoInputRef.current?.click()}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />
              {videoPreview ? (
                <>
                  <video
                    src={videoPreview}
                    className="max-h-24 rounded"
                    muted
                    playsInline
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      setVideo(null)
                      setVideoPreview(null)
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Video className="size-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Arrastrá y soltá o hacé clic
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing || (!text && !url && !productName && !image && !video)}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="size-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Analizar con IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
