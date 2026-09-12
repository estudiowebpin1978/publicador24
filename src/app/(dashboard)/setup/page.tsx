"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Zap,
  Settings,
} from "lucide-react"
import Link from "next/link"

interface PlatformStatus {
  id: string
  name: string
  configured: boolean
  envVars: string[]
  authUrl: string
  docsUrl: string
  description: string
}

const platforms: PlatformStatus[] = [
  {
    id: "instagram",
    name: "Instagram / Facebook",
    configured: false,
    envVars: ["INSTAGRAM_ACCESS_TOKEN", "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "INSTAGRAM_ACCOUNT_ID", "FACEBOOK_PAGE_ID"],
    authUrl: "https://developers.facebook.com/docs/instagram-api/getting-started",
    docsUrl: "https://developers.facebook.com/docs/instagram-api/",
    description: "Publicá fotos, videos y reels en Instagram vía la API de Facebook Graph.",
  },
  {
    id: "facebook",
    name: "Facebook Pages",
    configured: false,
    envVars: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_PAGE_ID", "FACEBOOK_ACCESS_TOKEN"],
    authUrl: "https://developers.facebook.com/docs/pages-api/getting-started",
    docsUrl: "https://developers.facebook.com/docs/pages-api/",
    description: "Publicá en páginas de Facebook con la Graph API v19.0.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    configured: false,
    envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_ACCESS_TOKEN"],
    authUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    description: "Subí videos y publicá en TikTok con la Content Posting API v2.",
  },
  {
    id: "x",
    name: "X (Twitter)",
    configured: false,
    envVars: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"],
    authUrl: "https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code",
    docsUrl: "https://developer.x.com/en/docs/twitter-api",
    description: "Publicá tweets y gestioná tu cuenta de X con la API v2.",
  },
  {
    id: "youtube",
    name: "YouTube",
    configured: false,
    envVars: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_ACCESS_TOKEN"],
    authUrl: "https://console.cloud.google.com/apis/credentials",
    docsUrl: "https://developers.google.com/youtube/v3/getting-started",
    description: "Subí videos y publicá en YouTube vía la Data API v3.",
  },
]

function getEnvStatus(vars: string[]): boolean {
  if (typeof window === 'undefined') return false
  return vars.every((v) => {
    const val = process.env[`NEXT_PUBLIC_${v}`] || process.env[v]
    return val && val.length > 0
  })
}

export default function SetupPage() {
  const [statuses, setStatuses] = React.useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = React.useState<Record<string, "idle" | "testing" | "success" | "error">>({})

  React.useEffect(() => {
    const newStatuses: Record<string, boolean> = {}
    for (const p of platforms) {
      newStatuses[p.id] = getEnvStatus(p.envVars)
    }
    setStatuses(newStatuses)
  }, [])

  const handleTestConnection = async (platformId: string) => {
    setTestResults((prev) => ({ ...prev, [platformId]: "testing" }))
    try {
      const res = await fetch(`/api/social/test/${platformId}`)
      setTestResults((prev) => ({ ...prev, [platformId]: res.ok ? "success" : "error" }))
    } catch {
      setTestResults((prev) => ({ ...prev, [platformId]: "error" }))
    }
  }

  const configuredCount = Object.values(statuses).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de API</h1>
        <p className="text-muted-foreground">
          Configurá las credenciales de cada red social para publicar automáticamente.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-violet-600">
            <Zap className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Plataformas configuradas</p>
            <p className="text-2xl font-bold">{configuredCount} / {platforms.length}</p>
          </div>
          {configuredCount === platforms.length && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="mr-1 size-3" />
              Todo listo
            </Badge>
          )}
          {configuredCount < platforms.length && (
            <Badge variant="secondary">
              <AlertTriangle className="mr-1 size-3" />
              Faltan {platforms.length - configuredCount}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {platforms.map((platform) => {
          const isConfigured = statuses[platform.id] ?? false
          const testResult = testResults[platform.id] ?? "idle"

          return (
            <Card key={platform.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                      <Settings className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <CardDescription>{platform.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConfigured ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="mr-1 size-3" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 size-3" />
                        Sin configurar
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Variables de entorno requeridas:</p>
                  <div className="flex flex-wrap gap-2">
                    {platform.envVars.map((envVar) => (
                      <code
                        key={envVar}
                        className="rounded-md bg-muted px-2 py-1 text-xs font-mono"
                      >
                        {envVar}
                      </code>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(platform.id)}
                    disabled={testResult === "testing"}
                  >
                    {testResult === "testing" ? (
                      "Probando..."
                    ) : testResult === "success" ? (
                      <>
                        <CheckCircle className="mr-1 size-3 text-green-600" />
                        Conexión OK
                      </>
                    ) : testResult === "error" ? (
                      <>
                        <XCircle className="mr-1 size-3 text-red-600" />
                        Error
                      </>
                    ) : (
                      "Probar Conexión"
                    )}
                  </Button>
                  <Link
                    href={platform.authUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-clip-padding px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                    Documentación
                  </Link>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Pasos para configurar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Creá una aplicación en la consola del desarrollador de {platform.name}</li>
                    <li>Obtené las credenciales (API Key, Secret, etc.)</li>
                    <li>Configurá las variables de entorno en Netlify</li>
                    <li>Hacé clic en &quot;Probar Conexión&quot; para verificar</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables de Netlify</CardTitle>
          <CardDescription>
            Configurá estas variables en tu dashboard de Netlify (Site settings &gt; Environment variables)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs space-y-1">
            <p className="text-muted-foreground mb-2"># Redes Sociales</p>
            <p>SOCIAL_MOCK_MODE=false</p>
            <p>NEXT_PUBLIC_APP_URL=https://publicador24.netlify.app</p>
            <p className="text-muted-foreground mt-2"># Instagram / Facebook</p>
            <p>INSTAGRAM_ACCESS_TOKEN=</p>
            <p>FACEBOOK_APP_ID=</p>
            <p>FACEBOOK_APP_SECRET=</p>
            <p>INSTAGRAM_ACCOUNT_ID=</p>
            <p>FACEBOOK_PAGE_ID=</p>
            <p className="text-muted-foreground mt-2"># TikTok</p>
            <p>TIKTOK_CLIENT_KEY=</p>
            <p>TIKTOK_CLIENT_SECRET=</p>
            <p>TIKTOK_ACCESS_TOKEN=</p>
            <p className="text-muted-foreground mt-2"># X (Twitter)</p>
            <p>X_API_KEY=</p>
            <p>X_API_SECRET=</p>
            <p>X_ACCESS_TOKEN=</p>
            <p>X_ACCESS_SECRET=</p>
            <p className="text-muted-foreground mt-2"># YouTube</p>
            <p>YOUTUBE_CLIENT_ID=</p>
            <p>YOUTUBE_CLIENT_SECRET=</p>
            <p>YOUTUBE_ACCESS_TOKEN=</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
