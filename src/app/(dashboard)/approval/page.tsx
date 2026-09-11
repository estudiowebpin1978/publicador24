"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react"

const pendingApprovals = [
  {
    id: "1",
    title: "10 Consejos para el Éxito en Marketing en Redes Sociales",
    platforms: ["instagram", "x"],
    scheduledFor: "20 Ene, 2024 a las 10:00 AM",
    author: "Generado por IA",
    content: "¡Noticias emocionantes sobre nuestra última actualización! Estamos felices de compartir esto con nuestra valiosa comunidad. ¡Échenle un vistazo y cuéntennos qué piensan!",
    hashtags: ["#marketing", "#consejos", "#redessociales"],
    score: 92,
    requestedBy: "Auto IA",
  },
  {
    id: "2",
    title: "Detrás de Escena: Lanzamiento de Producto",
    platforms: ["tiktok"],
    scheduledFor: "21 Ene, 2024 a las 2:00 PM",
    author: "Generado por IA",
    content: "Esperen... ¡Esto cambia todo! Manténganse atentos para más novedades emocionantes.",
    hashtags: ["#detrasescena", "#lanzamiento", "#emocionante"],
    score: 87,
    requestedBy: "Auto IA",
  },
  {
    id: "3",
    title: "Resumen Semanal de la Industria",
    platforms: ["linkedin", "x"],
    scheduledFor: "22 Ene, 2024 a las 9:00 AM",
    author: "Generado por IA",
    content: "Esto pasó esta semana en nuestra industria: tendencias clave, insights y lo que significa para tu negocio.",
    hashtags: ["#industria", "#tendencias", "#semanal"],
    score: 78,
    requestedBy: "Auto IA",
  },
]

export default function ApprovalPage() {
  const [approvals, setApprovals] = React.useState(pendingApprovals)
  const [selectedApproval, setSelectedApproval] = React.useState<string | null>(null)
  const [showDetail, setShowDetail] = React.useState(false)

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id))
    setShowDetail(false)
  }

  const handleReject = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id))
    setShowDetail(false)
  }

  const selectedApprovalData = approvals.find((a) => a.id === selectedApproval)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Aprobación</h1>
        <p className="text-muted-foreground">
          Revisá y aprobá el contenido generado por IA antes de publicar.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold">{approvals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-green-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aprobadas Hoy</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-red-600">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rechazadas Hoy</p>
              <p className="text-2xl font-bold">1</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aprobaciones Pendientes</span>
            <Badge variant="secondary">{approvals.length} elementos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="size-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">¡Todo al día!</p>
              <p className="text-sm text-muted-foreground">Ningún contenido pendiente de aprobación</p>
            </div>
          ) : (
            approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{approval.title}</h3>
                    <Badge variant="secondary">{approval.score}/100</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {approval.scheduledFor}
                    </span>
                    <span>{approval.platforms.join(", ")}</span>
                    <span>por {approval.author}</span>
                  </div>
                  <p className="mt-2 text-sm line-clamp-2">{approval.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApproval(approval.id)
                      setShowDetail(true)
                    }}
                  >
                    <Eye className="size-4" />
                    Vista Previa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleApprove(approval.id)}
                  >
                    <CheckCircle className="size-4" />
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleReject(approval.id)}
                  >
                    <XCircle className="size-4" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-lg">
          {selectedApprovalData && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApprovalData.title}</DialogTitle>
                <DialogDescription>
                  Programado para {selectedApprovalData.scheduledFor}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contenido</p>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    {selectedApprovalData.content}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Plataformas</p>
                  <div className="flex gap-2">
                    {selectedApprovalData.platforms.map((p) => (
                      <Badge key={p} variant="outline">{p}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hashtags</p>
                  <div className="flex gap-1">
                    {selectedApprovalData.hashtags.map((h) => (
                      <Badge key={h} variant="secondary">{h}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Puntaje</p>
                    <p className="text-lg font-bold">{selectedApprovalData.score}/100</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solicitado por</p>
                    <p className="text-sm">{selectedApprovalData.requestedBy}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleReject(selectedApprovalData.id)}>
                  Rechazar
                </Button>
                <Button onClick={() => handleApprove(selectedApprovalData.id)}>
                  Aprobar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
