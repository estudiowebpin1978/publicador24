import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import { InstagramIcon, TwitterIcon, YoutubeIcon, LinkedinIcon, TiktokIcon } from "@/components/ui/social-icons"

interface ContentItem {
  id: string
  title: string
  platform: string
  status: "publicado" | "programado" | "borrador" | "fallido"
  image?: string
  date: string
}

const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "10 Tips for Better Social Media Engagement",
    platform: "instagram",
    status: "publicado",
    date: "2 hours ago",
  },
  {
    id: "2",
    title: "Behind the scenes at our office",
    platform: "tiktok",
    status: "programado",
    date: "Tomorrow at 9:00 AM",
  },
  {
    id: "3",
    title: "Weekly Industry Newsletter",
    platform: "linkedin",
    status: "borrador",
    date: "Draft",
  },
  {
    id: "4",
    title: "Product Launch Announcement",
    platform: "x",
    status: "publicado",
    date: "Yesterday",
  },
  {
    id: "5",
    title: "Customer Testimonial Video",
    platform: "youtube",
    status: "fallido",
    date: "3 days ago",
  },
]

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  x: TwitterIcon,
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  publicado: "default",
  programado: "secondary",
  borrador: "outline",
  fallido: "destructive",
}

export function RecentContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contenido Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {mockContent.map((item) => {
            const PlatformIcon = platformIcons[item.platform] || FileText
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <PlatformIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <Badge variant={statusVariants[item.status]} className="capitalize">
                  {item.status}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
