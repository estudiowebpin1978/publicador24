"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PlusCircle,
  Calendar,
  Zap,
  BarChart3,
  Upload,
  Wand2,
  Sparkles,
} from "lucide-react"

const actions = [
  {
    label: "Crear Campaña con IA",
    icon: Sparkles,
    href: "/campaigns/new",
    color: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white",
  },
  {
    label: "Crear Contenido",
    icon: PlusCircle,
    href: "/content/create",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
  {
    label: "Programar Publicación",
    icon: Calendar,
    href: "/calendar",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
  {
    label: "Generar con IA",
    icon: Wand2,
    href: "/campaigns/new",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
  {
    label: "Carga Masiva",
    icon: Upload,
    href: "/content/upload",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
  {
    label: "Ver Analíticas",
    icon: BarChart3,
    href: "/analytics",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
  {
    label: "Piloto Automático",
    icon: Zap,
    href: "/autopilot",
    color: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700",
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="ghost"
                className={`h-auto w-full flex-col gap-2 py-4 ${action.color}`}
              >
                <action.icon className="size-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
