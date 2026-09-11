"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import {
  InstagramIcon,
  TwitterIcon,
  FacebookIcon,
  YoutubeIcon,
  LinkedinIcon,
  TiktokIcon,
} from "@/components/ui/social-icons"

interface ConnectDialogProps {
  onConnect?: (platform: string) => void
  className?: string
}

const platforms = [
  { id: "instagram", name: "Instagram", icon: InstagramIcon, color: "text-pink-500", description: "Compartí fotos, historias y reels" },
  { id: "x", name: "X (Twitter)", icon: TwitterIcon, color: "text-sky-500", description: "Compartí pensamientos y novedades" },
  { id: "facebook", name: "Facebook", icon: FacebookIcon, color: "text-blue-600", description: "Conectá con tu audiencia" },
  { id: "youtube", name: "YouTube", icon: YoutubeIcon, color: "text-red-600", description: "Compartí videos y contenido" },
  { id: "linkedin", name: "LinkedIn", icon: LinkedinIcon, color: "text-blue-700", description: "Networking profesional" },
  { id: "tiktok", name: "TikTok", icon: TiktokIcon, color: "text-foreground", description: "Contenido de video corto" },
]

export function ConnectDialog({ onConnect }: ConnectDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button />}
      >
        <Plus className="size-4" />
        Conectar Nueva Cuenta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Cuenta Social</DialogTitle>
          <DialogDescription>
            Elegí una plataforma para conectar a tu cuenta de Auto Publisher
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {platforms.map((platform) => {
            const Icon = platform.icon
            return (
              <button
                key={platform.id}
                onClick={() => {
                  onConnect?.(platform.id)
                  setOpen(false)
                }}
                className="flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-muted"
              >
                <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", platform.color)}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{platform.name}</p>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </div>
                <Badge variant="secondary">Conectar</Badge>
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
