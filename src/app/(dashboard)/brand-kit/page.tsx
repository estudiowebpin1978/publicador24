"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Palette,
  Save,
  Plus,
  Trash2,
  Globe,
  Phone,
  MapPin,
  Link as LinkIcon,
} from "lucide-react"
import { useQuery, useMutation } from "@/hooks/use-convex"
import { api } from "@/hooks/use-convex"

export default function BrandKitPage() {
  const brandProfile = useQuery(api.brandProfiles.getDefault)
  const createProfile = useMutation(api.brandProfiles.create)
  const updateProfile = useMutation(api.brandProfiles.update)

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [tone, setTone] = React.useState("")
  const [visualStyle, setVisualStyle] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [primaryColor, setPrimaryColor] = React.useState("#7c3aed")
  const [secondaryColor, setSecondaryColor] = React.useState("#4f46e5")
  const [accentColor, setAccentColor] = React.useState("#ec4899")
  const [defaultCtas, setDefaultCtas] = React.useState<string[]>([])
  const [newCta, setNewCta] = React.useState("")
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (brandProfile) {
      setName(brandProfile.name || "")
      setDescription(brandProfile.description || "")
      setTone(brandProfile.tone || "")
      setVisualStyle(brandProfile.visualStyle || "")
      setWebsite(brandProfile.website || "")
      setPhone(brandProfile.phone || "")
      setLocation(brandProfile.location || "")
      setPrimaryColor(brandProfile.colors?.primary || "#7c3aed")
      setSecondaryColor(brandProfile.colors?.secondary || "#4f46e5")
      setAccentColor(brandProfile.colors?.accent || "#ec4899")
      setDefaultCtas(brandProfile.defaultCtas || [])
    }
  }, [brandProfile])

  const handleSave = async () => {
    const profileData = {
      name,
      description,
      tone,
      visualStyle,
      website,
      phone,
      location,
      colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
      defaultCtas,
    }

    if (brandProfile) {
      await updateProfile({ id: brandProfile._id, ...profileData })
    } else {
      await createProfile(profileData)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addCta = () => {
    if (newCta.trim() && defaultCtas.length < 10) {
      setDefaultCtas([...defaultCtas, newCta.trim()])
      setNewCta("")
    }
  }

  const removeCta = (index: number) => {
    setDefaultCtas(defaultCtas.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Kit</h1>
          <p className="text-muted-foreground">
            Configurá los datos de tu marca para que la IA genere contenido coherente
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="size-4 mr-2" />
          {saved ? "Guardado!" : "Guardar"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Identidad de marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de marca *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ejemplo: Mi Empresa"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿Qué hace tu marca?"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Tono de voz</Label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Ejemplo: Profesional, cercano, divertido"
              />
            </div>
            <div className="space-y-2">
              <Label>Estilo visual</Label>
              <Input
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="Ejemplo: Moderno, minimalista, colorido"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Colores de marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primario</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="size-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secundario</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="size-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Acento</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="size-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="size-8 rounded" style={{ backgroundColor: primaryColor }} />
                <div className="size-8 rounded" style={{ backgroundColor: secondaryColor }} />
                <div className="size-8 rounded" style={{ backgroundColor: accentColor }} />
              </div>
              <span className="text-sm text-muted-foreground">Vista previa de colores</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              Datos de contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="size-4" />
                Sitio web
              </Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://tusitio.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="size-4" />
                Teléfono
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 341 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="size-4" />
                Ubicación
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Rosario, Santa Fe, Argentina"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CTAs predeterminados</CardTitle>
            <CardDescription>
              La IA usará estos CTAs al generar contenido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCta}
                onChange={(e) => setNewCta(e.target.value)}
                placeholder="Ejemplo: Consultá gratis"
                onKeyDown={(e) => e.key === "Enter" && addCta()}
              />
              <Button onClick={addCta} size="sm">
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {defaultCtas.map((cta, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {cta}
                  <button
                    onClick={() => removeCta(i)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </Badge>
              ))}
              {defaultCtas.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No hay CTAs configurados. Agregá algunos arriba.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
