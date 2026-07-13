
import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Activity,
  Key,
  Zap,
  Wifi,
  WifiOff,
  Trash2,
  Copy,
  UserMinus,
  LogOut,
  PhoneOff,
  MoveRight,
  Timer,
  MicOff,
  VolumeX,
  Anchor,
  Shield,
  Image,
  Package,
  Gamepad2,
  Terminal,
  Settings,
  Archive,
  MessageSquare,
  BarChart3,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWebSocket } from "@/hooks/use-websocket"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useTasks } from "@/hooks/use-tasks"
import { useTokens } from "@/hooks/use-tokens"
import { api } from "@/lib/api-client"
import type { ServerStatus } from "@/types/api"

interface ToolActionRecord {
  id: string
  type: string
  date: string
  duration: number
  details: Record<string, number | string>
}

interface CleanupRecord {
  id: string
  username: string
  userId: string
  avatarUrl: string | null
  messagesDeleted: number
  messagesScanned: number
  duration: number
  date: string
}

interface AnalyticsData {
  totalMessagesDeleted: number
  totalUsersCleanedUnique: number
  totalCleanups: number
  totalTimeSpent: number
  cleanups: CleanupRecord[]
  toolActions: ToolActionRecord[]
}

const NITRO_LEVELS = [
  { days: 30,   name: "Bronze",    img: "https://ik.imagekit.io/xys3wb0qo/badges/bronze.png" },
  { days: 90,   name: "Prata",     img: "https://ik.imagekit.io/xys3wb0qo/badges/silver.png" },
  { days: 180,  name: "Ouro",      img: "https://ik.imagekit.io/xys3wb0qo/badges/gold.png" },
  { days: 365,  name: "Platina",   img: "https://ik.imagekit.io/xys3wb0qo/badges/platinum.png" },
  { days: 730,  name: "Diamante",  img: "https://ik.imagekit.io/xys3wb0qo/badges/diamond.png" },
  { days: 1095, name: "Esmeralda", img: "https://ik.imagekit.io/xys3wb0qo/badges/emerald.png" },
  { days: 1825, name: "Rubi",      img: "https://ik.imagekit.io/xys3wb0qo/badges/ruby.png" },
  { days: 2190, name: "Opala",     img: "https://ik.imagekit.io/xys3wb0qo/badges/opal.png" },
]

function getNitroProgress(premiumSince: string) {
  const totalDays = Math.floor((Date.now() - new Date(premiumSince).getTime()) / 86400000)
  let currentIdx = -1
  let nextIdx = 0
  for (let i = 0; i < NITRO_LEVELS.length; i++) {
    if (totalDays >= NITRO_LEVELS[i].days) {
      currentIdx = i
      if (i + 1 < NITRO_LEVELS.length) nextIdx = i + 1
      else nextIdx = -1
    } else {
      nextIdx = i
      break
    }
  }
  const current = currentIdx >= 0 ? NITRO_LEVELS[currentIdx] : null
  const next = nextIdx >= 0 ? NITRO_LEVELS[nextIdx] : null
  const prevDays = current ? current.days : 0
  const nextDays = next ? next.days : prevDays
  const rangeProgress = next ? ((totalDays - prevDays) / (nextDays - prevDays)) * 100 : 100
  const daysToNext = next ? Math.max(0, nextDays - totalDays) : 0
  return { totalDays, current, next, currentIdx, progress: Math.min(100, Math.max(0, rangeProgress)), daysToNext }
}

const BOOST_LEVELS: Record<number, string> = {
  1:  "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost1.svg",
  2:  "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost2.svg",
  3:  "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost3.svg",
  6:  "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost4.svg",
  9:  "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost5.svg",
  12: "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost6.svg",
  15: "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost7.svg",
  18: "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost8.svg",
  24: "https://ik.imagekit.io/xys3wb0qo/boosts/discordboost9.svg",
}
const BOOST_THRESHOLDS = [1, 2, 3, 6, 9, 12, 15, 18, 24]

