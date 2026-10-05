import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Zap, Calendar, BarChart3 } from "lucide-react"

// Ejemplos de salida del motor, con el mismo formato real que genera la app
// (gancho + caption + hashtags + CTA). Son ilustrativos: no son métricas ni
// resultados de campañas reales.
const EXAMPLES = [
  {
    niche: "Servicios locales",
    platform: "Instagram",
    hook: "¿Tu pileta se puelve verde cada febrero? No es mala suerte.",
    caption:
      "La mayoría de los problemas algales arrancan con un filtro desbalanceado.\nTres controles semanales y el agua se mantiene clara todo el verano.",
    hashtags: ["#pileta", "#verano", "#mantenimiento"],
    cta: "tusitio.com/pileta",
  },
  {
    niche: "Datos y estadística",
    platform: "TikTok",
    hook: "Mirá el histórico completo antes de jugar.",
    caption:
      "Cargué todos los sorteos y comparé la frecuencia real de cada número contra lo esperado.\nAhí se ven los que salen seguido y los que conviene dejar pasar.",
    hashtags: ["#datos", "#estadisticas", "#analisis"],
    cta: "quiniela-ia-two.vercel.app",
    disclaimer: "+18 · Análisis estadístico. No garantiza resultados.",
  },
  {
    niche: "E-commerce",
    platform: "Reels",
    hook: "Dejé de publicar a ciegas y empecé a mirar esto.",
    caption:
      "Un solo dato cambió todo: a qué hora entra tu audiencia.\nAhora programo los posts ahí y llego a más gente sin publicar más.",
    hashtags: ["#marketing", "#emprendedores", "#redessociales"],
    cta: "tusitio.com/tienda",
  },
]

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

        {/* Ejemplos de contenido generado */}
        <section className="border-t">
          <div className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Así se ve el contenido que genera
              </h2>
              <p className="mt-3 text-muted-foreground">
                Cada pieza sale con gancho, caption, hashtags y CTA, y pasa por control de
                seguridad y anti-duplicados antes de programarse.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {EXAMPLES.map((example) => (
                <article
                  key={example.niche}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      {example.niche}
                    </span>
                    <span className="text-xs text-muted-foreground">{example.platform}</span>
                  </div>

                  <p className="text-base font-semibold leading-snug">{example.hook}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {example.caption}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {example.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="mt-auto pt-2 text-xs font-medium text-violet-600">
                    CTA → {example.cta}
                  </p>
                  {example.disclaimer && (
                    <p className="text-[11px] text-muted-foreground">{example.disclaimer}</p>
                  )}
                </article>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ejemplos de formato generado. Los resultados varían según cada campaña.
            </p>
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
