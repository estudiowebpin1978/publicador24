"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { useMutation, api } from "@/hooks/use-convex"

export default function RegisterPage() {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const registerMutation = useMutation(api.auth.register)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await registerMutation({ email, password, name })
      localStorage.setItem("autopublisher_user", JSON.stringify({
        userId: result.userId,
        email: result.email,
        name: result.name,
        token: result.token,
      }))
      router.push("/dashboard")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear cuenta"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="size-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Publicador24</h1>
          <p className="text-sm text-muted-foreground">
            Creá tu cuenta para empezar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crear una cuenta</CardTitle>
            <CardDescription>Ingresá tus datos para empezar</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vos@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
              <p className="text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{" "}
                <Link href="/login" className="font-medium text-foreground hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
