import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Zap, Calendar, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold">Auto Publisher IA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Comenzar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Zap className="size-4 text-violet-600" />
            Publicación de Contenido con IA
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Automatizá tus redes sociales con{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              IA inteligente
            </span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Creá, programá y publicá contenido en todas las plataformas. Dejá que la IA haga
            el trabajo pesado mientras vos te enfocás en tu marca.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Empezá gratis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Iniciar sesión
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/50">
          <div className="container mx-auto grid gap-8 px-4 py-16 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <Zap className="size-5 text-violet-600" />
              </div>
              <h3 className="font-semibold">Modo Piloto Automático</h3>
              <p className="text-sm text-muted-foreground">
                Dejá que la IA genere y publique contenido automáticamente según la voz
                de tu marca y los mejores horarios para publicar.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="size-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Programación Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                Programá publicaciones en los horarios óptimos cuando tu audiencia está más activa para
                lograr la máxima interacción.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <BarChart3 className="size-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Analíticas Profundas</h3>
              <p className="text-sm text-muted-foreground">
                Seguí el rendimiento en todas las plataformas con analíticas detalladas e
                insights potenciados por IA.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <p>&copy; 2026 Auto Publisher IA. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">Privacidad</Link>
            <Link href="#" className="hover:text-foreground">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
