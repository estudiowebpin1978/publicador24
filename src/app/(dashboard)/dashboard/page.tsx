"use client"
export const dynamic = 'force-dynamic'

import { useQuery } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"
import { StatsCard } from "@/components/dashboard/stats-card"
import { RecentContent } from "@/components/dashboard/recent-content"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Users,
  Eye,
  BarChart3,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const chartData = [
  { name: "Lun", posts: 4, engagement: 2400 },
  { name: "Mar", posts: 3, engagement: 1398 },
  { name: "Mié", posts: 5, engagement: 9800 },
  { name: "Jue", posts: 2, engagement: 3908 },
  { name: "Vie", posts: 6, engagement: 4800 },
  { name: "Sáb", posts: 4, engagement: 3800 },
  { name: "Dom", posts: 3, engagement: 4300 },
]

export default function DashboardPage() {
  const accounts = useQuery(api.socialAccounts.list)
  const scheduledPosts = useQuery(api.scheduledPosts.listUpcoming)
  const publishedPosts = useQuery(api.publishedPosts.listRecent)
  const analytics = useQuery(api.analytics.getSummary, { socialAccountId: "", startDate: "", endDate: "" })
  const draftContent = useQuery(api.content.list, { status: "DRAFT" })
  const scheduledContent = useQuery(api.content.list, { status: "SCHEDULED" })
  const publishedContent = useQuery(api.content.list, { status: "PUBLISHED" })

  if (
    accounts === undefined ||
    scheduledPosts === undefined ||
    publishedPosts === undefined ||
    draftContent === undefined ||
    scheduledContent === undefined ||
    publishedContent === undefined
  ) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse bg-muted rounded" />
          <div className="h-4 w-64 mt-2 animate-pulse bg-muted rounded" />
        </div>
        <div>
          <div className="h-4 w-32 mb-3 animate-pulse bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 w-full animate-pulse bg-muted rounded" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-4 w-32 mb-3 animate-pulse bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 w-full animate-pulse bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const totalAccounts = accounts.length
  const totalScheduled = scheduledPosts.length
  const totalPublished = publishedPosts.length
  const engagement = analytics?.totals?.engagement ?? 0
  const followers = analytics?.totals?.followersGained ?? 0
  const reach = analytics?.totals?.reach ?? 0
  const impressions = analytics?.totals?.impressions ?? 0
  const draftCount = draftContent?.length ?? 0
  const scheduledCount = scheduledContent?.length ?? 0
  const publishedCount = publishedContent?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">
          ¡Bienvenido de nuevo! Acá tenés un resumen de tu contenido.
        </p>
      </div>

      {/* Publishing Stats */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Publicación</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Borradores"
            value={draftCount}
            icon={FileText}
            iconColor="text-violet-600"
          />
          <StatsCard
            title="Programadas"
            value={scheduledCount}
            change={12}
            icon={Calendar}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Publicadas"
            value={publishedCount}
            change={23}
            icon={CheckCircle}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Fallidas"
            value={3}
            change={-15}
            icon={XCircle}
            iconColor="text-red-600"
          />
          <StatsCard
            title="Pendientes"
            value={totalScheduled}
            icon={Clock}
            iconColor="text-amber-600"
          />
        </div>
      </div>

      {/* Engagement Stats */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Interacción</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Interacción"
            value={engagement.toLocaleString()}
            change={18}
            icon={Heart}
            iconColor="text-pink-600"
          />
          <StatsCard
            title="Seguidores"
            value={followers.toLocaleString()}
            change={5}
            icon={Users}
            iconColor="text-indigo-600"
          />
          <StatsCard
            title="Alcance"
            value={reach.toLocaleString()}
            change={32}
            icon={Eye}
            iconColor="text-cyan-600"
          />
          <StatsCard
            title="Impresiones"
            value={impressions.toLocaleString()}
            change={14}
            icon={BarChart3}
            iconColor="text-orange-600"
          />
        </div>
      </div>

      {/* Charts and Recent Content */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Interacción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="hsl(262, 83%, 58%)"
                    fill="hsl(262, 83%, 58%)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Content */}
        <div className="lg:col-span-3">
          <RecentContent />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
