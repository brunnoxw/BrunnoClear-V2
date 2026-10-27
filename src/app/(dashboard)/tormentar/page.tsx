import { useState, useEffect, useRef } from "react"
import {
  Crosshair,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  MicOff,
  Headphones,
  PhoneOff,
  Tag,
  MessageSquareX,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { GuildPicker } from "@/components/guild-picker"
import { UserSelect } from "@/components/user-select"
import { useTokens } from "@/hooks/use-tokens"
import { useWSEvent } from "@/hooks/use-websocket"
import { api } from "@/lib/api-client"
import type { WSToolProgress, WSToolCompleted, WSToolError, WSToolWarning } from "@/types/websocket"

type Phase = "idle" | "running" | "completed" | "error"

interface TormentFlags {
  persistentMute: boolean
  persistentDeaf: boolean
  autoDisconnect: boolean
  persistentNick: boolean
  blacklistChat: boolean
}

const DEFAULT_FLAGS: TormentFlags = {
  persistentMute: false,
  persistentDeaf: false,
  autoDisconnect: false,
  persistentNick: false,
  blacklistChat: false,
}

interface ToggleDef {
  key: keyof TormentFlags
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  desc: string
  color: string
  glow: string
}

const TOGGLES: ToggleDef[] = [
  {
    key: "persistentMute",
    icon: MicOff,
    title: "Mute Persistente",
    desc: "Reaplica o mute servidor sempre que ele tentar se desmutar",
    color: "text-rose-400",
    glow: "bg-rose-500/10",
  },
  {
    key: "persistentDeaf",
    icon: Headphones,
    title: "Deaf Persistente",
    desc: "Ensurdece automaticamente se ele se desensurdecer",
    color: "text-orange-400",
    glow: "bg-orange-500/10",
  },
  {
    key: "autoDisconnect",
    icon: PhoneOff,
    title: "Auto Desconectar",
    desc: "Expulsa do canal sempre que ele entrar em qualquer call",
    color: "text-red-400",
    glow: "bg-red-500/10",
  },
  {
    key: "persistentNick",
    icon: Tag,
    title: "Apelido Forçado",
    desc: "Mantém o apelido travado no valor definido abaixo",
    color: "text-violet-400",
    glow: "bg-violet-500/10",
  },
  {
    key: "blacklistChat",
    icon: MessageSquareX,
    title: "Blacklist de Chat",
    desc: "Deleta toda mensagem enviada por ele neste servidor",
    color: "text-amber-400",
    glow: "bg-amber-500/10",
  },
]

export default function PaginaTormentar() {
  const { activeToken } = useTokens()
  const [guildId, setGuildId] = useState("")
  const [userId, setUserId] = useState("")
  const [nickname, setNickname] = useState("")
  const [flags, setFlags] = useState<TormentFlags>(DEFAULT_FLAGS)

  const [starting, setStarting] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [guildName, setGuildName] = useState("")
  const [guildIcon, setGuildIcon] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const taskIdRef = useRef<string | null>(null)
  useEffect(() => { taskIdRef.current = taskId }, [taskId])

  useWSEvent<WSToolProgress>("tool:progress", (data) => {
    if (data.taskId !== taskIdRef.current) return
    setStatus(data.message)
  })

  useWSEvent<WSToolCompleted>("tool:completed", (data) => {
    if (data.taskId !== taskIdRef.current) return
    setPhase("completed")
  })

  useWSEvent<WSToolError>("tool:error", (data) => {
    if (data.taskId !== taskIdRef.current) return
    setError((data as any).error || "Erro desconhecido")
    setPhase("error")
  })

  useWSEvent<WSToolWarning>("tool:warning", (data) => {
    if (data.taskId !== taskIdRef.current) return
    if (data.flag) {
      setFlags((prev) => ({ ...prev, [data.flag as keyof TormentFlags]: false }))
    }
    setWarnings((prev) => (prev.includes(data.message) ? prev : [...prev.slice(-3), data.message]))
  })

  useEffect(() => {
    api.getTasks().then(res => {
      const tasks = ((res as any).data || []) as any[]
      const running = tasks.find((t: any) =>
        (t.status === 'running' || t.status === 'paused') &&
        t.tool === 'call-utils' &&
        t.config?.subAction === 'torment'
      )
      if (running) {
        setTaskId(running.id)
        setUsername(running.config?.username || '')
        setGuildName(running.config?.guildName || '')
        setGuildIcon(running.config?.guildIcon || null)
        setUserId(running.config?.userId || '')
        setGuildId(running.config?.guildId || '')
        setFlags({ ...DEFAULT_FLAGS, ...(running.config?.flags || {}) })
        setNickname(running.config?.nickname || '')
        if (running.results?.length > 0) {
          setStatus(running.results[running.results.length - 1].message)
        } else {
          setStatus(`Tormento ativo em ${running.config?.username || 'usuário'}`)
        }
        setPhase('running')
      }
    }).catch(() => {})
  }, [])

  const activeCount = Object.values(flags).filter(Boolean).length

  const handleStart = async () => {
    if (!activeToken || !userId.trim() || !guildId.trim()) return
    if (activeCount === 0) {
      setError("Ative ao menos uma ação")
      return
    }
    setStarting(true)
    setError("")
    setWarnings([])
    try {
      const res = await api.runTool("call-utils", {
        tokenId: activeToken.id,
        action: "torment",
        userIds: [userId.trim()],
        guildId: guildId.trim(),
        flags,
        nickname: nickname.trim(),
      })
      const data = res.data as {
        taskId: string
        username: string
        userId: string
        guildName: string
        guildIcon: string | null
        avatarUrl: string | null
        flags: TormentFlags
        nickname: string
      }
      setTaskId(data.taskId)
      setUsername(data.username)
      setGuildName(data.guildName || '')
      setGuildIcon(data.guildIcon || null)
      setAvatarUrl(data.avatarUrl || null)
      setStatus(`Tormento ativo em ${data.username}`)
      setPhase("running")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro")
      setPhase("error")
    } finally {
      setStarting(false)
    }
  }

  const pushUpdate = async (nextFlags: TormentFlags, nextNick: string) => {
    if (!taskId) return
    try {
      await api.patch(`/tools/call-utils/${taskId}/torment`, {
        flags: nextFlags,
        nickname: nextNick,
      })
    } catch {}
  }

  const toggleFlag = (key: keyof TormentFlags) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (phase === "running") pushUpdate(next, nickname)
      return next
    })
  }

  const handleNicknameBlur = () => {
    if (phase === "running") pushUpdate(flags, nickname)
  }

  const handleStop = async () => {
    if (!taskId) return
    try {
      await api.delete(`/tools/call-utils/${taskId}`)
      setPhase("completed")
    } catch {}
  }

  const handleReset = () => {
    setPhase("idle")
    setError("")
    setTaskId(null)
    setStatus("")
    setUsername("")
    setAvatarUrl(null)
    setGuildName("")
    setGuildIcon(null)
    setFlags(DEFAULT_FLAGS)
    setNickname("")
    setWarnings([])
  }

  const renderToggleList = (disabled: boolean) => (
    <div className="grid gap-2.5">
      {TOGGLES.map((t) => {
        const Icon = t.icon
        const isOn = flags[t.key]
        return (
          <div
            key={t.key}
            className={
              "group flex items-center gap-4 rounded-xl border bg-card/40 p-4 transition-all " +
              (isOn ? "border-border/80 bg-card/60" : "border-border/40 hover:border-border/60")
            }
          >
            <div
              className={
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all " +
                t.glow +
                (isOn ? " ring-1 ring-inset ring-current/20" : "")
              }
            >
              <Icon size={18} className={t.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              {t.key === "persistentNick" && isOn && (
                <Input
                  placeholder="Apelido a forçar (vazio = remover)"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onBlur={handleNicknameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleNicknameBlur()
                    }
                  }}
                  disabled={disabled}
                  className="mt-2 h-9 border-border bg-secondary/40 text-xs"
                />
              )}
            </div>
            <Switch
              checked={isOn}
              onCheckedChange={() => toggleFlag(t.key)}
              disabled={disabled}
            />
          </div>
        )
      })}
    </div>
  )

  if (phase === "idle") {
    return (
      <div className="space-y-6">
        {!activeToken && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
            <AlertTriangle size={18} className="shrink-0 text-yellow-500" />
            <span className="text-sm text-yellow-400">Conecte uma conta primeiro</span>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card/40 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
              <Crosshair size={18} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tormentar</h2>
              <p className="text-xs text-muted-foreground">
                Aplica ações persistentes em um usuário específico do servidor
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                ID do Servidor
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="ID do servidor"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  className="h-11 flex-1 border-border bg-secondary/40 font-mono text-sm"
                  disabled={!activeToken}
                />
                <GuildPicker onSelect={(id) => { setGuildId(id); setUserId("") }} disabled={!activeToken} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Usuário Alvo
              </label>
              <UserSelect
                guildId={guildId}
                value={userId}
                onSelect={(id) => setUserId(id)}
                disabled={!activeToken}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ações
              </label>
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {activeCount} ativa(s)
              </span>
            </div>
            {renderToggleList(!activeToken)}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <Crosshair size={16} className="shrink-0 text-rose-400" />
            <span className="text-xs text-rose-300/90">
              Você precisa de permissões adequadas no servidor para as ações funcionarem. Toggles podem ser alterados a qualquer momento sem parar a task.
            </span>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleStart}
              disabled={starting || !activeToken || !userId.trim() || !guildId.trim() || activeCount === 0}
              className="h-11 w-full bg-rose-600 text-white hover:bg-rose-700"
            >
              {starting ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Play size={18} className="mr-2" />
              )}
              Iniciar Tormento
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "running") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border/50 bg-card/20 backdrop-blur-sm overflow-hidden">
          <div className="relative px-6 pt-6 pb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-rose-500/3 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-secondary/40 overflow-hidden border border-border/50 flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
                    ) : guildIcon ? (
                      <img src={guildIcon} alt={guildName} className="h-full w-full object-cover" />
                    ) : (
                      <Crosshair size={24} className="text-rose-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{username || 'Usuário'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Crosshair size={12} className="text-rose-400" />
                    {guildName || 'Servidor'} · {activeCount} ação(ões)
                  </p>
                </div>
              </div>
              <Button
                onClick={handleStop}
                variant="outline"
                size="sm"
                className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <StopCircle size={16} className="mr-1.5" /> Parar
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            <div className="rounded-xl bg-secondary/10 border border-border/30 p-5">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-rose-500/30" />
                  <div className="relative h-2.5 w-2.5 rounded-full bg-rose-500" />
                </div>
                <span className="text-xs font-medium uppercase tracking-widest text-rose-400">
                  Tormento Ativo
                </span>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">{status}</p>
              <p className="text-center text-[11px] text-muted-foreground/60 mt-1 font-mono">
                ID: {userId}
              </p>
            </div>

            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                    <span className="text-xs text-amber-300/90">{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Controles ao vivo
              </p>
              {renderToggleList(false)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "completed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary/40 overflow-hidden border border-border/50 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : (
                <CheckCircle2 size={24} className="text-green-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400">Tormento desativado</h3>
              {username && <p className="text-sm text-muted-foreground">{username}</p>}
            </div>
            <Button onClick={handleReset} variant="outline" className="h-10">
              Voltar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400">Erro</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleReset} variant="outline" className="h-10">
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
