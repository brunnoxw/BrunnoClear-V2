import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import type { DiscordMember } from "@/types/discord"

export function memberAvatar(m: DiscordMember): string | null {
  if (m.avatarUrl) return m.avatarUrl
  if (m.avatar) return `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=64`
  return null
}

export function memberName(m: DiscordMember): string {
  return m.nickname || m.global_name || m.username || m.id
}

interface UserPickerProps {
  guildId: string
  onSelect: (member: DiscordMember) => void
  disabled?: boolean
  excludeIds?: string[]
  placeholder?: string
}

/**
 * Campo para colar o ID de um usuário e confirmar. Ao confirmar, faz UM único
 * fetch do membro no servidor para validar e trazer foto + nome (sem listar
 * todos os membros, que é pesado para a conta). Retorna o membro via onSelect.
 */
export function UserPicker({ guildId, onSelect, disabled, excludeIds = [], placeholder = "Colar ID do usuário" }: UserPickerProps) {
  const { activeToken } = useTokens()
  const [id, setId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const confirm = async () => {
    const uid = id.trim()
    if (!uid || !activeToken || !guildId) return
    if (excludeIds.includes(uid)) { setError("Usuário já adicionado"); return }
    setLoading(true)
    setError("")
    try {
      const res = await api.getGuildMember(activeToken.id, guildId, uid)
      onSelect(res.data as DiscordMember)
      setId("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Usuário não encontrado neste servidor")
    } finally {
      setLoading(false)
    }
  }

  const blocked = disabled || !guildId

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
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
