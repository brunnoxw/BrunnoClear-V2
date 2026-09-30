import { Component, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary] erro de render capturado:", error, info)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">Algo deu errado ao exibir esta tela</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Um erro inesperado impediu a renderização. Seus dados estão a salvo — é só tentar de novo ou recarregar o app.
          </p>
        </div>
        <pre className="max-w-lg overflow-x-auto rounded-lg border border-border bg-secondary/20 px-3 py-2 text-left text-[11px] text-muted-foreground">
          {this.state.error.message || String(this.state.error)}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={this.reset}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg active:scale-[0.97]"
          >
            <RotateCcw className="h-4 w-4" /> Tentar de novo
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Recarregar app
          </button>
        </div>
      </div>
    )
  }
}
