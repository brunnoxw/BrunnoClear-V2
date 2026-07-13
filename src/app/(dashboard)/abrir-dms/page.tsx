
import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessagesSquare,
  Loader2,
  Play,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Clock,
  Zap,
  Users,
  FileArchive,
  Upload,
  Ban,
  User,
  Package,
  Hash,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import { useWSEvent } from "@/hooks/use-websocket"
import { ws } from "@/lib/ws-client"
import { Link } from "react-router-dom"
import type { WSToolProgress, WSToolCompleted, WSToolError } from "@/types/websocket"
import type { AppSettings } from "@/types/api"

type Mode = "especifico" | "package"
type Phase = "idle" | "analyzing" | "ready" | "opening" | "completed" | "error"

interface PackageAnalysis {
  totalUsers: number
  totalChannels: number
  totalDMs: number
  userIds: string[]
}

function notify(title: string, body: string) {
  try { window.electronAPI?.notification.show({ title, body }) } catch {}
}

export default function PaginaAbrirDms() {
  const { activeToken } = useTokens()

  const [mode, setMode] = useState<Mode>("especifico")
  const [targetIds, setTargetIds] = useState("")
  const [zipPath, setZipPath] = useState("")
  const [whitelist, setWhitelist] = useState("")
  const [configDelay, setConfigDelay] = useState(700)

  const [phase, setPhase] = useState<Phase>("idle")
  const [analysis, setAnalysis] = useState<PackageAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [starting, setStarting] = useState(false)

  const [taskId, setTaskId] = useState<string | null>(null)
  const taskIdRef = useRef<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [abertas, setAbertas] = useState(0)
  const [falhas, setFalhas] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startTimeRef = useRef<number>(0)
  const notificationsRef = useRef(true)
  const notifiedTaskRef = useRef<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ username: string; avatarUrl: string | null } | null>(null)

  useEffect(() => { taskIdRef.current = taskId }, [taskId])

  useEffect(() => {
    api.getSettings().then((res) => {
      const data = res.data as AppSettings
      notificationsRef.current = data?.general?.notifications ?? true
      if (data?.delay) setConfigDelay(data.delay)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getRunningTasks().then((res) => {
      const tasks = (res.data || []) as Array<{
        id: string
        tool: string
        progress: number
        total: number
        startedAt: string
      }>
      const running = tasks.find((t) => t.tool === 'abrir-dms')
      if (running) {
        setTaskId(running.id)
        setProgress(running.progress)
        setTotal(running.total)
        startTimeRef.current = new Date(running.startedAt).getTime()
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
        setPhase('opening')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (phase !== "opening") return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  useWSEvent<WSToolProgress>("tool:progress", (data) => {
    if (!taskIdRef.current || data.taskId !== taskIdRef.current) return
    setProgress(data.progress)
    setTotal(data.total)
    if (data.message) setStatusMessage(data.message)
    if (data.currentUser) setCurrentUser(data.currentUser)
    const extra = data as unknown as { abertas?: number; falhas?: number }
    if (typeof extra.abertas === "number") setAbertas(extra.abertas)
    if (typeof extra.falhas === "number") setFalhas(extra.falhas)
  })

  useWSEvent<WSToolCompleted>("tool:completed", (data) => {
    if (!taskIdRef.current || data.taskId !== taskIdRef.current) return
    setPhase("completed")
    if (notificationsRef.current && notifiedTaskRef.current !== taskIdRef.current) {
      notifiedTaskRef.current = taskIdRef.current
      notify("BrunnoClear", `DMs abertas! ${abertas} conversas`)
    }
  })

  useWSEvent<WSToolError>("tool:error", (data) => {
    if (!taskIdRef.current || data.taskId !== taskIdRef.current) return
    setPhase("error")
    setError(data.error || "Erro desconhecido")
    if (notificationsRef.current && notifiedTaskRef.current !== taskIdRef.current) {
      notifiedTaskRef.current = taskIdRef.current
      notify("BrunnoClear", `Erro ao abrir DMs: ${data.error || "Erro desconhecido"}`)
    }
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
  }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.endsWith(".zip")) {
      const filePath = window.electronAPI?.webUtils.getPathForFile(files[0])
      if (filePath) { setZipPath(filePath); setAnalysis(null); setPhase("idle") }
    }
  }, [])

  const handleFileSelect = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openFile([
      { name: "ZIP files", extensions: ["zip"] },
    ])
    if (filePath) { setZipPath(filePath); setAnalysis(null); setPhase("idle") }
  }, [])

  const parseIds = (raw: string) =>
    raw.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean)

  const handleAnalyze = async () => {
    if (!activeToken || !zipPath.trim()) return
    setAnalyzing(true)
    setError("")
    setPhase("analyzing")
    try {
      const whitelistArray = parseIds(whitelist)
      const res = await api.post<PackageAnalysis>("/tools/abrir-dms/analisar", {
        tokenId: activeToken.id,
        zipPath: zipPath.trim(),
        whitelist: whitelistArray,
      })
      setAnalysis(res.data as PackageAnalysis)
      setPhase("ready")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao analisar package")
      setPhase("error")
    } finally {
      setAnalyzing(false)
    }
  }

  const startTask = async (payload: Record<string, unknown>, totalUsersHint: number) => {
    setStarting(true)
    setError("")
    try {
      const res = await api.runTool("abrir-dms", {
        tokenId: activeToken!.id,
        delay: configDelay,
        ...payload,
      })
      const data = res.data as { taskId: string; totalUsers: number }
      setTaskId(data.taskId)
      setTotal(data.totalUsers || totalUsersHint)
      setProgress(0)
      setAbertas(0)
      setFalhas(0)
      setCurrentUser(null)
      setPhase("opening")
      notifiedTaskRef.current = null
      startTimeRef.current = Date.now()
      setElapsedSeconds(0)
      if (notificationsRef.current) {
        notify("BrunnoClear", `Abrindo ${data.totalUsers} DM(s)`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar")
      setPhase("error")
    } finally {
      setStarting(false)
    }
  }

  const handleStartEspecifico = () => {
    if (!activeToken) return
    const ids = parseIds(targetIds)
    if (ids.length === 0) { setError("Informe pelo menos um ID de usuário"); return }
    startTask({ modo: "especifico", targetIds: ids }, ids.length)
  }

  const handleStartPackage = () => {
    if (!activeToken || !analysis) return
    startTask(
      { modo: "package", zipPath: zipPath.trim(), whitelist: parseIds(whitelist) },
      analysis.totalUsers,
    )
  }

  const handleCancel = () => { if (taskId) ws.cancelTask(taskId) }

  const handleReset = () => {
    setTaskId(null)
    setPhase("idle")
    setProgress(0)
    setTotal(0)
    setAbertas(0)
    setFalhas(0)
    setError("")
    setStatusMessage("")
    setElapsedSeconds(0)
    setAnalysis(null)
    setCurrentUser(null)
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  // ---------------- Setup (idle / analyzing / ready) ----------------
  if (phase === "idle" || phase === "analyzing" || phase === "ready") {
    return (
      <div className="space-y-6">
        {!activeToken && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
            <AlertTriangle size={18} className="shrink-0 text-yellow-500" />
            <span className="text-sm text-yellow-400">Conecte uma conta primeiro para usar esta ferramenta</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <MessagesSquare size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Abrir DMs</h2>
              <p className="text-xs text-muted-foreground">Abra conversas com um usuário específico ou com todos do seu pacote de dados</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/20 p-1">
            <button
              onClick={() => { setMode("especifico"); setAnalysis(null); setPhase("idle") }}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                mode === "especifico" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User size={15} />
              Usuário específico
            </button>
            <button
              onClick={() => { setMode("package"); setPhase("idle") }}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                mode === "package" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package size={15} />
              Package (todos)
            </button>
          </div>

          {mode === "especifico" ? (
            <div className="mt-6 space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                IDs dos usuários
              </label>
              <textarea
                placeholder="123456789, 987654321 (separados por vírgula, espaço ou linha)"
                value={targetIds}
                onChange={(e) => setTargetIds(e.target.value)}
                disabled={!activeToken}
                rows={3}
                className="w-full rounded-md border border-border bg-secondary/40 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground">
                Você pode abrir uma ou várias DMs de uma vez
              </p>
            </div>
          ) : (
            <>
              <div
                className={`mt-6 relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : zipPath
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-secondary/10 hover:border-border/80 cursor-pointer"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={zipPath ? undefined : handleFileSelect}
                role={zipPath ? undefined : "button"}
              >
                {zipPath ? (
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileArchive size={24} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{zipPath.split(/[/\\]/).pop()}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">{zipPath}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setZipPath(""); setAnalysis(null); setPhase("idle") }}
                      className="relative z-10 ml-2 h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-red-400"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Arraste o arquivo ZIP aqui</p>
                    <p className="mt-1 text-xs text-muted-foreground">ou clique para selecionar</p>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  IDs para ignorar (whitelist)
                </label>
                <Input
                  placeholder="123456789, 987654321 (separados por vírgula)"
                  value={whitelist}
                  onChange={(e) => setWhitelist(e.target.value)}
                  className="h-11 border-border bg-secondary/40 font-mono text-sm"
                  disabled={!activeToken}
                />
                <p className="text-[11px] text-muted-foreground">Deixe vazio para abrir DM com todos</p>
              </div>

              <div className="mt-4 rounded-lg border border-border/50 bg-secondary/10 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Como obter:</span> Discord → Configurações → Dados e privacidade → Solicitar dados → Marque &quot;Mensagens&quot; e aguarde o ZIP chegar no e-mail
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={14} className="text-primary/70" />
              Delay entre DMs
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-foreground">{configDelay}ms</span>
              <Link to="/configuracoes" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                Alterar →
              </Link>
            </div>
          </div>

          <div className="mt-6">
            {mode === "especifico" ? (
              <Button
                onClick={handleStartEspecifico}
                disabled={starting || !activeToken || !targetIds.trim()}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {starting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Play size={18} className="mr-2" />}
                {starting ? "Abrindo..." : "Abrir DMs"}
              </Button>
            ) : (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !activeToken || !zipPath.trim()}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {analyzing ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Search size={18} className="mr-2" />}
                {analyzing ? "Analisando..." : "Analisar Package"}
              </Button>
            )}
          </div>
        </div>

        {error && phase !== "ready" && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <X size={16} className="shrink-0 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {analysis && phase === "ready" && mode === "package" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Users size={12} /> Usuários encontrados
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-primary">{analysis.totalUsers}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Hash size={12} /> Canais analisados
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{analysis.totalChannels}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <MessageSquare size={12} /> DMs encontradas
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{analysis.totalDMs}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4">
              <Button
                onClick={handleStartPackage}
                disabled={starting || !activeToken || analysis.totalUsers === 0}
                className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {starting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Play size={18} className="mr-2" />}
                {starting ? "Iniciando..." : `Abrir ${analysis.totalUsers} DMs`}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------------- Opening ----------------
  if (phase === "opening") {
    const remaining = total - progress
    const speed = elapsedSeconds > 0 ? (progress / elapsedSeconds).toFixed(1) : "0"

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
                <MessagesSquare size={20} className="text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-card bg-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">Abrindo DMs</h2>
              <p className="text-xs text-muted-foreground truncate">{statusMessage || "Iniciando..."}</p>
            </div>
            <div className="text-3xl font-bold tabular-nums text-foreground">{pct}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="h-1.5 bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="px-5 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{progress}</span> de {total} usuários
              </span>
              <span className="tabular-nums text-muted-foreground">{fmt(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-center gap-4">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="h-11 w-11 shrink-0 rounded-full border-2 border-border object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
              />
            ) : null}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary/40 text-sm font-bold text-muted-foreground ${currentUser?.avatarUrl ? 'hidden' : ''}`}>
              {currentUser ? currentUser.username.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {currentUser?.username || "Aguardando..."}
              </p>
              <p className="text-xs text-muted-foreground">Abrindo conversa...</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{progress}/{total}</span>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-4">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 size={11} /> Abertas
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-primary">{abertas}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Ban size={11} /> Falhas
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{falhas}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Zap size={11} /> Velocidade
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
              {speed}<span className="text-xs text-muted-foreground">/s</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Clock size={11} /> Restantes
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{remaining}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400"
          >
            <Ban size={16} className="mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // ---------------- Completed ----------------
  if (phase === "completed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="h-1 bg-primary" />
          <div className="flex items-center gap-5 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
              <CheckCircle2 size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">DMs abertas com sucesso!</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {abertas} conversa(s) aberta(s){falhas ? `, ${falhas} falha(s)` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <MessagesSquare size={12} /> DMs abertas
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-primary">{abertas}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Ban size={12} /> Falhas
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{falhas}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock size={12} /> Duração total
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4">
          <Button onClick={handleReset} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw size={16} className="mr-2" />
            Abrir mais DMs
          </Button>
        </div>
      </div>
    )
  }

  // ---------------- Error ----------------
  const isCancelled = error?.includes("Cancelado")
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
        <div className="h-1 bg-red-500" />
        <div className="flex items-center gap-5 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/10">
            {isCancelled ? <Ban size={28} className="text-red-400" /> : <X size={28} className="text-red-400" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isCancelled ? "Operação cancelada" : "Erro ao abrir DMs"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>

      {progress > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <MessagesSquare size={12} /> DMs abertas
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {abertas}<span className="text-muted-foreground">/{total}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock size={12} /> Tempo decorrido
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <Button onClick={handleReset} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
          <RotateCcw size={16} className="mr-2" />
          {isCancelled ? "Voltar" : "Tentar novamente"}
        </Button>
      </div>
    </div>
  )
}
