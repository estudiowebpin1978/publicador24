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
import {
  Heart,
  Users,
  Eye,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { InstagramIcon, TwitterIcon, FacebookIcon } from "@/components/ui/social-icons"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useQuery } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  x: TwitterIcon,
  facebook: FacebookIcon,
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

export default function AnalyticsPageContent() {
  const [dateRange, setDateRange] = React.useState("7d")
  const [platform, setPlatform] = React.useState("all")
  const [socialAccountId, setSocialAccountId] = React.useState("")

  const handleDateRangeChange = (value: string | null) => {
    if (value) setDateRange(value)
  }
  const handlePlatformChange = (value: string | null) => {
    if (value) setPlatform(value)
  }

  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const today = new Date().toISOString().split("T")[0]

  const accounts = useQuery(api.socialAccounts.list)
  const summary = useQuery(api.analytics.getSummary, { socialAccountId: socialAccountId || "", startDate, endDate })
  const dailyAnalytics = useQuery(api.analytics.getDailyByDate, { date: today })

  if (summary === undefined || dailyAnalytics === undefined) {
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
                <SelectItem value="year">Este año</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Plataformas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="x">X (Twitter)</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="h-[300px] animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-[300px] animate-pulse bg-muted" /></Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card><CardContent className="h-[200px] animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-[200px] animate-pulse bg-muted" /></Card>
          <Card><CardContent className="h-[200px] animate-pulse bg-muted" /></Card>
        </div>
      </div>
    )
  }

  const totals = summary.totals
  const engagementData = dailyAnalytics.map((day: any) => ({
    name: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
    likes: Math.floor(day.engagement * 0.5),
    comments: Math.floor(day.engagement * 0.3),
    shares: Math.floor(day.engagement * 0.2),
  }))

  const followerData = dailyAnalytics.map((day: any) => ({
    name: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
    followers: day.followers,
  }))

  const platformData = [
    { name: "Instagram", value: 45, color: "#E1306C" },
    { name: "X", value: 25, color: "#1DA1F2" },
    { name: "Facebook", value: 20, color: "#4267B2" },
    { name: "TikTok", value: 10, color: "#000000" },
  ]

  const topPosts = [
    { id: "1", title: "10 Tips for Marketing", platform: "instagram", engagement: formatNumber(totals.engagement), change: 12 },
    { id: "2", title: "Behind the Scenes", platform: "tiktok", engagement: formatNumber(Math.floor(totals.engagement * 0.75)), change: 25 },
    { id: "3", title: "Industry Insights", platform: "x", engagement: formatNumber(Math.floor(totals.engagement * 0.4)), change: 8 },
    { id: "4", title: "Product Launch", platform: "facebook", engagement: formatNumber(Math.floor(totals.engagement * 0.3)), change: -5 },
  ]

  const bestTimes = [
    { hour: "6AM", engagement: 120 },
    { hour: "9AM", engagement: 340 },
    { hour: "12PM", engagement: 280 },
    { hour: "3PM", engagement: 190 },
    { hour: "6PM", engagement: 420 },
    { hour: "9PM", engagement: 350 },
  ]

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
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={handlePlatformChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Plataformas</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="x">X (Twitter)</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          {accounts && (
            <Select value={socialAccountId} onValueChange={(v) => setSocialAccountId(v || "")}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las Cuentas</SelectItem>
                {accounts.map((acc: any) => (
                  <SelectItem key={acc._id} value={acc._id}>
                    {acc.displayName || acc.username} (@{acc.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total de Seguidores" value={formatNumber(totals.followersGained + (dailyAnalytics[0]?.followers || 0))} change={5} icon={Users} iconColor="text-indigo-600" />
        <StatsCard title="Interacción Total" value={formatNumber(totals.engagement)} change={18} icon={Heart} iconColor="text-pink-600" />
        <StatsCard title="Alcance Total" value={formatNumber(totals.reach)} change={32} icon={Eye} iconColor="text-cyan-600" />
        <StatsCard title="Impresiones" value={formatNumber(totals.impressions)} change={14} icon={BarChart3} iconColor="text-orange-600" />
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
          <CardHeader><CardTitle>Crecimiento de Seguidores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followerData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="followers" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Mejores Publicaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topPosts.map((post) => {
              const Icon = platformIcons[post.platform]
              return (
                <div key={post.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="size-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{post.engagement} interacción</p>
                    </div>
                  </div>
                  <span className={cn(
                    "flex items-center text-xs font-medium",
                    post.change >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {post.change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {Math.abs(post.change)}%
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribución por Plataforma</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {platformData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mejores Horarios para Publicar</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestTimes}>
                  <XAxis dataKey="hour" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