function getBoostProgress(boostSince: string) {
  const now = Date.now()
  const start = new Date(boostSince).getTime()
  const monthsElapsed = (now - start) / (30.44 * 24 * 60 * 60 * 1000)
  let prevMonth = 1
  let nextMonth = 2
  for (const m of BOOST_THRESHOLDS) {
    if (monthsElapsed >= m) prevMonth = m
    else { nextMonth = m; break }
  }
  if (monthsElapsed >= 24) { prevMonth = 24; nextMonth = -1 }
  const currentImg = BOOST_LEVELS[prevMonth]
  const nextImg = nextMonth > 0 ? BOOST_LEVELS[nextMonth] : null
  const rangeDays = nextMonth > 0 ? (nextMonth - prevMonth) * 30.44 : 1
  const elapsed = monthsElapsed - prevMonth > 0 ? (monthsElapsed - prevMonth) * 30.44 : 0
  const progress = nextMonth > 0 ? Math.min(100, (elapsed / rangeDays) * 100) : 100
  const daysToNext = nextMonth > 0 ? Math.max(0, Math.ceil((nextMonth * 30.44 * 86400000 - (now - start)) / 86400000)) : 0
  return { prevMonth, nextMonth, currentImg, nextImg, progress, daysToNext, monthsElapsed: Math.floor(monthsElapsed) }
}

const ferramentasRapidas = [
  {
    titulo: "Mensagens",
    descricao: "Limpar DMs, package e mais",
    icone: <MessageSquare size={20} />,
    cor: "from-red-500/20 to-red-500/5",
    corIcone: "text-red-400 bg-red-500/15",
    itens: [
      { nome: "Limpar DM", href: "/limpar-dm", icone: <Trash2 size={14} /> },
      { nome: "DMs Abertas", href: "/limpar-dms", icone: <Trash2 size={14} /> },
      { nome: "Package", href: "/limpar-package", icone: <Package size={14} /> },
      { nome: "Abrir DMs", href: "/abrir-dms", icone: <MessageSquare size={14} /> },
      { nome: "Fechar DMs", href: "/fechar-dms", icone: <PhoneOff size={14} /> },
    ],
  },
  {
    titulo: "Conta",
    descricao: "Gerenciar amigos e servidores",
    icone: <User size={20} />,
    cor: "from-orange-500/20 to-orange-500/5",
    corIcone: "text-orange-400 bg-orange-500/15",
    itens: [
      { nome: "Remover Amigos", href: "/remover-amigos", icone: <UserMinus size={14} /> },
      { nome: "Sair Servidores", href: "/sair-servidores", icone: <LogOut size={14} /> },
    ],
  },
  {
    titulo: "Servidores",
    descricao: "Clonar e scraper",
    icone: <Copy size={20} />,
    cor: "from-blue-500/20 to-blue-500/5",
    corIcone: "text-blue-400 bg-blue-500/15",
    itens: [
      { nome: "Clonar Servidor", href: "/clonar-servidor", icone: <Copy size={14} /> },
      { nome: "Scraper Ícones", href: "/scraper-icones", icone: <Image size={14} /> },
    ],
  },
  {
    titulo: "Call",
    descricao: "Ferramentas de voz",
    icone: <PhoneOff size={20} />,
    cor: "from-green-500/20 to-green-500/5",
    corIcone: "text-green-400 bg-green-500/15",
    itens: [
      { nome: "Desconectar", href: "/desconectar-call", icone: <PhoneOff size={14} /> },
      { nome: "Mover", href: "/mover-call", icone: <MoveRight size={14} /> },
      { nome: "Farm", href: "/farm-call", icone: <Timer size={14} /> },
      { nome: "Mutar", href: "/mutar-call", icone: <MicOff size={14} /> },
      { nome: "Ensurdecer", href: "/ensurdecer-call", icone: <VolumeX size={14} /> },
      { nome: "Elevador", href: "/elevador", icone: <MoveRight size={14} /> },
      { nome: "Coleira", href: "/coleira", icone: <Anchor size={14} /> },
      { nome: "Proteger", href: "/proteger-user", icone: <Shield size={14} /> },
    ],
  },
  {
    titulo: "Sistema",
    descricao: "RPC, backups e configurações",
    icone: <Settings size={20} />,
    cor: "from-purple-500/20 to-purple-500/5",
    corIcone: "text-purple-400 bg-purple-500/15",
    itens: [
      { nome: "Rich Presence", href: "/rpc", icone: <Gamepad2 size={14} /> },
      { nome: "Prefix Cmds", href: "/prefix-commands", icone: <Terminal size={14} /> },
      { nome: "Backups", href: "/backups", icone: <Archive size={14} /> },
      { nome: "Config", href: "/configuracoes", icone: <Settings size={14} /> },
    ],
  },
]

