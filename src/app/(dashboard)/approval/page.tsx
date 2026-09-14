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
import { CheckCircle, XCircle, Clock, Eye, FileText } from "lucide-react"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

export default function ApprovalPage() {
  const contentPieces = useQuery(api.contentPieces.list, { status: "GENERATED" })
  const scheduledPosts = useQuery(api.scheduledPosts.list, { status: "QUEUED" })
  const publishedPosts = useQuery(api.publishedPosts.list)
  const updatePieceStatus = useMutation(api.contentPieces.updateStatus)
  const removePiece = useMutation(api.contentPieces.remove)

  const [selectedPiece, setSelectedPiece] = React.useState<string | null>(null)
  const [showDetail, setShowDetail] = React.useState(false)

  const pendingPieces = contentPieces || []
  const pendingCount = pendingPieces.length
  const scheduledCount = scheduledPosts?.length || 0
  const publishedCount = publishedPosts?.length || 0

  const selectedPieceData = pendingPieces.find((p: any) => p._id === selectedPiece)

  const handleApprove = async (id: string) => {
    try {
      await updatePieceStatus({ id, status: "APPROVED" })
    } catch (error) {
      console.error("Failed to approve:", error)
    }
    setShowDetail(false)
  }

  const handleReject = async (id: string) => {
    try {
      await removePiece({ id })
    } catch (error) {
      console.error("Failed to reject:", error)
    }
    setShowDetail(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Aprobación</h1>
        <p className="text-muted-foreground">
          Revisá y aprobá el contenido generado por IA antes de programar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-amber-600">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-blue-600">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Programadas</p>
              <p className="text-2xl font-bold">{scheduledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-green-600">
              <CheckCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Publicadas</p>
              <p className="text-2xl font-bold">{publishedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Contenido Pendiente de Aprobación</span>
            <Badge variant="secondary">{pendingCount} elementos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentPieces === undefined ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="size-12 text-muted-foreground mb-4 animate-pulse" />
              <p className="text-sm text-muted-foreground">Cargando contenido...</p>
            </div>
          ) : pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="size-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">¡Todo al día!</p>
              <p className="text-sm text-muted-foreground">Ningún contenido pendiente de aprobación</p>
            </div>
          ) : (
            pendingPieces.map((piece: any) => (
              <div
                key={piece._id}
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{piece.title || piece.hook}</h3>
                    <Badge variant="secondary">{piece.score}/100</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{piece.platform}</span>
                    <span>{piece.contentType}</span>
                    <span>{piece.funnelStage}</span>
                  </div>
                  <p className="mt-2 text-sm line-clamp-2">{piece.body}</p>
                  {piece.hashtags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {piece.hashtags.slice(0, 5).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPiece(piece._id)
                      setShowDetail(true)
                    }}
                  >
                    <Eye className="size-4" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleApprove(piece._id)}
                  >
                    <CheckCircle className="size-4" />
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleReject(piece._id)}
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

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-lg">
          {selectedPieceData && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPieceData.title || selectedPieceData.hook}</DialogTitle>
                <DialogDescription>
                  {selectedPieceData.platform} — {selectedPieceData.contentType}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hook</p>
                  <div className="rounded-lg bg-muted p-3 text-sm font-medium">
                    {selectedPieceData.hook}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contenido</p>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    {selectedPieceData.body}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">CTA</p>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    {selectedPieceData.cta}
                  </div>
                </div>
                {selectedPieceData.hashtags?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPieceData.hashtags.map((h: string) => (
                        <Badge key={h} variant="secondary">{h}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Puntaje</p>
                    <p className="text-lg font-bold">{selectedPieceData.score}/100</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Funnel</p>
                    <p className="text-sm">{selectedPieceData.funnelStage}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleReject(selectedPieceData._id)}>
                  Rechazar
                </Button>
                <Button onClick={() => handleApprove(selectedPieceData._id)}>
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
