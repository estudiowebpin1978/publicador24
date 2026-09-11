"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminStats } from "@/components/admin/admin-stats"
import { SystemHealth } from "@/components/admin/system-health"
import {
  KeyRound,
  AlertTriangle,
  Cpu,
  RefreshCw,
} from "lucide-react"

export default function AdminPage() {
  const [stats, setStats] = React.useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats")
        const data = await response.json()
        if (!cancelled && data.success) {
          setStats(data.data)
        }
      } catch {
        console.error("Failed to fetch admin stats")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch {
      console.error("Failed to fetch admin stats")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando datos de administración...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Resumen del sistema y herramientas de gestión.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
          <TabsTrigger value="jobs">Trabajos Fallidos</TabsTrigger>
          <TabsTrigger value="ai">Uso de IA</TabsTrigger>
          <TabsTrigger value="health">Salud del Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminStats stats={stats} />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                Cuentas Conectadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats && typeof stats === 'object' && 'accounts' in stats && typeof stats.accounts === 'object' && stats.accounts !== null && 'by_status' in stats.accounts
                  ? Object.entries(stats.accounts.by_status as Record<string, number>).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full ${
                            status === "CONNECTED" ? "bg-green-500" :
                            status === "TOKEN_EXPIRED" ? "bg-yellow-500" :
                            status === "ERROR" ? "bg-red-500" :
                            "bg-gray-500"
                          }`} />
                          <span className="text-sm font-medium">{status}</span>
                        </div>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))
                  : <p className="text-muted-foreground">No hay datos de cuentas disponibles</p>
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                Trabajos Fallidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {stats && typeof stats === 'object' && 'failed_jobs' in stats && typeof stats.failed_jobs === 'object' && stats.failed_jobs !== null && 'total' in stats.failed_jobs
                    ? `${(stats.failed_jobs as { total: number }).total} trabajos fallidos en los últimos 30 días`
                    : "No hay datos de trabajos fallidos"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-5" />
                Uso de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total de Tokens Usados</p>
                  <p className="text-2xl font-bold">
                    {stats && typeof stats === 'object' && 'ai_usage' in stats && typeof stats.ai_usage === 'object' && stats.ai_usage !== null && 'total_tokens' in stats.ai_usage
                      ? (stats.ai_usage as { total_tokens: number }).total_tokens.toLocaleString()
                      : "0"
                    }
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Costo Total</p>
                  <p className="text-2xl font-bold">
                    ${stats && typeof stats === 'object' && 'ai_usage' in stats && typeof stats.ai_usage === 'object' && stats.ai_usage !== null && 'total_cost' in stats.ai_usage
                      ? (stats.ai_usage as { total_cost: number }).total_cost.toFixed(4)
                      : "0.00"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <SystemHealth />
        </TabsContent>
      </Tabs>
    </div>
  )
}
