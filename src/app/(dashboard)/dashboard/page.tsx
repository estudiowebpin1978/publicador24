"use client"

import dynamic from 'next/dynamic'

const DashboardPageContent = dynamic(
  () => import('./dashboard-content').then(mod => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }
)

export default function DashboardPage() {
  return <DashboardPageContent />
}
