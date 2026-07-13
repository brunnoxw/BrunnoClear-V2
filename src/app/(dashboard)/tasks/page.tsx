
import { useState, useEffect, useCallback } from "react"
import {
  ListTodo,
  Loader2,
  StopCircle,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pause,
  XCircle,
  RefreshCw,
  Timer,
  Link2,
  Shield,
  Copy,
  Trash,
  UserMinus,
  LogOut,
  PhoneOff,
  Image,
  Package,
  Terminal,
  MoveRight,
  MicOff,
  VolumeX,
  Users,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api-client"
import { useWSEvent } from "@/hooks/use-websocket"
import type { ToolTask, ToolType } from "@/types/tools"
import type { WSToolProgress, WSToolCompleted, WSToolError } from "@/types/websocket"

const TOOL_META: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  "limpar-dm": { name: "Limpar DM", icon: <Trash size={16} />, color: "text-red-400" },
  "limpar-dms-abertas": { name: "Limpar DMs Abertas", icon: <Trash size={16} />, color: "text-red-400" },
  "limpar-package": { name: "Limpar Package", icon: <Package size={16} />, color: "text-orange-400" },
  "abrir-dms": { name: "Abrir DMs", icon: <MessageSquare size={16} />, color: "text-primary" },
  "fechar-dms": { name: "Fechar DMs", icon: <PhoneOff size={16} />, color: "text-yellow-400" },
  "remover-amigos": { name: "Remover Amigos", icon: <UserMinus size={16} />, color: "text-pink-400" },
  "remover-servidores": { name: "Sair de Servidores", icon: <LogOut size={16} />, color: "text-purple-400" },
  "clonar-servidor": { name: "Clonar Servidor", icon: <Copy size={16} />, color: "text-primary" },
  "scraper-icons": { name: "Scraper Ícones", icon: <Image size={16} />, color: "text-cyan-400" },
  "backup": { name: "Backup", icon: <Package size={16} />, color: "text-blue-400" },
  "prefix-commands": { name: "Prefix Commands", icon: <Terminal size={16} />, color: "text-gray-400" },
}

const CALL_UTILS_META: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  "farm-hours": { name: "Farm Call", icon: <Timer size={16} />, color: "text-green-400" },
  "elevator": { name: "Elevador", icon: <MoveRight size={16} />, color: "text-amber-400" },
  "leash": { name: "Coleira", icon: <Link2 size={16} />, color: "text-indigo-400" },
  "protect": { name: "Proteger User", icon: <Shield size={16} />, color: "text-emerald-400" },
  "disconnect-all": { name: "Desconectar Call", icon: <PhoneOff size={16} />, color: "text-red-400" },
  "move-members": { name: "Mover Call", icon: <MoveRight size={16} />, color: "text-blue-400" },
  "mute-all": { name: "Mutar Call", icon: <MicOff size={16} />, color: "text-yellow-400" },
  "unmute-all": { name: "Desmutar Call", icon: <MicOff size={16} />, color: "text-green-400" },
  "deafen-all": { name: "Ensurdecer Call", icon: <VolumeX size={16} />, color: "text-orange-400" },
  "undeafen-all": { name: "Desensurdecer Call", icon: <VolumeX size={16} />, color: "text-green-400" },
  "list-members": { name: "Listar Call", icon: <Users size={16} />, color: "text-cyan-400" },
}

function getToolMeta(task: ToolTask) {
  if (task.tool === "call-utils") {
    const subAction = (task.config as any)?.subAction || (task.config as any)?.action
    return CALL_UTILS_META[subAction] || { name: "Call Utils", icon: <PhoneOff size={16} />, color: "text-gray-400" }
  }
  return TOOL_META[task.tool] || { name: task.tool, icon: <ListTodo size={16} />, color: "text-gray-400" }
}

function getGuildInfo(task: ToolTask): { name?: string; icon?: string | null } | null {
  const cfg = task.config as any
  if (cfg?.guildName) return { name: cfg.guildName, icon: cfg.guildIcon }
  if (cfg?.sourceGuildName) return { name: cfg.sourceGuildName, icon: cfg.sourceGuildIcon }
  return null
}

