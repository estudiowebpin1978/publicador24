"use client"

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel</h1>
        <p className="text-muted-foreground">
          ¡Bienvenido de nuevo! Acá tenés un resumen de tu contenido.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Publicación</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard title="Borradores" value={12} icon={FileText} iconColor="text-violet-600" />
          <StatsCard title="Programadas" value={8} change={12} icon={Calendar} iconColor="text-blue-600" />
          <StatsCard title="Publicadas" value={45} change={23} icon={CheckCircle} iconColor="text-green-600" />
          <StatsCard title="Fallidas" value={3} change={-15} icon={XCircle} iconColor="text-red-600" />
          <StatsCard title="Pendientes" value={5} icon={Clock} iconColor="text-amber-600" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Interacción</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Interacción" value="12,450" change={18} icon={Heart} iconColor="text-pink-600" />
          <StatsCard title="Seguidores" value="3,280" change={5} icon={Users} iconColor="text-indigo-600" />
          <StatsCard title="Alcance" value="45,200" change={32} icon={Eye} iconColor="text-cyan-600" />
          <StatsCard title="Impresiones" value="89,100" change={14} icon={BarChart3} iconColor="text-orange-600" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Interacción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="engagement" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <RecentContent />
        </div>
      </div>

      <QuickActions />
    </div>
  )
}
