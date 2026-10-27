import { useState, useEffect } from "react"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { memberAvatar, memberName } from "@/components/user-picker"
import { TargetProfileCard } from "@/components/target-profile-card"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import type { DiscordMember } from "@/types/discord"

interface UserSelectProps {
  guildId: string
  value: string
  onSelect: (userId: string, member?: DiscordMember) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * Seletor de usuário único: cole o ID e confirme. Ao confirmar, faz UM único
 * fetch no servidor para validar e mostrar um cartão bonito (foto + nome + id).
 */
export function UserSelect({ guildId, value, onSelect, disabled, placeholder = "Colar ID do usuário" }: UserSelectProps) {
  const { activeToken } = useTokens()
  const [member, setMember] = useState<DiscordMember | null>(null)
  const [id, setId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (!value) { setMember(null); setId("") } }, [value])

  const confirm = async () => {
    const uid = id.trim()
    if (!uid || !activeToken || !guildId) return
    setLoading(true)
    setError("")
    try {
      const res = await api.getGuildMember(activeToken.id, guildId, uid)
      const m = res.data as DiscordMember
      setMember(m)
      onSelect(m.id, m)
      setId("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Usuário não encontrado neste servidor")
    } finally {
      setLoading(false)
    }
  }

  const clear = () => { setMember(null); setId(""); setError(""); onSelect("") }
  const blocked = disabled || !guildId

  // Prévia do usuário selecionado (foto, nome, badges, idade da conta...).
  if (value) {
    return (
      <TargetProfileCard
        userId={value}
        fallbackName={member && member.id === value ? memberName(member) : undefined}
        fallbackAvatar={member && member.id === value ? memberAvatar(member) : undefined}
        onRemove={clear}
      />
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          placeholder={!guildId ? "Selecione um servidor primeiro" : placeholder}
          value={id}
          onChange={(e) => { setId(e.target.value); if (error) setError("") }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirm() } }}
          className="h-11 flex-1 border-border bg-secondary/40 font-mono text-sm"
          disabled={blocked}
        />
        <Button onClick={confirm} variant="outline" className="h-11 px-3" disabled={blocked || loading || !id.trim()}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
