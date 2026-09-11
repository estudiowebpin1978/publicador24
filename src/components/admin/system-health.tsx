"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface HealthCheck {
  status: "healthy" | "degraded" | "down"
  latency_ms?: number
  error?: string
}

interface HealthData {
  status: "healthy" | "degraded" | "down"
  timestamp: string
  checks: {
    ai_provider: HealthCheck
    social_platforms: Record<string, HealthCheck>
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "healthy":
      return <CheckCircle className="size-4 text-green-500" />
    case "degraded":
      return <AlertTriangle className="size-4 text-yellow-500" />
    case "down":
      return <XCircle className="size-4 text-red-500" />
    default:
      return <Activity className="size-4 text-gray-500" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "healthy" ? "default" :
    status === "degraded" ? "secondary" :
    "destructive"

  return (
    <Badge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function SystemHealth() {
  const [health, setHealth] = React.useState<HealthData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch("/api/health")
        const data = await response.json()
        setHealth(data)
      } catch {
        console.error("Failed to fetch health status")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/health")
      const data = await response.json()
      setHealth(data)
    } catch {
      console.error("Failed to fetch health status")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Salud del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Cargando estado del sistema...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Salud del Sistema</h3>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Verificar Ahora
        </Button>
      </div>

      {health && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Estado General</CardTitle>
              <StatusBadge status={health.status} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Última verificación: {new Date(health.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Proveedor de IA</CardTitle>
                <StatusIcon status={health.checks.ai_provider.status} />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Latencia</span>
                  <span className="text-xs font-medium">{health.checks.ai_provider.latency_ms || 0}ms</span>
                </div>
                {health.checks.ai_provider.error && (
                  <p className="text-xs text-destructive">{health.checks.ai_provider.error}</p>
                )}
              </CardContent>
            </Card>

            {Object.entries(health.checks.social_platforms).map(([platform, check]) => (
              <Card key={platform}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium capitalize">{platform}</CardTitle>
                  <StatusIcon status={check.status} />
                </CardHeader>
                <CardContent>
                  {check.error && (
                    <p className="text-xs text-muted-foreground">{check.error}</p>
                  )}
                  {!check.error && (
                    <p className="text-xs text-green-600">Configurado</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
