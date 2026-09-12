"use client"

import { Component, ReactNode, ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log("Error caught:", error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-bold text-amber-600">Convex no está configurado</h2>
            <p className="text-muted-foreground">
              Para usar la app con datos reales, configurá <code className="bg-muted px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> en Netlify.
            </p>
            <p className="text-sm text-muted-foreground">
              Mientras tanto, la app funciona con datos de ejemplo.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
