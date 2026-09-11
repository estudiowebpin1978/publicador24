"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  platform: string
  status: "scheduled" | "published" | "draft"
  time?: string
}

interface CalendarViewProps {
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onAddEvent?: () => void
  className?: string
}

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500",
  x: "bg-sky-500",
  facebook: "bg-blue-600",
  tiktok: "bg-foreground",
  linkedin: "bg-blue-700",
  youtube: "bg-red-600",
}

const statusColors: Record<string, string> = {
  scheduled: "border-blue-500",
  published: "border-green-500",
  draft: "border-gray-400",
}

export function CalendarView({
  events = [],
  onEventClick,
  onDateClick,
  onAddEvent,
  className,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(new Date())

  const today = new Date()

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    )
  }

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      )
    })
  }

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(date)
    onDateClick?.(date)
  }

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon-sm" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
          <Button onClick={onAddEvent}>
            <Plus className="size-4" />
            Agregar Publicación
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border overflow-hidden">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r bg-muted/20" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDay(day)
            return (
              <div
                key={day}
                className={cn(
                  "min-h-[100px] border-b border-r p-2 cursor-pointer transition-colors hover:bg-muted/50",
                  isSelected(day) && "bg-primary/5",
                )}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm",
                      isToday(day) && "bg-primary text-primary-foreground font-bold",
                      !isToday(day) && "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(event)
                      }}
                      className={cn(
                        "w-full truncate rounded-md border-l-2 bg-muted/50 px-2 py-1 text-left text-xs hover:bg-muted",
                        statusColors[event.status] || "border-gray-400"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", platformColors[event.platform])} />
                        {event.time && <span className="text-muted-foreground">{event.time}</span>}
                      </div>
                      <span className="line-clamp-1">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{dayEvents.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-pink-500" />
          Instagram
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-sky-500" />
          X
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-blue-600" />
          Facebook
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-red-600" />
          YouTube
        </div>
      </div>
    </div>
  )
}