function getStatusBadge(status: string) {
  switch (status) {
    case "running":
      return { label: "Rodando", icon: <Loader2 size={12} className="animate-spin" />, className: "bg-green-500/10 text-green-400 border-green-500/20" }
    case "paused":
      return { label: "Pausado", icon: <Pause size={12} />, className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" }
    case "completed":
      return { label: "Concluído", icon: <CheckCircle2 size={12} />, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
    case "error":
      return { label: "Erro", icon: <AlertTriangle size={12} />, className: "bg-red-500/10 text-red-400 border-red-500/20" }
    case "cancelled":
      return { label: "Cancelado", icon: <XCircle size={12} />, className: "bg-muted text-muted-foreground border-border" }
    default:
      return { label: "Idle", icon: <Clock size={12} />, className: "bg-muted text-muted-foreground border-border" }
  }
}

function formatElapsed(startedAt: string, completedAt?: string) {
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getLastMessage(task: ToolTask): string | null {
  if (task.results && task.results.length > 0) {
    return task.results[task.results.length - 1].message
  }
  return null
}

type Filter = "all" | "running" | "completed" | "error"

export default function PaginaTasks() {
  const [tasks, setTasks] = useState<ToolTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [cancelling, setCancelling] = useState<Set<string>>(new Set())

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.getTasks()
      setTasks(((res as any).data || []) as ToolTask[])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useWSEvent<WSToolProgress>("tool:progress", (data) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === data.taskId)
      if (!exists) {
        fetchTasks()
        return prev
      }
      return prev.map((t) =>
        t.id === data.taskId
          ? {
              ...t,
              progress: data.progress,
              total: data.total,
              status: "running" as const,
              results: data.message
                ? [...(t.results || []), { timestamp: new Date().toISOString(), success: true, message: data.message }]
                : t.results,
            }
          : t
      )
    })
  })

  useWSEvent<WSToolCompleted>("tool:completed", (data) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === data.taskId
          ? { ...t, status: "completed" as const, completedAt: new Date().toISOString(), results: data.results || t.results }
          : t
      )
    )
  })

  useWSEvent<WSToolError>("tool:error", (data) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === data.taskId
          ? { ...t, status: "error" as const, error: data.error, completedAt: new Date().toISOString() }
          : t
      )
    )
  })

  const handleCancel = async (taskId: string) => {
    setCancelling((prev) => new Set(prev).add(taskId))
    try {
      await api.cancelTask(taskId)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "cancelled" as const, completedAt: new Date().toISOString() } : t))
    } catch {}
    setCancelling((prev) => { const n = new Set(prev); n.delete(taskId); return n })
  }

  const handleClearCompleted = async () => {
    try {
      await api.clearCompletedTasks()
      setTasks((prev) => prev.filter((t) => t.status === "running" || t.status === "paused" || t.status === "idle"))
    } catch {}
  }

  const filtered = tasks
    .filter((t) => {
      if (filter === "running") return t.status === "running" || t.status === "paused"
      if (filter === "completed") return t.status === "completed"
      if (filter === "error") return t.status === "error" || t.status === "cancelled"
      return true
    })
    .sort((a, b) => {
      const order: Record<string, number> = { running: 0, paused: 1, idle: 2, error: 3, cancelled: 4, completed: 5 }
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (diff !== 0) return diff
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    })

  const runningCount = tasks.filter((t) => t.status === "running" || t.status === "paused").length
  const completedCount = tasks.filter((t) => t.status === "completed").length
  const errorCount = tasks.filter((t) => t.status === "error" || t.status === "cancelled").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ListTodo size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gerenciador de Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {runningCount > 0 ? `${runningCount} tarefa(s) em execução` : "Nenhuma tarefa em execução"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTasks} variant="outline" size="sm" className="h-8 gap-1.5">
            <RefreshCw size={14} /> Atualizar
          </Button>
          {(completedCount > 0 || errorCount > 0) && (
            <Button onClick={handleClearCompleted} variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground">
              <Trash2 size={14} /> Limpar finalizadas
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: tasks.length, active: filter === "all", onClick: () => setFilter("all"), color: "text-foreground" },
          { label: "Rodando", value: runningCount, active: filter === "running", onClick: () => setFilter("running"), color: "text-green-400" },
          { label: "Concluídas", value: completedCount, active: filter === "completed", onClick: () => setFilter("completed"), color: "text-emerald-400" },
          { label: "Erros", value: errorCount, active: filter === "error", onClick: () => setFilter("error"), color: "text-red-400" },
        ].map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className={`rounded-xl border p-3 text-left transition-colors ${
              s.active ? "border-primary/30 bg-primary/5" : "border-border bg-card/40 hover:bg-secondary/40"
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 p-12 text-center">
          <ListTodo size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Nenhuma tarefa registrada" : "Nenhuma tarefa neste filtro"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const meta = getToolMeta(task)
            const badge = getStatusBadge(task.status)
            const guild = getGuildInfo(task)
            const pct = task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0
            const lastMsg = getLastMessage(task)
            const isActive = task.status === "running" || task.status === "paused"

            return (
              <div
                key={task.id}
                className={`rounded-xl border bg-card/40 p-4 transition-colors ${
                  isActive ? "border-border/80" : "border-border/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {guild?.icon ? (
                      <div className="h-10 w-10 rounded-xl bg-secondary/40 overflow-hidden border border-border/50 flex items-center justify-center">
                        <img src={guild.icon} alt={guild.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/40 ${meta.color}`}>
                        {meta.icon}
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{meta.name}</span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>

                    {guild?.name && (
                      <p className="text-xs text-muted-foreground mb-1">{guild.name}</p>
                    )}

                    {(task.config as any)?.usernames && (
                      <p className="text-xs text-muted-foreground/70 mb-1">
                        Alvos: {((task.config as any).usernames as string[]).join(", ")}
                      </p>
                    )}

                    {(task.config as any)?.channelName && (
                      <p className="text-xs text-muted-foreground/70 mb-1">
                        Canal: {(task.config as any).channelName}
                      </p>
                    )}

                    {isActive && task.total > 0 && (
                      <div className="mt-2 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">{task.progress}/{task.total}</span>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}

                    {lastMsg && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-1">{lastMsg}</p>
                    )}

                    {task.error && (
                      <p className="text-[11px] text-red-400/80 mt-1">{task.error}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatElapsed(task.startedAt, task.completedAt)}
                      </span>
                      <span className="font-mono">{task.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isActive && (
                      <Button
                        onClick={() => handleCancel(task.id)}
                        disabled={cancelling.has(task.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        {cancelling.has(task.id) ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <StopCircle size={14} />
                        )}
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
