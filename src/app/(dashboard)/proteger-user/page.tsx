

import { useState, useEffect } from "react"
import { Shield, Loader2, CheckCircle2, AlertTriangle, StopCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GuildPicker } from "@/components/guild-picker"
import { UserPicker, memberAvatar, memberName } from "@/components/user-picker"
import { TargetProfileCard } from "@/components/target-profile-card"
import { useTokens } from "@/hooks/use-tokens"
import { useWSEvent } from "@/hooks/use-websocket"
import { api } from "@/lib/api-client"
import type { WSToolProgress, WSToolCompleted, WSToolError, WSToolWarning } from "@/types/websocket"
import type { DiscordMember } from "@/types/discord"

type Phase = "idle" | "running" | "completed" | "error"

export default function PaginaProtegerUser() {
  const { activeToken } = useTokens()
  const [targets, setTargets] = useState<DiscordMember[]>([])
  const [guildId, setGuildId] = useState("")
  const [starting, setStarting] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState("")
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const [usernames, setUsernames] = useState<string[]>([])
  const [guildName, setGuildName] = useState("")
  const [guildIcon, setGuildIcon] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  useWSEvent<WSToolProgress>("tool:progress", (data) => {
    if (data.taskId !== taskId) return
    setStatus(data.message)
  })

  useWSEvent<WSToolCompleted>("tool:completed", (data) => {
    if (data.taskId !== taskId) return
    setPhase("completed")
  })

  useWSEvent<WSToolError>("tool:error", (data) => {
    if (data.taskId !== taskId) return
    setError((data as any).error || "Erro desconhecido")
    setPhase("error")
  })

  useWSEvent<WSToolWarning>("tool:warning", (data) => {
    if (data.taskId !== taskId) return
    setWarnings((prev) => (prev.includes(data.message) ? prev : [...prev.slice(-3), data.message]))
  })

  useEffect(() => {
    api.getTasks().then(res => {
      const tasks = ((res as any).data || []) as any[]
      const running = tasks.find((t: any) =>
        (t.status === 'running' || t.status === 'paused') &&
        t.tool === 'call-utils' &&
        t.config?.subAction === 'protect'
      )
      if (running) {
        setTaskId(running.id)
        setUsernames(running.config?.usernames || [])
        setGuildName(running.config?.guildName || '')
        setGuildIcon(running.config?.guildIcon || null)
        if (running.results?.length > 0) {
          setStatus(running.results[running.results.length - 1].message)
        } else {
          setStatus(`Proteção ativa: ${(running.config?.usernames || []).length} usuários`)
        }
        setPhase('running')
      }
    }).catch(() => {})
  }, [])

  const addTarget = (m: DiscordMember) => {
    setTargets((prev) => (prev.some((t) => t.id === m.id) ? prev : [...prev, m]))
  }
  const removeTarget = (id: string) => setTargets((prev) => prev.filter((t) => t.id !== id))

  const handleStart = async () => {
    if (!activeToken || targets.length === 0 || !guildId.trim()) return
    setStarting(true)
    setError("")
    setWarnings([])
    try {
      const res = await api.runTool("call-utils", {
        tokenId: activeToken.id,
        action: "protect",
        userIds: targets.map((t) => t.id),
        guildId: guildId.trim(),
      })
      const data = res.data as { taskId: string; usernames: string[]; guildName: string; guildIcon: string | null }
      setTaskId(data.taskId)
      setUsernames(data.usernames)
      setGuildName(data.guildName || '')
      setGuildIcon(data.guildIcon || null)
      setStatus(`Proteção ativa: ${data.usernames.length} usuários`)
      setPhase("running")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro")
      setPhase("error")
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    if (!taskId) return
    try {
      await api.delete(`/tools/call-utils/${taskId}`)
      setPhase("completed")
    } catch {}
  }

  const handleReset = () => {
    setPhase("idle"); setError(""); setTaskId(null); setStatus(""); setUsernames([])
    setGuildName(""); setGuildIcon(null); setWarnings([])
  }

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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Proteger Usuário</h2>
              <p className="text-xs text-muted-foreground">Protege usuários contra mute e deaf forçados (anti-mute/deaf)</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ID do Servidor</label>
              <div className="flex gap-2">
                <Input placeholder="ID do servidor" value={guildId} onChange={(e) => setGuildId(e.target.value)} className="h-11 flex-1 border-border bg-secondary/40 font-mono text-sm" disabled={!activeToken} />
                <GuildPicker onSelect={(id) => { setGuildId(id); setTargets([]) }} disabled={!activeToken} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Usuários para Proteger</label>
              <UserPicker
                guildId={guildId}
                onSelect={addTarget}
                excludeIds={targets.map((t) => t.id)}
                disabled={!activeToken}
                placeholder="Colar ID do usuário"
              />
              {targets.length > 0 && (
                <div className="space-y-2 pt-1">
                  {targets.map((m) => (
                    <TargetProfileCard
                      key={m.id}
                      userId={m.id}
                      fallbackName={memberName(m)}
                      fallbackAvatar={memberAvatar(m)}
                      onRemove={() => removeTarget(m.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <Shield size={16} className="shrink-0 text-emerald-400" />
            <span className="text-xs text-emerald-400">Quando alguém mutar ou ensurdecer os usuários protegidos, eles serão desmutados/desensurdecidos automaticamente.</span>
          </div>
          <div className="mt-6">
            <Button onClick={handleStart} disabled={starting || !activeToken || targets.length === 0 || !guildId.trim()} className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">
              {starting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Shield size={18} className="mr-2" />}
              Ativar Proteção
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
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/3 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-secondary/40 overflow-hidden border border-border/50 flex items-center justify-center shrink-0">
                    {guildIcon ? (
                      <img src={guildIcon} alt={guildName} className="h-full w-full object-cover" />
                    ) : (
                      <Shield size={24} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{guildName || 'Servidor'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Shield size={12} className="text-emerald-400" />
                    {usernames.length} usuário(s) protegido(s)
                  </p>
                </div>
              </div>
              <Button onClick={handleStop} variant="outline" size="sm" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <StopCircle size={16} className="mr-1.5" /> Parar
              </Button>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-xl bg-secondary/10 border border-border/30 p-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
                  <div className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">Proteção Ativa</span>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">{status}</p>
              {usernames.length > 0 && (
                <p className="text-center text-xs text-muted-foreground/70 mt-1">Protegidos: {usernames.join(", ")}</p>
              )}
            </div>
            {warnings.length > 0 && warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                <span className="text-xs text-amber-300/90">{w}</span>
              </div>
            ))}
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
              {guildIcon ? (
                <img src={guildIcon} alt={guildName} className="h-full w-full object-cover" />
              ) : (
                <CheckCircle2 size={24} className="text-green-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400">Proteção desativada</h3>
              {guildName && <p className="text-sm text-muted-foreground">{guildName}</p>}
            </div>
            <Button onClick={handleReset} variant="outline" className="h-10">Voltar</Button>
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
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center"><AlertTriangle size={24} className="text-red-400" /></div>
            <div className="flex-1"><h3 className="text-lg font-semibold text-red-400">Erro</h3><p className="text-sm text-muted-foreground">{error}</p></div>
            <Button onClick={handleReset} variant="outline" className="h-10">Tentar novamente</Button>
          </div>
        </div>
      </div>
    )
  }
  return null
}
