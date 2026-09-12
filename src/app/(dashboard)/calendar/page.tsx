"use client"

import dynamic from 'next/dynamic'

const CalendarPageContent = dynamic(
  () => import('./calendar-content').then(mod => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }
)

export default function CalendarPage() {
  return <CalendarPageContent />
}
