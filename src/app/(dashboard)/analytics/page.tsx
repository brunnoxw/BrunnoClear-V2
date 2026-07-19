
import { useEffect, useState } from "react"
import {
  Users,
  Clock,
  BarChart3,
  MessageSquare,
  Zap,
  CalendarDays,
  Activity,
  Target,
  Timer,
  Hash,
  Database,
  Copy,
  X,
  UserMinus,
  ServerOff,
  Image,
  Wrench,
  Phone,
  Terminal,
  TrendingUp,
  Layers,
  Shield,
  Eye,
  Mic,
  Globe,
  ArrowUpDown,
  ChevronDown,
  Check,
  Package,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api-client"

interface CleanupRecord {
  id: string
  username: string
  userId: string
  avatarUrl: string | null
  messagesDeleted: number
  messagesScanned: number
  duration: number
  date: string
  source?: string
  accountId?: string
  accountUsername?: string
  accountAvatar?: string | null
}

interface ToolActionRecord {
  id: string
  type: string
  date: string
  duration: number
  details: Record<string, number | string>
  accountId?: string
  accountUsername?: string
  accountAvatar?: string | null
}

interface AccountSummary {
  id: string
  username: string
  avatar: string | null
  cleanups: number
  actions: number
  messagesDeleted: number
}

interface AnalyticsData {
  totalMessagesDeleted: number
  totalUsersCleanedUnique: number
  totalCleanups: number
  totalTimeSpent: number
  cleanups: CleanupRecord[]
  toolActions: ToolActionRecord[]
  accounts: AccountSummary[]
  scope: string
}

interface AccountOption {
  id: string
  username: string
  avatarUrl: string | null
  connected: boolean
  cleanups: number
  actions: number
}

interface MonitoringAggregate {
  totalCallSessions: number
  totalCallTime: number
  totalMessages: number
  totalDeleted: number
  totalMentions: number
  totalMedia: number
  uniqueParticipants: number
  totalServers: number
  dailyCalls: Array<{ date: string; totalTime: number; count: number }>
  topChannels: Array<{ channelId: string; channelName: string; guildName: string; messageCount: number; callTime: number }>
  topParticipants: Array<{ userId: string; username: string; avatar: string | null; avatarUrl?: string; callTime: number; messageCount: number }>
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'backup':             { label: 'Backup',             icon: <Database size={14} />,  color: 'text-blue-400' },
  'clonar-servidor':    { label: 'Clonar Servidor',    icon: <Copy size={14} />,      color: 'text-purple-400' },
  'fechar-dms':         { label: 'Fechar DMs',         icon: <X size={14} />,         color: 'text-orange-400' },
  'remover-amigos':     { label: 'Remover Amigos',     icon: <UserMinus size={14} />, color: 'text-red-400' },
  'remover-servidores': { label: 'Sair de Servidores', icon: <ServerOff size={14} />, color: 'text-yellow-400' },
  'scraper-icons':      { label: 'Scraper Icons',      icon: <Image size={14} />,     color: 'text-emerald-400' },
  'call-utils':         { label: 'Call Utils',          icon: <Phone size={14} />,     color: 'text-cyan-400' },
  'prefix-commands':    { label: 'Prefix Commands',     icon: <Terminal size={14} />,  color: 'text-pink-400' },
}

const CALL_ACTION_LABELS: Record<string, string> = {
  'farm-hours': 'Farm Horas',
  'elevator': 'Elevador',
  'leash': 'Coleira',
  'protect': 'Proteger',
  'disconnect-all': 'Desconectar Todos',
  'move-members': 'Mover Membros',
  'mute-all': 'Mutar Todos',
  'unmute-all': 'Desmutar Todos',
  'deafen-all': 'Ensurdecer Todos',
  'undeafen-all': 'Desensurdecer Todos',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatDurationMs(ms: number): string {
  return formatDuration(ms / 1000)
}

function toolDetailsSummary(action: ToolActionRecord): string {
  const d = action.details
  switch (action.type) {
    case 'backup':
      return `${d.messagesBackedUp ?? 0} msgs, ${d.attachmentsDownloaded ?? 0} anexos`
    case 'clonar-servidor':
      return `${d.sourceGuild} → ${d.targetGuild} (${d.errors ?? 0} erros)`
    case 'fechar-dms':
      return `${d.dmsClosed ?? 0}/${d.totalDms ?? 0} DMs`
    case 'remover-amigos':
      return `${d.friendsRemoved ?? 0}/${d.totalFriends ?? 0} amigos`
    case 'remover-servidores':
      return `${d.serversLeft ?? 0}/${d.totalServers ?? 0} servidores`
    case 'scraper-icons':
      return `${d.imagesSent ?? 0}/${d.imagesCollected ?? 0} imagens${Number(d.errors) > 0 ? ` (${d.errors} erros)` : ''}`
    case 'call-utils': {
      const a = CALL_ACTION_LABELS[String(d.action)] || String(d.action || '').replace(/-/g, ' ')
      const val = d.membersAffected ?? d.movements ?? d.pulls ?? d.protections ?? ''
      return val ? `${a}: ${val}` : a
    }
    case 'prefix-commands': {
      const a = String(d.action || '')
      if (a === 'cl') return `${d.messagesDeleted ?? 0} msgs deletadas em ${d.channel ?? '?'}`
      return a
    }
    default:
      return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
  }
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-3">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground`}>
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
        {typeof value === 'number' ? value.toLocaleString("pt-BR") : value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ActionList({ actions, title, emptyText }: {
  actions: ToolActionRecord[]
  title: string
  emptyText: string
}) {
  const recent = [...actions].reverse().slice(0, 20)
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{recent.length} de {actions.length}</span>
      </div>
      {recent.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {recent.map((a) => {
            const meta = TOOL_META[a.type] || { label: a.type, icon: <Wrench size={14} />, color: 'text-muted-foreground' }
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50 shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{meta.label}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{toolDetailsSummary(a)}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock size={10} />
                      {formatDuration(a.duration)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays size={10} />
                    {new Date(a.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(a.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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

const chartConfig = {
  count: { label: "Mensagens", color: "var(--primary)" },
} satisfies ChartConfig

const callChartConfig = {
  count: { label: "Sessões", color: "var(--chart-2, #8b5cf6)" },
} satisfies ChartConfig

const cleanupChartConfig = {
  count: { label: "Deletadas", color: "var(--primary)" },
} satisfies ChartConfig

function ChartToggle({ chartType, setChartType }: { chartType: "bar" | "line"; setChartType: (v: "bar" | "line") => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
      <button onClick={() => setChartType("line")} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${chartType === "line" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        <Activity size={12} /> Linha
      </button>
      <button onClick={() => setChartType("bar")} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${chartType === "bar" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        <BarChart3 size={12} /> Barras
      </button>
    </div>
  )
}

function AccountSelector({ accounts, selected, onSelect, busy }: {
  accounts: AccountOption[]
  selected: string
  onSelect: (id: string) => void
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = accounts.find((a) => a.id === selected)
  const totalCleanups = accounts.reduce((s, a) => s + a.cleanups, 0)
  const totalActions = accounts.reduce((s, a) => s + a.actions, 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="group flex items-center gap-2.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-left transition-colors hover:bg-card/70 hover:border-primary/40 min-w-[200px]">
          {selected === "all" ? (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users size={14} />
            </div>
          ) : (
            <Avatar className="h-7 w-7 shrink-0 border border-border">
              <AvatarImage src={current?.avatarUrl || undefined} alt={current?.username} />
              <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                {(current?.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Exibindo</div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate leading-tight mt-0.5">
              {selected === "all" ? "Todas as contas" : current?.username || "Conta"}
              {current?.connected && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" title="Conta conectada" />
              )}
            </div>
          </div>
          {busy
            ? <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            : <ChevronDown size={15} className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <button
          onClick={() => { onSelect("all"); setOpen(false) }}
          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/60 ${selected === "all" ? "bg-secondary/50" : ""}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">Todas as contas</div>
            <div className="text-[11px] text-muted-foreground">{totalCleanups} limpezas · {totalActions} ações</div>
          </div>
          {selected === "all" && <Check size={15} className="shrink-0 text-primary" />}
        </button>

        {accounts.length > 0 && <div className="my-1 h-px bg-border" />}

        <div className="max-h-72 overflow-y-auto pr-0.5">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a.id); setOpen(false) }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/60 ${selected === a.id ? "bg-secondary/50" : ""}`}
            >
              <Avatar className="h-8 w-8 shrink-0 border border-border">
                <AvatarImage src={a.avatarUrl || undefined} alt={a.username} />
                <AvatarFallback className="bg-primary/10 text-xs text-primary">{a.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                  {a.username}
                  {a.connected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" title="Conta conectada" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{a.cleanups} limpezas · {a.actions} ações</div>
              </div>
              {selected === a.id && <Check size={15} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function PaginaAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [monitoring, setMonitoring] = useState<MonitoringAggregate | null>(null)
  const [tokenAccounts, setTokenAccounts] = useState<AccountOption[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      let connectedId: string | null = null
      let tokenList: Array<{ id: string; label?: string; user?: { id: string; username?: string }; avatarUrl?: string }> = []
      try {
        const [tokensRes, activeRes] = await Promise.all([api.getTokens(), api.getActiveToken()])
        tokenList = (tokensRes.data as typeof tokenList) || []
        const active = activeRes.data
        if (active?.connected && active.tokenId) {
          connectedId = tokenList.find((t) => t.id === active.tokenId)?.user?.id || null
        }
      } catch { /* ignora */ }
      if (cancelled) return

      setTokenAccounts(
        tokenList
          .filter((t) => t.user?.id)
          .map((t) => ({
            id: t.user!.id,
            username: t.user!.username || t.label || "Conta",
            avatarUrl: t.avatarUrl || null,
            connected: t.user!.id === connectedId,
            cleanups: 0,
            actions: 0,
          })),
      )
      setSelected(connectedId || "all")

      api.getMonitoringAggregate()
        .then((res) => { if (!cancelled) setMonitoring(res.data as MonitoringAggregate) })
        .catch(() => {})
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selected === null) return
    let cancelled = false
    setRefetching(true)
    api.getAnalytics(selected)
      .then((res) => { if (!cancelled) setData(res.data as AnalyticsData) })
      .catch(() => {})
      .finally(() => { if (!cancelled) { setLoading(false); setRefetching(false) } })
    return () => { cancelled = true }
  }, [selected])

  const accountMap = new Map<string, AccountOption>()
  for (const o of tokenAccounts) accountMap.set(o.id, { ...o })
  for (const a of data?.accounts || []) {
    const ex = accountMap.get(a.id)
    if (ex) { ex.cleanups = a.cleanups; ex.actions = a.actions; if (!ex.avatarUrl) ex.avatarUrl = a.avatar }
    else accountMap.set(a.id, { id: a.id, username: a.username, avatarUrl: a.avatar, connected: false, cleanups: a.cleanups, actions: a.actions })
  }
  const accountList = [...accountMap.values()].sort((x, y) => (y.cleanups + y.actions) - (x.cleanups + x.actions))

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Erro ao carregar analytics
      </div>
    )
  }

  const toolActions = data.toolActions || []
  const totalToolTime = toolActions.reduce((sum, a) => sum + a.duration, 0)
  const totalAllTime = data.totalTimeSpent + totalToolTime
  const totalActions = data.totalCleanups + toolActions.length

  const callActions = toolActions.filter(a => a.type === 'call-utils')
  const prefixCallActions = toolActions.filter(a => a.type === 'prefix-commands' && ['farm', 'coleira', 'elevador', 'proteger'].includes(String(a.details.action || '')))
  const allCallActions = [...callActions, ...prefixCallActions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const serverActions = toolActions.filter(a => ['clonar-servidor', 'remover-servidores', 'scraper-icons'].includes(a.type))
  const accountActions = toolActions.filter(a => ['fechar-dms', 'remover-amigos', 'backup'].includes(a.type))

  const prefixOtherActions = toolActions.filter(a => a.type === 'prefix-commands' && !['farm', 'coleira', 'elevador', 'proteger'].includes(String(a.details.action || '')))

  const toolCounts = new Map<string, { count: number; totalDuration: number }>()
  for (const a of toolActions) {
    const existing = toolCounts.get(a.type)
    if (existing) { existing.count++; existing.totalDuration += a.duration }
    else toolCounts.set(a.type, { count: 1, totalDuration: a.duration })
  }

  const farmActions = [...callActions.filter(a => String(a.details.action) === 'farm-hours'), ...prefixCallActions.filter(a => String(a.details.action) === 'farm')]
  const totalFarmTime = farmActions.reduce((sum, a) => sum + a.duration, 0)
  const elevatorCount = callActions.filter(a => String(a.details.action) === 'elevator').length + prefixCallActions.filter(a => String(a.details.action) === 'elevador').length
  const leashCount = callActions.filter(a => String(a.details.action) === 'leash').length + prefixCallActions.filter(a => String(a.details.action) === 'coleira').length
  const protectCount = callActions.filter(a => String(a.details.action) === 'protect').length + prefixCallActions.filter(a => String(a.details.action) === 'proteger').length

  const clonarCount = serverActions.filter(a => a.type === 'clonar-servidor').length
  const serversLeft = serverActions.filter(a => a.type === 'remover-servidores').reduce((s, a) => s + Number(a.details.serversLeft || 0), 0)
  const iconsScraped = serverActions.filter(a => a.type === 'scraper-icons').reduce((s, a) => s + Number(a.details.imagesSent || a.details.imagesCollected || 0), 0)

  const dmsClosed = accountActions.filter(a => a.type === 'fechar-dms').reduce((s, a) => s + Number(a.details.dmsClosed || 0), 0)
  const friendsRemoved = accountActions.filter(a => a.type === 'remover-amigos').reduce((s, a) => s + Number(a.details.friendsRemoved || 0), 0)
  const backupCount = accountActions.filter(a => a.type === 'backup').length
  const backupMsgs = accountActions.filter(a => a.type === 'backup').reduce((s, a) => s + Number(a.details.messagesBackedUp || 0), 0)

  const now = new Date()
  const days14 = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (13 - idx))
    const dateStr = d.toISOString().slice(0, 10)
    const dayCleanups = data.cleanups.filter(c => c.date.slice(0, 10) === dateStr)
    const dayActions = toolActions.filter(a => a.date.slice(0, 10) === dateStr)
    return {
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      fullLabel: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count: dayCleanups.reduce((sum, c) => sum + c.messagesDeleted, 0),
      cleanups: dayCleanups.length,
      actions: dayActions.length,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {selected === "all"
              ? "Visão geral de todas as contas"
              : `Atividade de ${accountList.find((a) => a.id === selected)?.username || "conta"}`}
          </p>
        </div>
        <AccountSelector
          accounts={accountList}
          selected={selected ?? "all"}
          onSelect={setSelected}
          busy={refetching}
        />
      </div>

      <Tabs defaultValue="geral" className={`w-full transition-opacity ${refetching ? "opacity-60" : ""}`}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="geral" className="gap-1.5">
            <BarChart3 size={14} />
            Geral
          </TabsTrigger>
          <TabsTrigger value="limpezas" className="gap-1.5">
            <MessageSquare size={14} />
            Limpezas
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <Phone size={14} />
            Calls
          </TabsTrigger>
          <TabsTrigger value="servidores" className="gap-1.5">
            <Globe size={14} />
            Servidores
          </TabsTrigger>
          <TabsTrigger value="conta" className="gap-1.5">
            <Shield size={14} />
            Conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-4">
          <GeralTab
            data={data}
            toolActions={toolActions}
            totalActions={totalActions}
            totalAllTime={totalAllTime}
            toolCounts={toolCounts}
            days14={days14}
          />
        </TabsContent>

        <TabsContent value="limpezas" className="space-y-6 mt-4">
          <LimpezasTab data={data} />
        </TabsContent>

        <TabsContent value="calls" className="space-y-6 mt-4">
          <CallsTab
            callActions={allCallActions}
            farmActions={farmActions}
            totalFarmTime={totalFarmTime}
            elevatorCount={elevatorCount}
            leashCount={leashCount}
            protectCount={protectCount}
            monitoring={monitoring}
          />
        </TabsContent>

        <TabsContent value="servidores" className="space-y-6 mt-4">
          <ServidoresTab
            serverActions={serverActions}
            clonarCount={clonarCount}
            serversLeft={serversLeft}
            iconsScraped={iconsScraped}
          />
        </TabsContent>

        <TabsContent value="conta" className="space-y-6 mt-4">
          <ContaTab
            accountActions={accountActions}
            prefixOtherActions={prefixOtherActions}
            dmsClosed={dmsClosed}
            friendsRemoved={friendsRemoved}
            backupCount={backupCount}
            backupMsgs={backupMsgs}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeralTab({ data, toolActions, totalActions, totalAllTime, toolCounts, days14 }: {
  data: AnalyticsData
  toolActions: ToolActionRecord[]
  totalActions: number
  totalAllTime: number
  toolCounts: Map<string, { count: number; totalDuration: number }>
  days14: Array<{ label: string; fullLabel: string; count: number; cleanups: number; actions: number }>
}) {
  const [chartType, setChartType] = useState<"bar" | "line">("line")

  const sortedTools = [...toolCounts.entries()].sort((a, b) => b[1].count - a[1].count)
  const maxDay = Math.max(...days14.map(d => d.count), 1)

  const uniqueToolTypes = new Set(toolActions.map(a => a.type))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Wrench size={10} />} label="Total Ações" value={totalActions} color="text-primary" />
        <StatCard icon={<Clock size={10} />} label="Tempo Total" value={formatDuration(totalAllTime)} color="text-orange-400" />
        <StatCard icon={<MessageSquare size={10} />} label="Msgs Deletadas" value={data.totalMessagesDeleted} color="text-red-400" />
        <StatCard icon={<Layers size={10} />} label="Ferramentas" value={uniqueToolTypes.size} sub={`de ${Object.keys(TOOL_META).length} disponíveis`} color="text-purple-400" />
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Atividade (últimos 14 dias)</h3>
          <ChartToggle chartType={chartType} setChartType={setChartType} />
        </div>

        {chartType === "bar" ? (
          <div className="flex items-end gap-[3%] h-40">
            {days14.map((day, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-1.5 relative min-w-0">
                <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md bg-popover border border-border px-2 py-1 shadow-lg whitespace-nowrap">
                  <div className="text-xs font-medium text-foreground">{day.count.toLocaleString("pt-BR")} msgs</div>
                  <div className="text-[10px] text-muted-foreground">{day.cleanups} limpeza{day.cleanups !== 1 ? "s" : ""}</div>
                  {day.actions > 0 && <div className="text-[10px] text-muted-foreground">{day.actions} ação{day.actions !== 1 ? "ões" : ""}</div>}
                </div>
                <div className="w-full rounded-t bg-primary/60 hover:bg-primary/80 transition-colors cursor-default" style={{ height: `${(day.count / maxDay) * 100}%`, minHeight: day.count > 0 ? 4 : 2 }} />
                <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">{day.fullLabel}</span>
              </div>
            ))}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-40 w-full [&_.recharts-wrapper]:!overflow-visible">
            <AreaChart data={days14} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillMsgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="fullLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(val) => `${val}`} formatter={(value, _name, item) => (<div className="flex flex-col gap-0.5"><span className="font-medium">{Number(value).toLocaleString("pt-BR")} msgs</span><span className="text-muted-foreground">{item.payload.cleanups} limpeza{item.payload.cleanups !== 1 ? "s" : ""}</span></div>)} />} />
              <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#fillMsgs)" dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} />
            </AreaChart>
          </ChartContainer>
        )}

        {days14.every(d => d.count === 0) && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Nenhuma atividade nos últimos 14 dias</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wrench size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Distribuição de Ferramentas</h3>
          <span className="text-xs text-muted-foreground ml-auto">{toolActions.length} ações no total</span>
        </div>
        {sortedTools.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Nenhuma ferramenta usada ainda</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedTools.map(([type, d]) => {
              const meta = TOOL_META[type] || { label: type, icon: <Wrench size={14} />, color: 'text-muted-foreground' }
              return (
                <div key={type} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${meta.color}`}>
                    {meta.icon}
                    <span className="truncate">{meta.label}</span>
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{d.count}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDuration(d.totalDuration)} total</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ActionList actions={toolActions} title="Ações Recentes" emptyText="Nenhuma ação registrada" />
    </>
  )
}

function LimpezasTab({ data }: { data: AnalyticsData }) {
  const [chartType, setChartType] = useState<"bar" | "line">("line")

  const userCleanups = data.cleanups.filter((c) => c.source !== "package")
  const packageCleanups = data.cleanups.filter((c) => c.source === "package")
  const packageMsgs = packageCleanups.reduce((sum, c) => sum + c.messagesDeleted, 0)

  const avgSpeed = data.totalTimeSpent > 0 ? (data.totalMessagesDeleted / data.totalTimeSpent).toFixed(1) : "0"
  const avgDuration = data.totalCleanups > 0 ? Math.round(data.totalTimeSpent / data.totalCleanups) : 0
  const userScanned = userCleanups.reduce((sum, c) => sum + c.messagesScanned, 0)
  const userDeleted = userCleanups.reduce((sum, c) => sum + c.messagesDeleted, 0)
  const hitRate = userScanned > 0 ? ((userDeleted / userScanned) * 100).toFixed(1) : "0"
  const recentCleanups = [...data.cleanups].reverse().slice(0, 20)

  const now = new Date()
  const cleanupDays = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (13 - idx))
    const dateStr = d.toISOString().slice(0, 10)
    const dayCleanups = data.cleanups.filter(c => c.date.slice(0, 10) === dateStr)
    return {
      fullLabel: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count: dayCleanups.reduce((sum, c) => sum + c.messagesDeleted, 0),
      cleanups: dayCleanups.length,
    }
  })
  const maxCleanupDay = Math.max(...cleanupDays.map(d => d.count), 1)

  const userMap = new Map<string, { username: string; avatarUrl: string | null; totalDeleted: number; count: number; lastDate: string }>()
  for (const c of userCleanups) {
    const existing = userMap.get(c.userId)
    if (existing) {
      existing.totalDeleted += c.messagesDeleted
      existing.count += 1
      if (c.date > existing.lastDate) { existing.lastDate = c.date; existing.avatarUrl = c.avatarUrl || existing.avatarUrl }
    } else {
      userMap.set(c.userId, { username: c.username, avatarUrl: c.avatarUrl, totalDeleted: c.messagesDeleted, count: 1, lastDate: c.date })
    }
  }
  const topUsers = [...userMap.values()].sort((a, b) => b.totalDeleted - a.totalDeleted).slice(0, 10)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard icon={<MessageSquare size={10} />} label="Deletadas" value={data.totalMessagesDeleted} color="text-primary" />
        <StatCard icon={<BarChart3 size={10} />} label="Limpezas" value={data.totalCleanups} sub={packageCleanups.length > 0 ? `${packageCleanups.length} de package` : undefined} color="text-purple-400" />
        <StatCard icon={<Zap size={10} />} label="Vel. Média" value={`${avgSpeed}/s`} color="text-yellow-400" />
        <StatCard icon={<Target size={10} />} label="Taxa Acerto" value={`${hitRate}%`} color="text-red-400" />
        <StatCard icon={<Users size={10} />} label="Usuários" value={data.totalUsersCleanedUnique} color="text-emerald-400" />
        <StatCard icon={<Timer size={10} />} label="Dur. Média" value={formatDuration(avgDuration)} color="text-cyan-400" />
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Limpezas (últimos 14 dias)</h3>
          <ChartToggle chartType={chartType} setChartType={setChartType} />
        </div>

        {chartType === "bar" ? (
          <div className="flex items-end gap-[3%] h-40">
            {cleanupDays.map((day, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-1.5 relative min-w-0">
                <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md bg-popover border border-border px-2 py-1 shadow-lg whitespace-nowrap">
                  <div className="text-xs font-medium text-foreground">{day.count.toLocaleString("pt-BR")} msgs</div>
                  <div className="text-[10px] text-muted-foreground">{day.cleanups} limpeza{day.cleanups !== 1 ? "s" : ""}</div>
                </div>
                <div className="w-full rounded-t bg-primary/60 hover:bg-primary/80 transition-colors cursor-default" style={{ height: `${(day.count / maxCleanupDay) * 100}%`, minHeight: day.count > 0 ? 4 : 2 }} />
                <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">{day.fullLabel}</span>
              </div>
            ))}
          </div>
        ) : (
          <ChartContainer config={cleanupChartConfig} className="h-40 w-full [&_.recharts-wrapper]:!overflow-visible">
            <AreaChart data={cleanupDays} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillCleanup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="fullLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(val) => `${val}`} formatter={(value, _name, item) => (<div className="flex flex-col gap-0.5"><span className="font-medium">{Number(value).toLocaleString("pt-BR")} msgs</span><span className="text-muted-foreground">{item.payload.cleanups} limpeza{item.payload.cleanups !== 1 ? "s" : ""}</span></div>)} />} />
              <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} fill="url(#fillCleanup)" dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }} />
            </AreaChart>
          </ChartContainer>
        )}

        {cleanupDays.every(d => d.count === 0) && (
          <p className="mt-3 text-center text-xs text-muted-foreground">Nenhuma limpeza nos últimos 14 dias</p>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Usuários mais limpos</h3>
          {topUsers.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma limpeza ainda</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {topUsers.map((user, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground">{i + 1}</div>
                  <Avatar className="h-8 w-8 shrink-0 border border-border">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{user.username}</div>
                    <div className="text-xs text-muted-foreground">{user.count} limpeza{user.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums text-primary">{user.totalDeleted.toLocaleString("pt-BR")}</div>
                    <div className="text-[10px] text-muted-foreground">msgs</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Histórico de Limpezas</h3>
            <span className="text-xs text-muted-foreground">{recentCleanups.length} de {data.cleanups.length}</span>
          </div>
          {recentCleanups.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma limpeza registrada</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {recentCleanups.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5 transition-colors hover:bg-secondary/50">
                  {c.source === "package" ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-purple-500/10 text-purple-400">
                      <Package size={14} />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8 border border-border shrink-0">
                      <AvatarImage src={c.avatarUrl || undefined} alt={c.username} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">{c.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.username}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{c.messagesDeleted} msgs</span>
                      <span className="text-border">•</span>
                      <span>{formatDuration(c.duration)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(c.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CallsTab({ callActions, farmActions, totalFarmTime, elevatorCount, leashCount, protectCount, monitoring }: {
  callActions: ToolActionRecord[]
  farmActions: ToolActionRecord[]
  totalFarmTime: number
  elevatorCount: number
  leashCount: number
  protectCount: number
  monitoring: MonitoringAggregate | null
}) {
  const [chartType, setChartType] = useState<"bar" | "line">("line")

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Timer size={10} />} label="Farm Total" value={formatDuration(totalFarmTime)} sub={`${farmActions.length} sessões`} color="text-cyan-400" />
        <StatCard icon={<ArrowUpDown size={10} />} label="Elevador" value={elevatorCount} sub="execuções" color="text-purple-400" />
        <StatCard icon={<Shield size={10} />} label="Coleira" value={leashCount} sub="execuções" color="text-orange-400" />
        <StatCard icon={<Eye size={10} />} label="Proteger" value={protectCount} sub="execuções" color="text-emerald-400" />
      </div>

      {monitoring && monitoring.totalCallSessions > 0 && (
        <>
          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Mic size={14} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-foreground">Monitoramento de Calls</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Phone size={10} />} label="Sessões" value={monitoring.totalCallSessions} color="text-cyan-400" />
              <StatCard icon={<Clock size={10} />} label="Tempo Total" value={formatDurationMs(monitoring.totalCallTime)} color="text-orange-400" />
              <StatCard icon={<Users size={10} />} label="Participantes" value={monitoring.uniqueParticipants} color="text-emerald-400" />
              <StatCard icon={<Globe size={10} />} label="Servidores" value={monitoring.totalServers} color="text-purple-400" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Calls Diárias (últimos 14 dias)</h3>
              <ChartToggle chartType={chartType} setChartType={setChartType} />
            </div>

            {chartType === "bar" ? (
            <ChartContainer config={callChartConfig} className="h-40 w-full [&_.recharts-wrapper]:!overflow-visible">
              <BarChart data={monitoring.dailyCalls} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(val) => {
                  const d = new Date(String(val) + 'T00:00:00')
                  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                }} formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{Number(value)} sessões</span>
                    <span className="text-muted-foreground">{formatDurationMs(item.payload.totalTime)}</span>
                  </div>
                )} />} />
                <Bar dataKey="count" fill="var(--chart-2, #8b5cf6)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            ) : (
            <ChartContainer config={callChartConfig} className="h-40 w-full [&_.recharts-wrapper]:!overflow-visible">
              <AreaChart data={monitoring.dailyCalls} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2, #8b5cf6)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-2, #8b5cf6)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00')
                    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(val) => {
                  const d = new Date(String(val) + 'T00:00:00')
                  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                }} formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{Number(value)} sessões</span>
                    <span className="text-muted-foreground">{formatDurationMs(item.payload.totalTime)}</span>
                  </div>
                )} />} />
                <Area type="monotone" dataKey="count" stroke="var(--chart-2, #8b5cf6)" strokeWidth={2} fill="url(#fillCalls)" dot={{ r: 3, fill: "var(--chart-2, #8b5cf6)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--chart-2, #8b5cf6)", stroke: "var(--background)", strokeWidth: 2 }} />
              </AreaChart>
            </ChartContainer>
            )}
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {monitoring.topParticipants.length > 0 && (
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Top Participantes</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {monitoring.topParticipants.map((p, i) => (
                    <div key={p.userId} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground">{i + 1}</div>
                      <Avatar className="h-8 w-8 shrink-0 border border-border">
                        <AvatarImage src={p.avatarUrl || undefined} alt={p.username} />
                        <AvatarFallback className="bg-purple-500/10 text-xs text-purple-400">{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{p.username}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold tabular-nums text-purple-400">{formatDurationMs(p.callTime)}</div>
                        <div className="text-[10px] text-muted-foreground">em call</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {monitoring.topChannels.length > 0 && (
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Top Canais</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {monitoring.topChannels.map((ch, i) => (
                    <div key={ch.channelId} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground">{i + 1}</div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
                        <Hash size={14} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{ch.channelName}</div>
                        <div className="text-xs text-muted-foreground truncate">{ch.guildName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {ch.callTime > 0 && <div className="text-xs tabular-nums text-purple-400">{formatDurationMs(ch.callTime)}</div>}
                        {ch.messageCount > 0 && <div className="text-[10px] text-muted-foreground">{ch.messageCount} msgs</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <ActionList actions={callActions} title="Histórico de Calls" emptyText="Nenhuma ação de call registrada" />
    </>
  )
}

function ServidoresTab({ serverActions, clonarCount, serversLeft, iconsScraped }: {
  serverActions: ToolActionRecord[]
  clonarCount: number
  serversLeft: number
  iconsScraped: number
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Copy size={10} />} label="Servidores Clonados" value={clonarCount} color="text-purple-400" />
        <StatCard icon={<ServerOff size={10} />} label="Servidores Saídos" value={serversLeft} color="text-yellow-400" />
        <StatCard icon={<Image size={10} />} label="Icons Coletados" value={iconsScraped} color="text-emerald-400" />
      </div>

      <ActionList actions={serverActions} title="Histórico de Servidores" emptyText="Nenhuma ação de servidor registrada" />
    </>
  )
}

function ContaTab({ accountActions, prefixOtherActions, dmsClosed, friendsRemoved, backupCount, backupMsgs }: {
  accountActions: ToolActionRecord[]
  prefixOtherActions: ToolActionRecord[]
  dmsClosed: number
  friendsRemoved: number
  backupCount: number
  backupMsgs: number
}) {
  const allActions = [...accountActions, ...prefixOtherActions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<X size={10} />} label="DMs Fechadas" value={dmsClosed} color="text-orange-400" />
        <StatCard icon={<UserMinus size={10} />} label="Amigos Removidos" value={friendsRemoved} color="text-red-400" />
        <StatCard icon={<Database size={10} />} label="Backups" value={backupCount} sub={backupMsgs > 0 ? `${backupMsgs.toLocaleString("pt-BR")} msgs salvas` : undefined} color="text-blue-400" />
        <StatCard icon={<Terminal size={10} />} label="Prefix Cmds" value={prefixOtherActions.length} sub="cl, stalkear, apelido..." color="text-pink-400" />
      </div>

      <ActionList actions={allActions} title="Histórico da Conta" emptyText="Nenhuma ação de conta registrada" />
    </>
  )
}
