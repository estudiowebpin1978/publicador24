"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { CalendarView } from "@/components/calendar/calendar-view"
import { Card, CardContent } from "@/components/ui/card"
import { List, CalendarDays, Clock } from "lucide-react"
import { useQuery } from "@/hooks/use-convex"
import { api } from "@convex/_generated/api"

export default function CalendarPage() {
  const scheduledPosts = useQuery(api.scheduledPosts.listUpcoming)
  const contentPieces = useQuery(api.contentPieces.list)
  const contents = useQuery(api.content.list)

  if (scheduledPosts === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
            <p className="text-muted-foreground">Visualizá y gestioná tu calendario de contenido.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
        </div>
        <Card className="animate-pulse"><CardContent className="h-96" /></Card>
      </div>
    )
  }

  const pieceMap = new Map((contentPieces || []).map((p: any) => [p._id, p]))
  const contentMap = new Map((contents || []).map((c: any) => [c._id, c]))

  const events = scheduledPosts.map((post: any) => {
    let title = "Publicación programada"
    if (post.contentPieceId) {
      const piece = pieceMap.get(post.contentPieceId)
      if (piece) title = piece.title || piece.hook || title
    } else if (post.contentId) {
      const content = contentMap.get(post.contentId)
      if (content) title = content.title || title
    }
    return {
      id: post._id,
      title,
      date: new Date(post.scheduledAt),
      platform: post.platform,
      status: post.status === "PUBLISHED" ? "published" : post.status === "QUEUED" ? "scheduled" : "draft",
      time: new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })

  const upcomingCount = events.filter((e: any) => new Date(e.date) >= new Date() && e.status === "scheduled").length
  const draftCount = events.filter((e: any) => e.status === "draft").length
  const todayCount = events.filter((e: any) => {
    const today = new Date()
    const eventDate = new Date(e.date)
    return eventDate.getDate() === today.getDate() &&
           eventDate.getMonth() === today.getMonth() &&
           eventDate.getFullYear() === today.getFullYear()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground">Visualizá y gestioná tu calendario de contenido.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-blue-600">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Publicaciones de Hoy</p>
              <p className="text-2xl font-bold">{todayCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-violet-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próximas</p>
              <p className="text-2xl font-bold">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-amber-600">
              <List className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Borradores</p>
              <p className="text-2xl font-bold">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CalendarView
        events={events}
        onEventClick={(event) => console.log("Event clicked:", event)}
        onDateClick={(date) => console.log("Date clicked:", date)}
        onAddEvent={() => console.log("Add event")}
      />
    </div>
  )
}
