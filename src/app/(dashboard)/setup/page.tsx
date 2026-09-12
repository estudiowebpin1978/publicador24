"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function SetupPage() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [message, setMessage] = useState("Probando conexión...")

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(() => {
        setStatus("connected")
        setMessage("Buffer conectado. Configurá BUFFER_API_KEY en Netlify.")
      })
      .catch(() => {
        setStatus("disconnected")
        setMessage("Buffer no conectado. Agregá BUFFER_API_KEY en Netlify.")
      })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración API</h1>
        <p className="text-muted-foreground">Conectá Buffer para publicar en redes sociales</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buffer API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {status === "connected" ? (
              <CheckCircle className="size-5 text-green-600" />
            ) : (
              <AlertCircle className="size-5 text-amber-500" />
            )}
            <span className={status === "connected" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
              {message}
            </span>
          </div>

          <div className="rounded-md bg-muted p-4 text-sm space-y-2">
            <p><strong>Pasos:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Creá cuenta en <a href="https://buffer.com" className="underline">buffer.com</a></li>
              <li>Andá a Settings → API → Crear API Key</li>
              <li>Pegá la key en Netlify: <code className="bg-background px-1 rounded">BUFFER_API_KEY</code></li>
              <li>Conectá tus cuentas en Buffer (Instagram, Facebook, TikTok, X, YouTube)</li>
              <li>Volvé acá y pulsá <strong>Sincronizar canales</strong></li>
            </ol>
          </div>

          <Button onClick={() => window.location.reload()}>
            Probar conexión
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variables de entorno finales</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
            <li><code>BUFFER_API_KEY=...</code> (solo server-side)</li>
            <li><code>SOCIAL_MOCK_MODE=false</code></li>
            <li><code>NEXT_PUBLIC_APP_URL=https://publicador24.netlify.app</code></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Elimina estas variables si ya no las usás:
            INSTAGRAM_ACCESS_TOKEN, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, X_API_KEY, X_API_SECRET, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
