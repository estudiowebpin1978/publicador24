"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Building2,
  Mic,
  CreditCard,
  Key,
  Save,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = React.useState(false)

  const existingProfile = useQuery(api.settings.getProfile)
  const existingWorkspace = useQuery(api.settings.getWorkspace)
  const existingBrandVoice = useQuery(api.settings.getBrandVoice)

  const [profileData, setProfileData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    timezone: "America/Argentina/Buenos_Aires",
  })
  const [workspaceData, setWorkspaceData] = React.useState({
    name: "",
    url: "",
    language: "es",
  })
  const [brandData, setBrandData] = React.useState({
    tone: "professional",
    values: "",
    personality: "",
    writingStyle: "",
  })

  const profileInitRef = React.useRef(false)
  const workspaceInitRef = React.useRef(false)
  const brandInitRef = React.useRef(false)

  React.useEffect(() => {
    if (existingProfile && !profileInitRef.current) {
      profileInitRef.current = true
      setProfileData({
        firstName: existingProfile.firstName || "",
        lastName: existingProfile.lastName || "",
        email: existingProfile.email || "",
        timezone: existingProfile.timezone || "America/Argentina/Buenos_Aires",
      })
    }
  }, [existingProfile])

  React.useEffect(() => {
    if (existingWorkspace && !workspaceInitRef.current) {
      workspaceInitRef.current = true
      setWorkspaceData({
        name: existingWorkspace.name || "",
        url: existingWorkspace.url || "",
        language: existingWorkspace.language || "es",
      })
    }
  }, [existingWorkspace])

  React.useEffect(() => {
    if (existingBrandVoice && !brandInitRef.current) {
      brandInitRef.current = true
      setBrandData({
        tone: existingBrandVoice.tone || "professional",
        values: existingBrandVoice.values || "",
        personality: existingBrandVoice.personality || "",
        writingStyle: existingBrandVoice.writingStyle || "",
      })
    }
  }, [existingBrandVoice])

  const saveProfile = useMutation(api.settings.saveProfile)
  const saveWorkspace = useMutation(api.settings.saveWorkspace)
  const saveBrandVoice = useMutation(api.settings.saveBrandVoice)

  const [saved, setSaved] = React.useState<string | null>(null)

  const handleSaveProfile = async () => {
    try {
      await saveProfile(profileData)
      setSaved("profile")
      setTimeout(() => setSaved(null), 2000)
    } catch {
      setSaved(null)
    }
  }

  const handleSaveWorkspace = async () => {
    try {
      await saveWorkspace(workspaceData)
      setSaved("workspace")
      setTimeout(() => setSaved(null), 2000)
    } catch {
      setSaved(null)
    }
  }

  const handleSaveBrand = async () => {
    try {
      await saveBrandVoice(brandData)
      setSaved("brand")
      setTimeout(() => setSaved(null), 2000)
    } catch {
      setSaved(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Gestioná tu cuenta y preferencias de la aplicación.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="size-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="workspace">
            <Building2 className="size-4" />
            Espacio de Trabajo
          </TabsTrigger>
          <TabsTrigger value="brand">
            <Mic className="size-4" />
            Voz de Marca
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="size-4" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="size-4" />
            Claves API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Perfil</CardTitle>
              <CardDescription>Actualizá tu información personal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Nombre</Label>
                  <Input id="first-name" value={profileData.firstName} onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Apellido</Label>
                  <Input id="last-name" value={profileData.lastName} onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" value={profileData.email} onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Select value={profileData.timezone} onValueChange={(v) => setProfileData(prev => ({ ...prev, timezone: v || "utc-5" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Argentina/Buenos_Aires">UTC-3 (Argentina)</SelectItem>
                    <SelectItem value="America/Mexico_City">UTC-6 (México)</SelectItem>
                    <SelectItem value="America/Bogota">UTC-5 (Colombia)</SelectItem>
                    <SelectItem value="America/Santiago">UTC-4 (Chile)</SelectItem>
                    <SelectItem value="America/Lima">UTC-5 (Perú)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile}>
                  <Save className="size-4" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Espacio de Trabajo</CardTitle>
              <CardDescription>Configurá las preferencias de tu espacio de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Nombre del Espacio de Trabajo</Label>
                <Input id="workspace-name" value={workspaceData.name} onChange={(e) => setWorkspaceData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-url">URL del Espacio de Trabajo</Label>
                <Input id="workspace-url" value={workspaceData.url} onChange={(e) => setWorkspaceData(prev => ({ ...prev, url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Idioma Predeterminado</Label>
                <Select value={workspaceData.language} onValueChange={(v) => setWorkspaceData(prev => ({ ...prev, language: v || "es" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Inglés</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Francés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveWorkspace}>
                  <Save className="size-4" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Voz de Marca</CardTitle>
              <CardDescription>Definí cómo se comunica tu marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tono de Marca</Label>
                <Select value={brandData.tone} onValueChange={(v) => setBrandData(prev => ({ ...prev, tone: v || "professional" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profesional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Amigable</SelectItem>
                    <SelectItem value="authoritative">Autoritativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-values">Valores de Marca</Label>
                <Textarea
                  id="brand-values"
                  placeholder="ej: Innovación, Calidad, Cliente primero"
                  value={brandData.values}
                  onChange={(e) => setBrandData(prev => ({ ...prev, values: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-personality">Personalidad de Marca</Label>
                <Textarea
                  id="brand-personality"
                  placeholder="Describí la personalidad de tu marca..."
                  value={brandData.personality}
                  onChange={(e) => setBrandData(prev => ({ ...prev, personality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="writing-style">Notas de Estilo de Escritura</Label>
                <Textarea
                  id="writing-style"
                  placeholder="Pautas adicionales de escritura..."
                  value={brandData.writingStyle}
                  onChange={(e) => setBrandData(prev => ({ ...prev, writingStyle: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveBrand}>
                  <Save className="size-4" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturación</CardTitle>
              <CardDescription>Gestioná tu suscripción y pagos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Publicador24</p>
                    <p className="text-sm text-muted-foreground">App gratuita — sin facturación</p>
                  </div>
                  <Badge variant="secondary">Free</Badge>
                </div>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">
                  Esta aplicación es de uso personal. No hay sistema de facturación configurado.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integraciones Configuradas</CardTitle>
              <CardDescription>Estado de las claves API configuradas en el servidor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">AI Provider (OpenRouter)</p>
                    <p className="text-sm text-muted-foreground font-mono">Configurado en .env.local</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Activo</Badge>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Buffer API</p>
                    <p className="text-sm text-muted-foreground font-mono">Configurado en .env.local</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Activo</Badge>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pollinations (Imágenes)</p>
                    <p className="text-sm text-muted-foreground font-mono">Configurado en .env.local</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Activo</Badge>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Convex (Base de datos)</p>
                    <p className="text-sm text-muted-foreground font-mono">Configurado en .env.local</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Activo</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Las claves API se gestionan en el archivo .env.local del servidor, no desde esta interfaz.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
