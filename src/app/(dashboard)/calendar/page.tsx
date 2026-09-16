"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { CalendarView } from "@/components/calendar/calendar-view"
import { Card, CardContent } from "@/components/ui/card"
import { List, CalendarDays, Clock } from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  platform: string
  status: "published" | "scheduled" | "draft"
  time: string
}

export default function CalendarPage() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calendar-events")
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch {
        // No data yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
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

  const upcomingCount = events.filter(e => new Date(e.date) >= new Date() && e.status === "scheduled").length
  const draftCount = events.filter(e => e.status === "draft").length
  const todayCount = events.filter(e => {
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

      {events.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CardContent className="space-y-3">
            <CalendarDays className="mx-auto size-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay publicaciones programadas todavía.</p>
            <p className="text-xs text-muted-foreground">Creá una campaña y generá contenido para verlo acá.</p>
          </CardContent>
        </Card>
      ) : (
        <CalendarView
          events={events}
          onEventClick={(event) => console.log("Event clicked:", event)}
          onDateClick={(date) => console.log("Date clicked:", date)}
          onAddEvent={() => {}}
        />
      )}
    </div>
  )
}