const TOOL_LABELS: Record<string, string> = {
  'limpar-dm': 'Limpar DM',
  'limpar-dms-abertas': 'Limpar DMs',
  'limpar-package': 'Package',
  'abrir-dms': 'Abrir DMs',
  'backup': 'Backup',
  'clonar-servidor': 'Clonar',
  'fechar-dms': 'Fechar DMs',
  'remover-amigos': 'Rem. Amigos',
  'remover-servidores': 'Sair Servers',
  'scraper-icons': 'Scraper',
  'call-utils': 'Call Utils',
  'prefix-commands': 'Prefix Cmds',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

export default function PaginaInicial() {
  const { connected } = useWebSocket()
  const { tasks, runningTasks } = useTasks()
  const { activeToken, tokens } = useTokens()
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [apiOnline, setApiOnline] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const fetchStatus = () => {
      api.getStatus().then((res) => {
        setStatus(res.data as ServerStatus)
        setApiOnline(true)
      }).catch(() => {
        setApiOnline(false)
      })
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    api.getAnalytics()
      .then((res) => setAnalytics(res.data as AnalyticsData))
      .catch(() => {})
  }, [])

  const isOnline = apiOnline || connected

  const statsData = useMemo(() => {
    if (!analytics) return null
    const toolActions = analytics.toolActions || []
    const totalActions = analytics.totalCleanups + toolActions.length
    const totalToolTime = toolActions.reduce((sum, a) => sum + a.duration, 0)
    const totalAllTime = analytics.totalTimeSpent + totalToolTime

    const recentActivity: Array<{
      id: string
      tipo: 'cleanup' | 'tool'
      label: string
      date: string
      detail: string
    }> = []

    for (const c of analytics.cleanups) {
      recentActivity.push({
        id: c.id,
        tipo: 'cleanup',
        label: `Limpeza — ${c.username}`,
        date: c.date,
        detail: `${c.messagesDeleted} msgs em ${formatDuration(c.duration)}`,
      })
    }
    for (const a of toolActions) {
      const actionDetail = a.details.action ? String(a.details.action) : ''
      recentActivity.push({
        id: a.id,
        tipo: 'tool',
        label: `${TOOL_LABELS[a.type] || a.type}${actionDetail ? ` — ${actionDetail}` : ''}`,
        date: a.date,
        detail: a.duration > 0 ? formatDuration(a.duration) : 'instantâneo',
      })
    }
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return { totalActions, totalAllTime, recentActivity: recentActivity.slice(0, 12) }
  }, [analytics])

  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const errorTasks = tasks.filter((t) => t.status === 'error').length

  const user = activeToken?.user

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card/80 to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={activeToken?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {user.global_name?.[0] || user.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-zinc-500'}`} />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <User size={24} className="text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {user?.global_name || user?.username || "Sem conta conectada"}
                </h1>
                {activeToken?.badges && activeToken.badges.length > 0 && (
                  <div className="flex items-center gap-1">
                    {activeToken.badges.map((badge) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={badge.name}
                        src={badge.url}
                        alt={badge.name}
                        title={badge.tooltip}
                        className="h-5 w-5"
                      />
                    ))}
                  </div>
                )}
              </div>
              {user ? (
                <p className="text-sm text-muted-foreground">
                  @{user.username} · {tokens.length} conta{tokens.length !== 1 ? 's' : ''} carregada{tokens.length !== 1 ? 's' : ''}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Adicione uma conta para começar</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              isOnline
                ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
                : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Conectado' : 'Desconectado'}
            </div>
            {status && (
              <div className="hidden items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-2 text-xs text-muted-foreground sm:flex">
                <Clock size={12} />
                {formatUptime(status.uptime)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Msgs Deletadas",
            valor: analytics?.totalMessagesDeleted ?? 0,
            icone: <MessageSquare size={16} />,
            accent: "text-red-400",
            bg: "bg-red-500/10",
          },
          {
            label: "Total Ações",
            valor: statsData?.totalActions ?? 0,
            icone: <Zap size={16} />,
            accent: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Tempo Total",
            valor: formatDuration(statsData?.totalAllTime ?? 0),
            icone: <Clock size={16} />,
            accent: "text-amber-400",
            bg: "bg-amber-500/10",
            isStr: true,
          },
          {
            label: "Tasks Rodando",
            valor: runningTasks.length,
            icone: <Activity size={16} />,
            accent: runningTasks.length > 0 ? "text-green-400" : "text-muted-foreground",
            bg: runningTasks.length > 0 ? "bg-green-500/10" : "bg-secondary/50",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${m.bg} ${m.accent}`}>
                {m.icone}
              </div>
            </div>
            <div className={`mt-2 text-2xl font-bold tabular-nums ${m.accent}`}>
              {typeof m.valor === 'number' ? m.valor.toLocaleString('pt-BR') : m.valor}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Acesso Rápido</h2>
              <Sparkles size={14} className="text-primary/40" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {ferramentasRapidas.map((cat) => (
                <div
                  key={cat.titulo}
                  className={`group rounded-lg border border-border bg-gradient-to-br ${cat.cor} p-3 transition-all hover:border-primary/20`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${cat.corIcone}`}>
                      {cat.icone}
                    </div>
                    <h3 className="text-[11px] font-semibold text-foreground">{cat.titulo}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.itens.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="flex items-center gap-1 rounded-md bg-background/60 px-1.5 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:bg-background hover:text-foreground"
                      >
                        {item.icone}
                        {item.nome}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {runningTasks.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-foreground">Tasks em Execução</h2>
                <span className="ml-auto text-xs text-muted-foreground">{runningTasks.length} ativa{runningTasks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {runningTasks.map((task) => {
                  const pct = task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0
                  return (
                    <div key={task.id} className="rounded-lg border border-border bg-card/60 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {TOOL_LABELS[task.tool] || task.tool}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {task.progress}/{task.total} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {task.phase && (
                        <span className="mt-1 inline-block text-[10px] text-muted-foreground capitalize">{task.phase}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Atividade Recente</h2>
              <Link to="/analytics" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                Ver analytics <ArrowRight size={12} />
              </Link>
            </div>
            {!statsData || statsData.recentActivity.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-1 text-muted-foreground">
                <BarChart3 size={20} className="opacity-40" />
                <span className="text-xs">Nenhuma atividade registrada ainda</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {statsData.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/40"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      item.tipo === 'cleanup' ? 'bg-red-400' : 'bg-primary'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground truncate block">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground">{item.detail}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <div className="text-lg font-bold tabular-nums text-foreground">{tasks.length}</div>
              <div className="text-[10px] text-muted-foreground">Total Tasks</div>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <div className="text-lg font-bold tabular-nums text-green-400">{completedTasks}</div>
              <div className="text-[10px] text-muted-foreground">Concluídas</div>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <div className={`text-lg font-bold tabular-nums ${errorTasks > 0 ? 'text-red-400' : 'text-foreground'}`}>{errorTasks}</div>
              <div className="text-[10px] text-muted-foreground">Erros</div>
            </div>
          </div>

          {(() => {
            const premiumSince = activeToken?.profileData?.premiumSince
            const boostSince = activeToken?.profileData?.premiumGuildSince
            const hasNitro = !!premiumSince
            const hasBoost = !!boostSince

            if (!hasNitro && !hasBoost) {
              return (
                <div className="rounded-2xl border border-border bg-card/40 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-[#f47fff]" />
                    <h2 className="text-sm font-semibold text-foreground">Nitro & Boost</h2>
                  </div>
                  <div className="flex h-20 flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Sparkles size={20} className="opacity-30" />
                    <span className="text-[11px]">Sem Nitro ou Boost ativo</span>
                  </div>
                </div>
              )
            }

            return (
              <div className="space-y-3">
                {hasNitro && (() => {
                  const nitro = getNitroProgress(premiumSince)
                  return (
                    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Sparkles size={14} className="text-[#f47fff]" />
                          <h3 className="text-xs font-bold text-foreground">Progresso Nitro</h3>
                          <span className="ml-auto text-[10px] text-muted-foreground">{nitro.totalDays} dias</span>
                        </div>
                      </div>
                      <div className="px-4 flex items-center gap-2.5 pb-2">
                        <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                          {nitro.current ? (
                            <img src={nitro.current.img} alt={nitro.current.name} className="h-10 w-10 object-contain" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-secondary/40 flex items-center justify-center">
                              <Sparkles size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-[9px] font-semibold text-foreground">{nitro.current?.name || "—"}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${nitro.progress}%`, background: "linear-gradient(90deg, #f47fff, #c084fc, #818cf8)" }}
                            />
                          </div>
                          <div className="mt-0.5 text-[9px] text-muted-foreground text-center">
                            {nitro.next ? `${nitro.daysToNext} dias restantes` : "Nível máximo!"}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                          {nitro.next ? (
                            <img src={nitro.next.img} alt={nitro.next.name} className="h-10 w-10 object-contain opacity-40" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Sparkles size={14} className="text-emerald-400" />
                            </div>
                          )}
                          <span className="text-[9px] font-semibold text-foreground">{nitro.next?.name || "Max"}</span>
                        </div>
                      </div>
                      <div className="px-4 pb-3 pt-1">
                        <div className="flex items-center gap-1.5">
                          {NITRO_LEVELS.map((lvl, i) => {
                            const unlocked = nitro.totalDays >= lvl.days
                            return (
                              <Tooltip key={lvl.name}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center">
                                    <img
                                      src={lvl.img}
                                      alt={lvl.name}
                                      className="h-5 w-5 object-contain"
                                      style={{ opacity: unlocked ? 1 : 0.2, filter: unlocked ? "none" : "grayscale(1)" }}
                                    />
                                    {i === nitro.currentIdx && <div className="h-0.5 w-3 rounded-full bg-[#f47fff] mt-0.5" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {lvl.name} — {lvl.days} dias{unlocked ? " ✓" : ""}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {hasBoost && (() => {
                  const boost = getBoostProgress(boostSince)
                  return (
                    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Zap size={14} className="text-[#ff73fa]" />
                          <h3 className="text-xs font-bold text-foreground">Progresso Boost</h3>
                          <span className="ml-auto text-[10px] text-muted-foreground">{boost.monthsElapsed} {boost.monthsElapsed === 1 ? "mês" : "meses"}</span>
                        </div>
                      </div>
                      <div className="px-4 flex items-center gap-2.5 pb-2">
                        <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                          <img src={boost.currentImg} alt={`${boost.prevMonth}m`} className="h-10 w-10 object-contain" />
                          <span className="text-[9px] font-semibold text-foreground">{boost.prevMonth}m</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${boost.progress}%`, background: "linear-gradient(90deg, #ff73fa, #a855f7, #6366f1)" }}
                            />
                          </div>
                          <div className="mt-0.5 text-[9px] text-muted-foreground text-center">
                            {boost.nextMonth > 0 ? `${boost.daysToNext} dias restantes` : "Nível máximo!"}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                          {boost.nextImg ? (
                            <img src={boost.nextImg} alt={`${boost.nextMonth}m`} className="h-10 w-10 object-contain opacity-40" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Zap size={14} className="text-emerald-400" />
                            </div>
                          )}
                          <span className="text-[9px] font-semibold text-foreground">{boost.nextMonth > 0 ? `${boost.nextMonth}m` : "Max"}</span>
                        </div>
                      </div>
                      <div className="px-4 pb-3 pt-1">
                        <div className="flex items-center gap-1.5">
                          {BOOST_THRESHOLDS.map((m) => {
                            const unlocked = boost.monthsElapsed >= m
                            const isCurrent = boost.prevMonth === m
                            return (
                              <Tooltip key={m}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center">
                                    <img
                                      src={BOOST_LEVELS[m]}
                                      alt={`${m}m`}
                                      className="h-5 w-5 object-contain"
                                      style={{ opacity: unlocked ? 1 : 0.2, filter: unlocked ? "none" : "grayscale(1)" }}
                                    />
                                    {isCurrent && <div className="h-0.5 w-3 rounded-full bg-[#ff73fa] mt-0.5" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {m} {m === 1 ? "mês" : "meses"}{unlocked ? " ✓" : ""}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Links Rápidos</h2>
            <div className="space-y-1">
              {[
                { nome: "Perfil", href: "/perfil", icone: <User size={14} />, desc: "Ver dados da conta" },
                { nome: "Analytics", href: "/analytics", icone: <BarChart3 size={14} />, desc: "Estatísticas detalhadas" },
                { nome: "Rich Presence", href: "/rpc", icone: <Gamepad2 size={14} />, desc: "Personalizar presença" },
                { nome: "Configurações", href: "/configuracoes", icone: <Settings size={14} />, desc: "Preferências do app" },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-secondary/40 group"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    {link.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground block">{link.nome}</span>
                    <span className="text-[10px] text-muted-foreground">{link.desc}</span>
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/30 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">
              BrunnoClear <span className="font-semibold text-foreground">v{status.version}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Key size={11} /> {tokens.length} token{tokens.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Activity size={11} /> {status.wsConnections} WS</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {formatUptime(status.uptime)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
