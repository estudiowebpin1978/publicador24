"use client"
export const dynamic = 'force-dynamic'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatsCard } from "@/components/dashboard/stats-card"
import { Heart, Users, Eye, BarChart3 } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

interface AnalyticsSummary {
  totalImpressions: number
  totalReach: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalClicks: number
  totalViews: number
  followersGained: number
}

interface DailyData {
  date: string
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  clicks: number
  views: number
  engagement: number
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState("7d")
  const [platform, setPlatform] = React.useState("all")
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null)
  const [dailyData, setDailyData] = React.useState<DailyData[]>([])
  const [loading, setLoading] = React.useState(true)

  const handleDateRangeChange = (value: string | null) => {
    if (value) setDateRange(value)
  }
  const handlePlatformChange = (value: string | null) => {
    if (value) setPlatform(value)
  }

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ range: dateRange })
        if (platform !== "all") params.set("platform", platform)
        const res = await fetch(`/api/analytics?${params}`)
        if (res.ok) {
          const data = await res.json()
          setSummary(data.summary || null)
          setDailyData(data.daily || [])
        }
      } catch {
        // No data yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateRange, platform])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analíticas</h1>
            <p className="text-muted-foreground">Seguí el rendimiento y crecimiento de tus redes sociales.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-20 animate-pulse bg-muted" /></Card>
        </div>
      </div>
    )
  }

  const totals: AnalyticsSummary = summary || {
    totalImpressions: 0, totalReach: 0, totalLikes: 0, totalComments: 0,
    totalShares: 0, totalClicks: 0, totalViews: 0, followersGained: 0,
  }

  const totalEngagement = totals.totalLikes + totals.totalComments + totals.totalShares

  const engagementData = dailyData.map((day) => ({
    name: new Date(day.date).toLocaleDateString("es-AR", { weekday: "short" }),
    likes: day.likes,
    comments: day.comments,
    shares: day.shares,
  }))

  const followerData = dailyData.map((day) => ({
    name: new Date(day.date).toLocaleDateString("es-AR", { weekday: "short" }),
    impressions: day.impressions,
    reach: day.reach,
  }))

  const hasData = dailyData.length > 0 && totalEngagement > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analíticas</h1>
          <p className="text-muted-foreground">Seguí el rendimiento y crecimiento de tus redes sociales.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={handlePlatformChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasData ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CardContent className="space-y-3">
            <BarChart3 className="mx-auto size-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay datos suficientes todavía.</p>
            <p className="text-xs text-muted-foreground">Publicá contenido y las métricas aparecerán acá.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Impresiones" value={formatNumber(totals.totalImpressions)} change={0} icon={BarChart3} iconColor="text-orange-600" />
            <StatsCard title="Alcance" value={formatNumber(totals.totalReach)} change={0} icon={Eye} iconColor="text-cyan-600" />
            <StatsCard title="Interacción Total" value={formatNumber(totalEngagement)} change={0} icon={Heart} iconColor="text-pink-600" />
            <StatsCard title="Seguidores Ganados" value={formatNumber(totals.followersGained)} change={0} icon={Users} iconColor="text-indigo-600" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Interacción en el Tiempo</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="likes" stackId="1" stroke="#E1306C" fill="#E1306C" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="comments" stackId="1" stroke="#1DA1F2" fill="#1DA1F2" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="shares" stackId="1" stroke="#4267B2" fill="#4267B2" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Impresiones y Alcance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={followerData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Bar dataKey="impressions" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reach" fill="hsl(180, 70%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Resumen por Plataforma</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Likes</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalLikes)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Comentarios</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalComments)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Compartidos</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.totalShares)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
