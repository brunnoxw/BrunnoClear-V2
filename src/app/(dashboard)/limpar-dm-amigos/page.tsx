import { useState, useEffect, useRef } from "react"
import {
  Trash2,
  Loader2,
  Play,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Timer,
  MessageSquare,
  Ban,
  Zap,
  Clock,
  Archive,
  HardDrive,
  PhoneOff,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import { useWSEvent } from "@/hooks/use-websocket"
import { ws } from "@/lib/ws-client"
import { Link } from "react-router-dom"
import type { WSToolProgress, WSToolCompleted, WSToolError } from "@/types/websocket"
import type { AppSettings } from "@/types/api"

type Phase = "idle" | "fetching" | "deleting" | "completed" | "error" | "backup"

function notify(title: string, body: string) {
  try { window.electronAPI?.notification.show({ title, body }) } catch {}
}

export default function PaginaLimparDmAmigos() {
  const { activeToken } = useTokens()
  const [configDelay, setConfigDelay] = useState(700)
  const [fazerBackup, setFazerBackup] = useState(false)
  const [salvarMidiaLocal, setSalvarMidiaLocal] = useState(false)
  const [fecharApos, setFecharApos] = useState(false)
  const [starting, setStarting] = useState(false)

  const [taskId, setTaskId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [currentDm, setCurrentDm] = useState("")
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [dmIndex, setDmIndex] = useState(0)
  const [totalDms, setTotalDms] = useState(0)
  const startTimeRef = useRef<number>(0)
  const notificationsRef = useRef(true)
  const notifiedTaskRef = useRef<string | null>(null)

  useEffect(() => {
    api.getRunningTasks().then((res) => {
      const tasks = (res.data || []) as Array<{
        id: string; tool: string; status: string; progress: number; total: number;
        phase?: string; config: Record<string, unknown>; startedAt?: string; lastMessage?: string;
        extra?: Record<string, unknown>
      }>
      const running = tasks.find((t) => t.tool === "limpar-dm-amigos" && (t.status === "running" || t.status === "paused"))
      if (running) {
        setTaskId(running.id)
        setProgress(running.progress)
        setTotal(running.total)
        if (running.lastMessage) setStatusMessage(running.lastMessage)
        if (running.phase === "fetching" || running.phase === "deleting") setPhase(running.phase)
        else if (running.phase === "backup" || running.phase === "backup-media" || running.phase === "backup-saving") setPhase("backup")
        else setPhase("fetching")
        if (running.startedAt) startTimeRef.current = new Date(running.startedAt).getTime()
        if (running.extra) {
          if (running.extra.currentDm) setCurrentDm(running.extra.currentDm as string)
          if (running.extra.currentAvatarUrl) setCurrentAvatarUrl(running.extra.currentAvatarUrl as string)
          if (running.extra.dmIndex != null) setDmIndex(running.extra.dmIndex as number)
          if (running.extra.totalDms) setTotalDms(running.extra.totalDms as number)
        }
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.getSettings().then((res) => {
      const data = res.data as AppSettings
      notificationsRef.current = data?.general?.notifications ?? true
      if (data?.delay) setConfigDelay(data.delay)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (phase !== "fetching" && phase !== "deleting" && phase !== "backup") return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  useWSEvent<WSToolProgress>("tool:progress", (data) => {
    if (!taskId || data.taskId !== taskId) return
    setProgress(data.progress)
    setTotal(data.total)
    if (data.message) setStatusMessage(data.message)
    if (data.phase === "fetching" || data.phase === "deleting") setPhase(data.phase)
    else if (data.phase === "backup" || data.phase === "backup-media" || data.phase === "backup-saving") setPhase("backup")
    else if (data.phase === "completed") setPhase("completed")
    const d = data as any
    if (d.currentDm) setCurrentDm(d.currentDm)
    if (d.currentAvatarUrl !== undefined) setCurrentAvatarUrl(d.currentAvatarUrl)
    if (d.dmIndex != null) setDmIndex(d.dmIndex)
    if (d.totalDms) setTotalDms(d.totalDms)
  })

  useWSEvent<WSToolCompleted>("tool:completed", (data) => {
    if (!taskId || data.taskId !== taskId) return
    setPhase("completed")
    if (notificationsRef.current && notifiedTaskRef.current !== taskId) {
      notifiedTaskRef.current = taskId
      notify("BrunnoClear", `Limpeza de DMs concluída! ${progress} mensagens deletadas`)
    }
  })

  useWSEvent<WSToolError>("tool:error", (data) => {
    if (!taskId || data.taskId !== taskId) return
    setPhase("error")
    setError(data.error || "Erro desconhecido")
    if (notificationsRef.current && notifiedTaskRef.current !== taskId) {
      notifiedTaskRef.current = taskId
      notify("BrunnoClear", `Erro na limpeza: ${data.error || "Erro desconhecido"}`)
    }
  })

  const handleStart = async () => {
    if (!activeToken) return
    setStarting(true)
    setError("")
    try {
      const res = await api.runTool("limpar-dm-amigos", {
        tokenId: activeToken.id,
        delay: configDelay,
        fazerBackup,
        salvarMidiaLocal,
        fecharApos,
      })
      const data = res.data as { taskId: string; totalAmigos: number }
      setTaskId(data.taskId)
      setPhase("fetching")
      setProgress(0)
      setTotal(0)
      setTotalDms(data.totalAmigos)
      setDmIndex(0)
      setError("")
      notifiedTaskRef.current = null
      startTimeRef.current = Date.now()
      setElapsedSeconds(0)
      if (notificationsRef.current) notify("BrunnoClear", `Limpeza de DMs iniciada (${data.totalAmigos} amigos)`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar")
      setPhase("error")
    } finally {
      setStarting(false)
    }
  }

  const handleCancel = () => { if (taskId) ws.cancelTask(taskId) }

  const handleReset = () => {
    setTaskId(null)
    setPhase("idle")
    setProgress(0)
    setTotal(0)
    setError("")
    setStatusMessage("")
    setCurrentDm("")
    setCurrentAvatarUrl(null)
    setDmIndex(0)
    setTotalDms(0)
    setElapsedSeconds(0)
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  /* ─── IDLE ─── */
  if (phase === "idle") {
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
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Limpar DM dos Amigos</h2>
              <p className="text-xs text-muted-foreground">Apaga suas mensagens nas DMs de todos os seus amigos</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Delay (ms)</label>
              <div className="flex h-11 items-center rounded-md border border-border bg-secondary/20 px-4 text-sm tabular-nums text-foreground">
                {configDelay}ms
              </div>
              <Link to="/configuracoes" className="inline-block text-[11px] text-muted-foreground hover:text-primary transition-colors">
                Alterar nas configurações →
              </Link>
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-lg border border-border bg-secondary/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Archive size={16} className="text-primary/70" />
                <div>
                  <span className="text-sm font-medium text-foreground">Fazer backup antes de apagar</span>
                  <p className="text-xs text-muted-foreground">Salva as mensagens de cada DM antes de apagar</p>
                </div>
              </div>
              <Switch checked={fazerBackup} onCheckedChange={setFazerBackup} />
            </div>
            {fazerBackup && (
              <div className="ml-7 flex items-center justify-between rounded-lg border border-border/50 bg-secondary/20 p-3">
                <div className="flex items-center gap-3">
                  <HardDrive size={14} className="text-primary/70" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Salvar mídia localmente</span>
                    <p className="text-xs text-muted-foreground">Baixa imagens, vídeos e arquivos para o disco</p>
                  </div>
                </div>
                <Switch checked={salvarMidiaLocal} onCheckedChange={setSalvarMidiaLocal} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PhoneOff size={16} className="text-primary/70" />
                <div>
                  <span className="text-sm font-medium text-foreground">Fechar DM após limpar</span>
                  <p className="text-xs text-muted-foreground">Fecha cada DM automaticamente após apagar as mensagens</p>
                </div>
              </div>
              <Switch checked={fecharApos} onCheckedChange={setFecharApos} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="shrink-0 text-red-400" />
              <p className="text-sm text-red-400">
                <strong>Atenção:</strong> Esta ação é irreversível. Suas mensagens nas DMs de todos os amigos serão apagadas.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <X size={16} className="shrink-0 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleStart}
              disabled={starting || !activeToken}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {starting ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Play size={18} className="mr-2" />
              )}
              Iniciar Limpeza de DMs dos Amigos
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Search size={16} className="text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Busca completa</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Escaneia todo o histórico de cada DM e encontra apenas suas mensagens
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap size={16} className="text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Deleção controlada</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Remove mensagem por mensagem com delay configurável para evitar rate limits
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Timer size={16} className="text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Progresso em tempo real</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Acompanhe cada etapa com atualizações instantâneas via WebSocket
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ─── BACKUP ─── */
  if (phase === "backup") {
    const backupPct = total > 0 ? Math.round((progress / total) * 100) : 0
    const isDownloading = statusMessage.includes("Baixando")

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-yellow-500/30">
                <AvatarImage src={currentAvatarUrl || undefined} alt={currentDm} />
                <AvatarFallback className="bg-yellow-500/10 text-lg text-yellow-400">
                  {currentDm ? currentDm.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 animate-pulse rounded-full border-2 border-card bg-yellow-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {currentDm || "Processando..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                Criando backup {dmIndex + 1}/{totalDms}...
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Fase</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-yellow-400">
                <Archive size={14} />
                Backup
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          {isDownloading && total > 0 ? (
            <div className="h-1.5 bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-300 ease-out"
                style={{ width: `${backupPct}%` }}
              />
            </div>
          ) : (
            <div className="h-1 animate-pulse bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
          )}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <MessageSquare size={12} />
                  {isDownloading ? "Arquivos" : "Mensagens"}
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-yellow-400">
                  {progress.toLocaleString()}
                  {total > 0 && <span className="text-base text-muted-foreground">/{total.toLocaleString()}</span>}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Users size={12} />
                  Amigo
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {dmIndex + 1}<span className="text-base text-muted-foreground">/{totalDms}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Clock size={12} />
                  Tempo
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Archive size={12} />
                  Status
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">
                    {statusMessage || "Preparando backup..."}
                  </span>
                </div>
              </div>
            </div>
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

  /* ─── FETCHING ─── */
  if (phase === "fetching") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-primary/30">
                <AvatarImage src={currentAvatarUrl || undefined} alt={currentDm} />
                <AvatarFallback className="bg-primary/10 text-lg text-primary">
                  {currentDm ? currentDm.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 animate-pulse rounded-full border-2 border-card bg-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {currentDm || "Buscando mensagens..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                Escaneando DM {dmIndex + 1}/{totalDms}...
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Fase</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-blue-400">
                <Search size={14} />
                Buscando
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="h-1 animate-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <MessageSquare size={12} />
                  Suas mensagens
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-primary">{progress}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Users size={12} />
                  Amigo
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {dmIndex + 1}<span className="text-base text-muted-foreground">/{totalDms}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Clock size={12} />
                  Tempo
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Zap size={12} />
                  Status
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                  </span>
                  <span className="text-sm font-medium text-blue-400">Escaneando</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full border-border text-muted-foreground hover:text-foreground"
          >
            <Ban size={16} className="mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  /* ─── DELETING ─── */
  if (phase === "deleting") {
    const remaining = total - progress
    const speed = elapsedSeconds > 0 ? (progress / elapsedSeconds).toFixed(1) : "0"

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-red-500/30">
              <AvatarImage src={currentAvatarUrl || undefined} alt={currentDm} />
              <AvatarFallback className="bg-red-500/10 text-lg text-red-400">
                {currentDm ? currentDm.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {currentDm || "Apagando mensagens..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                Amigo {dmIndex + 1}/{totalDms} — Apagando mensagens...
              </p>
            </div>
            <div className="text-4xl font-bold tabular-nums text-foreground">{pct}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="h-1.5 bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{progress}</span> de {total} mensagens
              </span>
              <span className="tabular-nums text-muted-foreground">{fmt(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Trash2 size={12} />
              Deletadas
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-primary">{progress}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <MessageSquare size={12} />
              Restantes
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{remaining}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Zap size={12} />
              Velocidade
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{speed}<span className="text-sm text-muted-foreground">/s</span></div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock size={12} />
              Tempo
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
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

  /* ─── COMPLETED ─── */
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
                <h2 className="text-lg font-semibold text-foreground">Limpeza concluída</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Todas as mensagens dos amigos foram removidas
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Trash2 size={12} />
              Mensagens deletadas
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-primary">{progress}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Users size={12} />
              Amigos processados
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{totalDms}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock size={12} />
              Duração total
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{fmt(elapsedSeconds)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Zap size={12} />
              Velocidade média
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">
              {elapsedSeconds > 0 ? (progress / elapsedSeconds).toFixed(1) : "0"}
              <span className="text-sm text-muted-foreground">/s</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-4">
          <Button onClick={handleReset} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90">
            <RotateCcw size={16} className="mr-2" />
            Nova limpeza
          </Button>
        </div>
      </div>
    )
  }

  /* ─── ERROR ─── */
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
              {isCancelled ? "Limpeza cancelada" : "Erro na limpeza"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>

      {progress > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Trash2 size={12} />
              Progresso parcial
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {progress}<span className="text-muted-foreground">/{total}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Clock size={12} />
              Tempo decorrido
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
