import { useState } from "react"
import { useUpdater } from "@/hooks/use-updater"
import { Download, RefreshCw, ExternalLink, X, CheckCircle2, Loader2, Sparkles, Rocket } from "lucide-react"

export function UpdateBanner() {
  const { status, isPackaged, downloadUpdate, installUpdate, openReleases } = useUpdater()
  const [dismissed, setDismissed] = useState(false)
  const [preparing, setPreparing] = useState(false)

  const handleDownload = () => {
    setPreparing(true)
    downloadUpdate()
  }

  if (preparing && status.status === "downloading") {
    setPreparing(false)
  }

  if (dismissed) return null
  if (status.status === "idle" || status.status === "checking" || status.status === "not-available" || status.status === "error" || status.status === "dev") {
    return null
  }

  if (preparing && status.status === "available") {
    return (
      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10">
        <div className="relative flex items-center gap-3 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            </div>
            <span className="text-emerald-300/90">
              Conectando ao servidor de atualização…
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (status.status === "available") {
    return (
      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10">
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.07), transparent)",
          }}
        />

        <div className="relative flex items-center gap-3 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <Sparkles className="relative h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-emerald-300/90">
              Uma atualização está disponível — <strong className="font-semibold text-emerald-300">v{status.version}</strong>
            </span>
          </div>

          {isPackaged ? (
            <button
              onClick={handleDownload}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/25 active:scale-[0.97]"
            >
              <Download className="h-3.5 w-3.5" />
              Atualizar agora
            </button>
          ) : (
            <button
              onClick={openReleases}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/25 active:scale-[0.97]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver no GitHub
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-emerald-400/40 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (status.status === "downloading") {
    const percent = Math.round(status.percent)
    return (
      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10">
        <div className="relative px-4 py-2.5 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            </div>
            <span className="text-emerald-300/90">
              Preparando a nova versão… <strong className="font-semibold text-emerald-300">{percent}%</strong>
            </span>
            <span className="ml-auto font-mono text-xs text-emerald-400/50">
              {(status.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (status.status === "downloaded") {
    return (
      <div className="relative overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10">
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.07), transparent)",
          }}
        />

        <div className="relative flex items-center gap-3 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <Rocket className="relative h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-emerald-300/90">
              Tudo pronto! A <strong className="font-semibold text-emerald-300">v{status.version}</strong> está esperando por você
            </span>
          </div>

          <button
            onClick={installUpdate}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-1.5 text-xs font-semibold text-black shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-md hover:shadow-emerald-500/25 active:scale-[0.97]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reiniciar e Atualizar
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-emerald-400/40 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
