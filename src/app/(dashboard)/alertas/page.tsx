
import { useState, useEffect, useRef, useCallback } from "react"
import {
  BellRing,
  Bell,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Hash,
  ExternalLink,
  Loader2,
  MessageSquare,
  Search,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api-client"
import { useWSEvent } from "@/hooks/use-websocket"
import type { KeywordAlertConfig, KeywordAlertMatch, KeywordAlertStatus } from "@/types/keyword-alerts"
import type { AppSettings } from "@/types/api"

const DEFAULT_CONFIG: KeywordAlertConfig = {
  enabled: false,
  keywords: [],
  ignoreOwn: true,
  ignoreBots: false,
  caseSensitive: false,
  wholeWord: false,
  dmOnly: false,
}

function notify(title: string, body: string, icon?: string) {
  try { window.electronAPI?.notification.show({ title, body, icon }) } catch {}
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function highlight(content: string, keyword: string) {
  if (!keyword) return content
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return content
  return (
    <>
      {content.slice(0, idx)}
      <mark className="rounded bg-primary/25 px-0.5 text-primary">{content.slice(idx, idx + keyword.length)}</mark>
      {content.slice(idx + keyword.length)}
    </>
  )
}

export default function PaginaAlertas() {
  const [config, setConfig] = useState<KeywordAlertConfig>(DEFAULT_CONFIG)
  const [connected, setConnected] = useState(false)
  const [matches, setMatches] = useState<KeywordAlertMatch[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const notificationsRef = useRef(true)
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])

  useEffect(() => {
    api.getSettings().then((res) => {
      const data = res.data as AppSettings
      notificationsRef.current = data?.general?.notifications ?? true
    }).catch(() => {})

    Promise.all([
      api.getKeywordAlerts(),
      api.getKeywordAlertHistory(),
    ]).then(([statusRes, histRes]) => {
      const status = statusRes.data as KeywordAlertStatus
      setConfig(status.config)
      setConnected(status.connected)
      setMatches((histRes.data as KeywordAlertMatch[]) || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useWSEvent<KeywordAlertMatch>("keyword-alert:match", (match) => {
    setMatches((prev) => [match, ...prev].slice(0, 500))
    if (notificationsRef.current) {
      notify(
        `🔔 "${match.keyword}" • ${match.authorUsername}`,
        `${match.guildName} › ${match.channelName}\n${match.content}`,
        match.authorAvatarUrl || undefined,
      )
    }
  })

  const persist = useCallback(async (patch: Partial<KeywordAlertConfig>) => {
    setSaving(true)
    try {
      const res = await api.updateKeywordAlerts(patch)
      const status = res.data as KeywordAlertStatus
      setConfig(status.config)
      setConnected(status.connected)
    } catch {
      // reverte para o estado anterior em caso de erro
      setConfig(configRef.current)
    } finally {
      setSaving(false)
    }
  }, [])

  const addKeywords = () => {
    const novas = keywordInput.split(",").map((k) => k.trim()).filter(Boolean)
    if (novas.length === 0) return
    const merged = Array.from(new Set([...config.keywords, ...novas]))
    setKeywordInput("")
    setConfig((c) => ({ ...c, keywords: merged }))
    persist({ keywords: merged })
  }

  const removeKeyword = (kw: string) => {
    const merged = config.keywords.filter((k) => k !== kw)
    setConfig((c) => ({ ...c, keywords: merged }))
    persist({ keywords: merged })
  }

  const toggle = (key: keyof KeywordAlertConfig, value: boolean) => {
    setConfig((c) => ({ ...c, [key]: value }))
    persist({ [key]: value })
  }

  const openMessage = (url: string) => {
    window.electronAPI?.shell.openExternal(url).catch(() => {})
  }

  const handleClearHistory = async () => {
    setMatches([])
    await api.clearKeywordAlertHistory().catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const active = config.enabled && config.keywords.length > 0

  return (
    <div className="space-y-6">
      {/* Header / master switch */}
      <div className={`rounded-xl border p-6 transition-colors ${active ? "border-primary/30 bg-primary/5" : "border-border bg-card/40"}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${active ? "bg-primary/15" : "bg-secondary/40"}`}>
            {active ? <BellRing size={22} className="text-primary" /> : <Bell size={22} className="text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">Alertas por palavra-chave</h2>
            <p className="text-xs text-muted-foreground">
              Recebe uma notificação quando alguém escrever uma das palavras em qualquer servidor ou DM da conta ativa
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            <Switch checked={config.enabled} onCheckedChange={(v) => toggle("enabled", v)} />
          </div>
        </div>

        {config.enabled && !connected && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 text-yellow-500" />
            <span className="text-xs text-yellow-400">
              Nenhuma conta conectada. Os alertas começam assim que você conectar uma conta no painel.
            </span>
          </div>
        )}
        {active && connected && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs text-primary">Monitorando {config.keywords.length} palavra(s) em tempo real</span>
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="rounded-xl border border-border bg-card/40 p-6">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Palavras-chave</label>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Digite uma palavra e Enter (ou separe por vírgula)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeywords() } }}
            className="h-11 border-border bg-secondary/40 text-sm"
          />
          <Button onClick={addKeywords} disabled={!keywordInput.trim()} className="h-11 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={16} className="mr-1" /> Adicionar
          </Button>
        </div>

        {config.keywords.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {config.keywords.map((kw) => (
              <span key={kw} className="group flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 py-1.5 pl-3 pr-1.5 text-sm text-foreground">
                <Hash size={12} className="text-primary/70" />
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Nenhuma palavra adicionada ainda.</p>
        )}
      </div>

      {/* Options */}
      <div className="grid gap-3 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-2">
        <OptionRow label="Ignorar minhas mensagens" desc="Não alerta quando você mesmo escreve" checked={config.ignoreOwn} onChange={(v) => toggle("ignoreOwn", v)} />
        <OptionRow label="Ignorar bots" desc="Não alerta mensagens de bots" checked={config.ignoreBots} onChange={(v) => toggle("ignoreBots", v)} />
        <OptionRow label="Diferenciar maiúsculas" desc="'Bola' ≠ 'bola'" checked={config.caseSensitive} onChange={(v) => toggle("caseSensitive", v)} />
        <OptionRow label="Palavra inteira" desc="'ola' não casa dentro de 'olaf'" checked={config.wholeWord} onChange={(v) => toggle("wholeWord", v)} />
        <OptionRow label="Apenas DMs" desc="Só alerta em mensagens diretas" checked={config.dmOnly} onChange={(v) => toggle("dmOnly", v)} />
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-primary/70" />
            <h3 className="text-sm font-semibold text-foreground">Detecções</h3>
            {matches.length > 0 && (
              <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">{matches.length}</span>
            )}
          </div>
          {matches.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearHistory} className="h-8 text-muted-foreground hover:text-red-400">
              <Trash2 size={14} className="mr-1.5" /> Limpar
            </Button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/40">
              {active ? <Search size={20} className="text-muted-foreground" /> : <Inbox size={20} className="text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {active ? "Aguardando mensagens com suas palavras-chave..." : "Ative os alertas e adicione palavras para começar"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {matches.map((m) => (
              <div key={m.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/20">
                {m.authorAvatarUrl ? (
                  <img
                    src={m.authorAvatarUrl}
                    alt={m.authorUsername}
                    className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden") }}
                  />
                ) : null}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/40 text-xs font-bold text-muted-foreground ${m.authorAvatarUrl ? "hidden" : ""}`}>
                  {m.authorUsername.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{m.authorUsername}</span>
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">{m.keyword}</span>
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{timeAgo(m.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">{highlight(m.content, m.keyword)}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                    {m.isDM ? (
                      <span className="flex items-center gap-1"><MessageSquare size={10} /> {m.channelName}</span>
                    ) : (
                      <span className="flex items-center gap-1 truncate">
                        {m.guildIcon && <img src={m.guildIcon} alt="" className="h-3.5 w-3.5 rounded-full" />}
                        {m.guildName} <span className="text-muted-foreground/50">›</span> #{m.channelName}
                      </span>
                    )}
                    {m.channelId && (
                      <button onClick={() => openMessage(m.messageUrl)} className="ml-auto flex shrink-0 items-center gap-1 text-primary/80 hover:text-primary">
                        Abrir <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OptionRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-3">
      <div className="min-w-0 pr-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
