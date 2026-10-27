import { useState, useEffect } from "react"
import { Loader2, X, CalendarClock, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import type { MiniProfile } from "@/types/discord"

function accountAge(iso?: string): string {
  if (!iso) return ""
  const created = new Date(iso).getTime()
  if (!created) return ""
  const days = Math.floor((Date.now() - created) / 86400000)
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0) return months > 0 ? `${years}a ${months}m` : `${years} ano${years > 1 ? "s" : ""}`
  if (months > 0) return `${months} ${months > 1 ? "meses" : "mês"}`
  return `${days} dia${days !== 1 ? "s" : ""}`
}

interface TargetProfileCardProps {
  userId: string
  fallbackName?: string
  fallbackAvatar?: string | null
  onRemove?: () => void
  className?: string
}

/**
 * Cartão de prévia de um usuário: foto, nome, badges, idade da conta e
 * servidores em comum. Faz um fetch leve do perfil ao montar.
 */
export function TargetProfileCard({ userId, fallbackName, fallbackAvatar, onRemove, className }: TargetProfileCardProps) {
  const { activeToken } = useTokens()
  const [profile, setProfile] = useState<MiniProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeToken || !userId) return
    let cancelled = false
    setProfile(null)
    setLoading(true)
    api.getMiniProfile(activeToken.id, userId)
      .then((res) => { if (!cancelled) setProfile(res.data as MiniProfile) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeToken, userId])

  const name = profile ? (profile.globalName || profile.username) : (fallbackName || "Usuário")
  const avatar = profile?.avatarUrl || fallbackAvatar || null

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5", className)}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary/60 flex items-center justify-center">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {profile?.bot && (
            <span className="rounded bg-indigo-500/15 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-indigo-400">Bot</span>
          )}
          {profile && profile.badges.length > 0 && (
            <div className="flex shrink-0 items-center gap-0.5">
              {profile.badges.slice(0, 6).map((b) => (
                <img key={b.name} src={b.url} alt={b.tooltip} title={b.tooltip} className="h-3.5 w-3.5" />
              ))}
            </div>
          )}
        </div>
        <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground">{userId}</p>
        {profile ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/80">
            <span className="flex items-center gap-1"><CalendarClock size={10} /> criada há {accountAge(profile.createdAt)}</span>
            <span className="flex items-center gap-1"><Server size={10} /> {profile.mutualGuilds} em comum</span>
          </div>
        ) : loading ? (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Loader2 size={10} className="animate-spin" /> carregando perfil…
          </div>
        ) : null}
      </div>
      {onRemove && (
        <button onClick={onRemove} className="shrink-0 self-start rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-red-400">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
