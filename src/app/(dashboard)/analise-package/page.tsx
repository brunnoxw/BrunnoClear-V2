import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react"
import gsap from "gsap"
import {
  PieChart as PieIcon, Upload, FileArchive, X, Loader2, Search, MessageSquare, Hash, Users,
  Server, Sparkles, Clock, Calendar, Type, Link2, AtSign, Paperclip, Smile, Flame,
  Zap, Gamepad2, Globe, MapPin, Monitor, Trophy, Heart, UserPlus, ShieldBan, Mail,
  Phone, Crown, Cake, Gem, Terminal, Mic, Eye, EyeOff, Bell, RotateCcw, Download, AlertTriangle,
  BadgeCheck, TrendingUp, Activity as ActivityIcon, Bot, ChevronDown, KeyRound, Info,
  Send, Power, LogIn, Key, PhoneCall, PhoneOff, Video, ServerOff, Plus, Trash2, Square,
  Keyboard, GraduationCap, CheckCheck, CreditCard, Smartphone, ChevronLeft, ChevronRight,
  LifeBuoy, Fingerprint, MousePointerClick,
} from "lucide-react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart, Line, LineChart, Sector,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useWSEvent } from "@/hooks/use-websocket"
import { api } from "@/lib/api-client"
import type { PackageStats, KV, TopEntry, ActivityStat, CustomEmojiStat, WordPlace, EventCount, SavedAnalysisMeta } from "@/types/package-analytics"

type Phase = "idle" | "analyzing" | "done" | "error"
interface PkgProgress { taskId: string; tool: string; progress: number; total: number; message: string; phase?: string; messagesParsed?: number; eventsParsed?: number }

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const MONTHS_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
/** "2020-12" → "dez. 2020" (full) ou "dez/20" (curto, p/ eixos). */
function fmtMonth(ym: string, full = false): string {
  const [y, mo] = (ym || "").split("-")
  const idx = parseInt(mo, 10) - 1
  if (!y || isNaN(idx) || idx < 0 || idx > 11) return ym
  return full ? `${MONTHS_ABBR[idx]}. ${y}` : `${MONTHS_ABBR[idx]}/${y.slice(2)}`
}
const LS_TOKEN = "pkg_bot_token"
const LS_LAST_TASK = "pkg_last_task"

const PALETTE = [
  "var(--primary)", "var(--chart-2, #22c55e)", "#3b82f6", "#a855f7", "#ec4899",
  "#f59e0b", "#06b6d4", "#ef4444", "#84cc16", "#14b8a6",
]
const chartConfig = { value: { label: "Total", color: "var(--primary)" } } satisfies ChartConfig

const STAT_ICONS: Record<string, React.ReactNode> = {
  send: <Send size={14} />, power: <Power size={14} />, activity: <ActivityIcon size={14} />,
  login: <LogIn size={14} />, key: <Key size={14} />, phone: <Phone size={14} />,
  "phone-call": <PhoneCall size={14} />, "phone-off": <PhoneOff size={14} />, mic: <Mic size={14} />,
  heart: <Heart size={14} />, search: <Search size={14} />, video: <Video size={14} />,
  bell: <Bell size={14} />, link: <Link2 size={14} />, "user-plus": <UserPlus size={14} />,
  server: <Server size={14} />, "server-off": <ServerOff size={14} />, eye: <Eye size={14} />,
  hash: <Hash size={14} />, plus: <Plus size={14} />, trash: <Trash2 size={14} />,
  user: <Users size={14} />, square: <Square size={14} />, keyboard: <Keyboard size={14} />,
  graduation: <GraduationCap size={14} />, gamepad: <Gamepad2 size={14} />, terminal: <Terminal size={14} />,
  check: <CheckCheck size={14} />, users: <Users size={14} />,
}


const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("pt-BR")
/** número compacto p/ espaços pequenos: 381784 → "382 mil", 1200000 → "1,2 mi". */
const fmtShort = (n: number): number | string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`
  if (n >= 10_000) return `${Math.round(n / 1000)} mil`
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`
  return fmt(n)
}
function fmtDate(iso: string | null): string { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) } catch { return "—" } }
function fmtMoney(value: number, currency: string): string {
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency })
  } catch {
    const code = (currency || "").replace(/_/g, " ").toUpperCase()
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`.trim()
  }
}
function fmtBirthday(v: string | null): string | null {
  if (!v) return null
  let y: number, mo: number, d: number
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim())
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3] }
  else { const dt = new Date(v); if (isNaN(dt.getTime())) return null; y = dt.getFullYear(); mo = dt.getMonth() + 1; d = dt.getDate() }
  if (y < 1920 || y > new Date().getFullYear()) return null
  return new Date(y, mo - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}
function humanDuration(days: number | null): string { if (!days) return "—"; const y = Math.floor(days / 365); const mo = Math.floor((days % 365) / 30); if (y > 0) return `${y} ano${y > 1 ? "s" : ""}${mo > 0 ? ` e ${mo} m` : ""}`; return `${days} dias` }
function humanMinutes(min: number): string { if (min < 60) return `${min}min`; const h = Math.floor(min / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d ${h % 24}h` }
function deviceIcon(os: string): React.ReactNode { return /android|ios|iphone|mobile/.test(os.toLowerCase()) ? <Smartphone size={13} /> : <Monitor size={13} /> }
function emojiUrl(e: CustomEmojiStat): string { return `https://cdn.discordapp.com/emojis/${e.id}.webp?size=48&animated=true` }
const MEDAL = ["text-amber-400 border-amber-400/50 bg-amber-400/10", "text-slate-300 border-slate-300/50 bg-slate-300/10", "text-orange-500 border-orange-500/50 bg-orange-500/10"]
function notify(title: string, body: string) { try { window.electronAPI?.notification.show({ title, body }) } catch {} }

const LOCALE_INFO: Record<string, { name: string; cc: string }> = {
  "en-us": { name: "Inglês (EUA)", cc: "us" }, "en-gb": { name: "Inglês (Reino Unido)", cc: "gb" },
  "pt-br": { name: "Português (Brasil)", cc: "br" }, "pt-pt": { name: "Português (Portugal)", cc: "pt" },
  "es-es": { name: "Espanhol", cc: "es" }, "es-419": { name: "Espanhol (América Latina)", cc: "mx" },
  "fr": { name: "Francês", cc: "fr" }, "de": { name: "Alemão", cc: "de" }, "it": { name: "Italiano", cc: "it" },
  "ja": { name: "Japonês", cc: "jp" }, "ko": { name: "Coreano", cc: "kr" },
  "zh-cn": { name: "Chinês (Simplificado)", cc: "cn" }, "zh-tw": { name: "Chinês (Tradicional)", cc: "tw" },
  "ru": { name: "Russo", cc: "ru" }, "nl": { name: "Holandês", cc: "nl" }, "pl": { name: "Polonês", cc: "pl" },
  "tr": { name: "Turco", cc: "tr" }, "vi": { name: "Vietnamita", cc: "vn" }, "th": { name: "Tailandês", cc: "th" },
  "uk": { name: "Ucraniano", cc: "ua" }, "hi": { name: "Hindi", cc: "in" }, "ar": { name: "Árabe", cc: "sa" },
  "cs": { name: "Tcheco", cc: "cz" }, "da": { name: "Dinamarquês", cc: "dk" }, "fi": { name: "Finlandês", cc: "fi" },
  "el": { name: "Grego", cc: "gr" }, "hu": { name: "Húngaro", cc: "hu" }, "no": { name: "Norueguês", cc: "no" },
  "ro": { name: "Romeno", cc: "ro" }, "sv-se": { name: "Sueco", cc: "se" }, "bg": { name: "Búlgaro", cc: "bg" },
  "hr": { name: "Croata", cc: "hr" }, "lt": { name: "Lituano", cc: "lt" }, "id": { name: "Indonésio", cc: "id" },
}
function localeInfo(code: string): { name: string; cc: string } {
  const k = code.toLowerCase()
  if (LOCALE_INFO[k]) return LOCALE_INFO[k]
  const base = k.split(/[-_]/)[0]
  if (LOCALE_INFO[base]) return LOCALE_INFO[base]
  const found = Object.entries(LOCALE_INFO).find(([key]) => key.startsWith(base))
  return found ? found[1] : { name: code, cc: "" }
}

const COUNTRY_NAMES: Record<string, string> = {
  br: "Brasil", us: "Estados Unidos", pt: "Portugal", gb: "Reino Unido", de: "Alemanha", fr: "França",
  es: "Espanha", it: "Itália", nl: "Holanda", ca: "Canadá", au: "Austrália", jp: "Japão", kr: "Coreia do Sul",
  cn: "China", ru: "Rússia", mx: "México", ar: "Argentina", cl: "Chile", co: "Colômbia", pe: "Peru",
  in: "Índia", id: "Indonésia", tr: "Turquia", pl: "Polônia", se: "Suécia", no: "Noruega", fi: "Finlândia",
  dk: "Dinamarca", ie: "Irlanda", be: "Bélgica", ch: "Suíça", at: "Áustria", cz: "Tchéquia", ua: "Ucrânia",
  gr: "Grécia", ro: "Romênia", hu: "Hungria", pk: "Paquistão", ph: "Filipinas", vn: "Vietnã", th: "Tailândia",
  za: "África do Sul", nz: "Nova Zelândia", sg: "Singapura", ae: "Emirados Árabes", sa: "Arábia Saudita",
}
function countryName(code: string): string { return COUNTRY_NAMES[code.toLowerCase()] || code.toUpperCase() }

const OS_LABELS: Record<string, string> = {
  windows: "Windows", win32: "Windows", "windows 10": "Windows", "windows 11": "Windows",
  android: "Android", ios: "iOS", iphone: "iOS", ipados: "iPadOS",
  linux: "Linux", macos: "macOS", "mac os x": "macOS", darwin: "macOS", osx: "macOS",
  other: "Outro", unknown: "Desconhecido", "": "Desconhecido",
}
const BROWSER_LABELS: Record<string, string> = {
  "discord client": "App para computador", "discord desktop": "App para computador",
  "used desktop client": "App para computador", "desktop client": "App para computador",
  "discord android": "App no Android", "discord ios": "App no iPhone",
  "used mobile client": "App no celular", "mobile client": "App no celular",
  "discord embedded": "App integrado", "android chrome": "Chrome (Android)",
  chrome: "Chrome", firefox: "Firefox", safari: "Safari", edge: "Microsoft Edge", opera: "Opera",
  "discord.js": "Bot (discord.js)", "discord.py": "Bot (discord.py)", eris: "Bot (Eris)",
  other: "Outro", unknown: "Desconhecido", "": "Desconhecido",
}
function osLabel(v: string): string { return OS_LABELS[(v || "").toLowerCase().trim()] || v }
function browserLabel(v: string): string { return BROWSER_LABELS[(v || "").toLowerCase().trim()] || v }
function relabelKV(data: KV[], fn: (k: string) => string): KV[] {
  const m = new Map<string, number>()
  for (const d of data) { const k = fn(d.key); m.set(k, (m.get(k) || 0) + d.value) }
  return [...m.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value)
}


/** número que anima de 0 até value com GSAP. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obj = { v: 0 }
    const tw = gsap.to(obj, { v: value, duration: 1, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("pt-BR") } })
    return () => { tw.kill() }
  }, [value])
  return <span ref={ref} className={className}>0</span>
}

/** anima a entrada (stagger) dos elementos com classe .ga ao montar. */
function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.from(".ga", { y: 16, opacity: 0, duration: 0.45, stagger: 0.04, ease: "power2.out", clearProps: "all" })
    }, ref)
    return () => ctx.revert()
  }, [])
  return <div ref={ref} className={className || "space-y-5"}>{children}</div>
}


function StatCard({ icon, label, value, num, sub, accent, hint, className }: {
  icon: React.ReactNode; label: string; value?: React.ReactNode; num?: number; sub?: string; accent?: boolean; hint?: string; className?: string
}) {
  return (
    <div className={`ga rounded-xl border border-border bg-gradient-to-br from-card/60 to-card/20 p-4 transition-colors hover:border-primary/30 ${className || ""}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="text-primary/70">{icon}</span><span className="truncate">{label}</span>
        {hint && (<Tooltip><TooltipTrigger asChild><span className="ml-auto cursor-help"><Info size={11} className="text-muted-foreground/60" /></span></TooltipTrigger><TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent></Tooltip>)}
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{num !== undefined ? <CountUp value={num} /> : value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground truncate">{sub}</div>}
    </div>
  )
}

function SectionCard({ icon, title, right, children, hint, className }: {
  icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode; hint?: string; className?: string
}) {
  return (
    <div className={`ga rounded-xl border border-border bg-card/40 p-5 ${className || ""}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span><h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && (<Tooltip><TooltipTrigger asChild><span className="cursor-help"><Info size={12} className="text-muted-foreground/60" /></span></TooltipTrigger><TooltipContent side="top" className="max-w-[240px] text-xs">{hint}</TooltipContent></Tooltip>)}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ text }: { text: string }) { return <p className="py-6 text-center text-xs text-muted-foreground">{text}</p> }

/** valor sensível: borrado com botão de revelar. */
function Secret({ value, mono }: { value: string | null; mono?: boolean }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="font-medium text-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-medium text-foreground transition-all ${mono ? "font-mono text-xs" : ""} ${show ? "" : "select-none blur-[5px]"}`}>{value}</span>
      <button onClick={() => setShow((s) => !s)} className="shrink-0 text-muted-foreground transition-colors hover:text-primary" title={show ? "Ocultar" : "Revelar"}>{show ? <EyeOff size={13} /> : <Eye size={13} />}</button>
    </span>
  )
}

/** lista genérica com busca + paginação (mostra TODOS os dados). */
function DataList<T>({ items, pageSize = 20, search, renderRow, wrap, emptyText = "Sem dados", noun = "itens", fill = false }: {
  items: T[]; pageSize?: number; search?: (item: T) => string; renderRow: (item: T, absIndex: number) => React.ReactNode; wrap?: boolean; emptyText?: string; noun?: string; fill?: boolean
}) {
  const [q, setQ] = useState(""); const [page, setPage] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => { if (!q || !search) return items; const l = q.toLowerCase(); return items.filter((it) => search(it).toLowerCase().includes(l)) }, [items, q, search])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  useEffect(() => { setPage(0) }, [q])
  const slice = filtered.slice(cur * pageSize, (cur + 1) * pageSize)
  const from = filtered.length ? cur * pageSize + 1 : 0
  const to = Math.min(filtered.length, (cur + 1) * pageSize)
  const go = (p: number) => { setPage(Math.max(0, Math.min(pages - 1, p))); if (topRef.current) topRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" }) }

  const pageNums = useMemo(() => {
    const out: number[] = []; const win = 1; const last = pages - 1
    const lo = Math.max(0, cur - win), hi = Math.min(last, cur + win)
    if (lo > 0) { out.push(0); if (lo > 1) out.push(-1) }
    for (let i = lo; i <= hi; i++) out.push(i)
    if (hi < last) { if (hi < last - 1) out.push(-1); out.push(last) }
    return out
  }, [pages, cur])

  return (
    <div ref={topRef} className={fill ? "flex flex-1 flex-col gap-3" : "space-y-3"}>
      {search ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filtrar ${noun}...`} className="h-9 border-border bg-secondary/30 pl-8 text-sm" /></div>
          <span className="shrink-0 text-[11px] text-muted-foreground">{q ? <>{fmt(filtered.length)} de {fmt(items.length)}</> : fmt(items.length)} {noun}</span>
        </div>
      ) : pages > 1 ? (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{fmt(items.length)} {noun}</span><span className="tabular-nums">{fmt(from)}–{fmt(to)}</span></div>
      ) : null}

      {slice.length ? <div className={`${wrap ? "flex flex-wrap gap-2" : "space-y-2"} ${fill ? "flex-1 content-start" : ""}`}>{slice.map((it, i) => renderRow(it, cur * pageSize + i))}</div> : <EmptyRow text={emptyText} />}

      {pages > 1 && (
        <div className={`flex flex-col items-center gap-2 border-t border-border/40 pt-3 ${fill ? "mt-auto" : ""}`}>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button onClick={() => go(cur - 1)} disabled={cur === 0} aria-label="Anterior" className="flex h-8 items-center gap-1 rounded-lg border border-border bg-secondary/20 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"><ChevronLeft size={14} /></button>
            {pageNums.map((n, i) => n < 0
              ? <span key={`e${i}`} className="px-1 text-xs text-muted-foreground/60">…</span>
              : <button key={n} onClick={() => go(n)} className={`h-8 min-w-[32px] rounded-lg border px-2 text-xs font-semibold tabular-nums transition-colors ${n === cur ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>{n + 1}</button>)}
            <button onClick={() => go(cur + 1)} disabled={cur >= pages - 1} aria-label="Próxima" className="flex h-8 items-center gap-1 rounded-lg border border-border bg-secondary/20 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">Página <span className="font-semibold text-foreground">{cur + 1}</span> de {fmt(pages)}</span>
        </div>
      )}
    </div>
  )
}


function Donut({ data, unit = "", label }: { data: KV[]; unit?: string; label?: (key: string) => React.ReactNode }) {
  const [active, setActive] = useState<number | null>(null)
  const top = data.slice(0, 6)
  const rest = data.slice(6).reduce((s, d) => s + d.value, 0)
  const chartData = rest > 0 ? [...top, { key: "Outros", value: rest }] : top
  const total = chartData.reduce((s, d) => s + d.value, 0) || 1
  const cfg = Object.fromEntries(chartData.map((d, i) => [d.key, { label: d.key, color: PALETTE[i % PALETTE.length] }])) as ChartConfig
  if (!data.length) return <EmptyRow text="Sem dados" />
  const cur = active != null && chartData[active] ? chartData[active] : null
  const centerVal = cur ? cur.value : total
  const centerLabel = cur ? String(cur.key) : "total"
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div className="relative shrink-0">
        <ChartContainer config={cfg} className="h-40 w-40 [&_.recharts-wrapper]:!overflow-visible">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}
              activeIndex={active ?? undefined}
              activeShape={(props: any) => <Sector {...props} outerRadius={props.outerRadius + 6} />}
              onMouseEnter={(_: unknown, i: number) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={active == null || active === i ? 1 : 0.35} className="cursor-pointer transition-opacity" />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-bold leading-none text-foreground">{fmtShort(centerVal)}{cur ? unit : ""}</span>
          {cur
            ? <span className="mt-1 max-w-[76px] truncate text-[9px] font-medium uppercase tracking-wider text-primary">{centerLabel} · {Math.round((cur.value / total) * 100)}%</span>
            : <span className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">total</span>}
        </div>
      </div>
      <div className="w-full flex-1 space-y-1">
        {chartData.map((d, i) => (
          <div key={d.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            className={`flex cursor-default items-center gap-2 rounded-md px-1.5 py-0.5 text-xs transition-colors ${active === i ? "bg-secondary/40" : ""}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform" style={{ background: PALETTE[i % PALETTE.length], transform: active === i ? "scale(1.3)" : "none" }} />
            <span className={`flex min-w-0 flex-1 items-center gap-1.5 truncate ${active === i ? "font-medium text-foreground" : "text-foreground"}`}>{label ? label(d.key) : d.key}</span>
            <span className="tabular-nums text-muted-foreground">{fmt(d.value)}{unit}</span>
            <span className="w-9 text-right tabular-nums font-semibold text-primary">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** bandeira via imagem (emoji de bandeira não renderiza no Windows). */
function Flag({ code, size = 22 }: { code: string; size?: number }) {
  const cc = (code || "").toLowerCase()
  const [err, setErr] = useState(false)
  const h = Math.round(size * 0.72)
  if (!/^[a-z]{2}$/.test(cc)) return <Globe size={14} className="text-muted-foreground/70" />
  if (err) return <span className="inline-flex items-center justify-center rounded-[3px] bg-secondary/60 text-[9px] font-bold text-muted-foreground" style={{ width: size, height: h }}>{cc.toUpperCase()}</span>
  return <img src={`https://flagcdn.com/w40/${cc}.png`} srcSet={`https://flagcdn.com/w80/${cc}.png 2x`} alt={cc.toUpperCase()} width={size} height={h} loading="lazy" className="inline-block rounded-[3px] object-cover ring-1 ring-border/50" style={{ width: size, height: h }} onError={() => setErr(true)} />
}

const brandIcon = (slug: string) => `https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${slug}.svg`

const CONNECTION_SVG: Record<string, string> = {
  roblox: "M5.164 0 .001 18.928 18.836 24 24 5.072 5.164 0Zm9.875 14.309-4.906-1.32 1.32-4.907 4.907 1.32-1.321 4.907z",
}

const CONNECTION_INFO: Record<string, { slug: string; color: string; label: string }> = {
  spotify:         { slug: "spotify",         color: "#1DB954", label: "Spotify" },
  steam:           { slug: "steam",           color: "#1B2838", label: "Steam" },
  twitch:          { slug: "twitch",          color: "#9146FF", label: "Twitch" },
  youtube:         { slug: "youtube",         color: "#FF0000", label: "YouTube" },
  twitter:         { slug: "x",               color: "#000000", label: "X (Twitter)" },
  x:               { slug: "x",               color: "#000000", label: "X (Twitter)" },
  github:          { slug: "github",          color: "#181717", label: "GitHub" },
  reddit:          { slug: "reddit",          color: "#FF4500", label: "Reddit" },
  xbox:            { slug: "xbox",            color: "#107C10", label: "Xbox" },
  playstation:     { slug: "playstation",     color: "#0070D1", label: "PlayStation" },
  battlenet:       { slug: "battledotnet",    color: "#148EFF", label: "Battle.net" },
  epicgames:       { slug: "epicgames",       color: "#2A2A2A", label: "Epic Games" },
  riotgames:       { slug: "riotgames",       color: "#EB0029", label: "Riot Games" },
  leagueoflegends: { slug: "leagueoflegends", color: "#C28F2C", label: "League of Legends" },
  facebook:        { slug: "facebook",        color: "#1877F2", label: "Facebook" },
  instagram:       { slug: "instagram",       color: "#E4405F", label: "Instagram" },
  tiktok:          { slug: "tiktok",          color: "#000000", label: "TikTok" },
  ebay:            { slug: "ebay",            color: "#E53238", label: "eBay" },
  paypal:          { slug: "paypal",          color: "#003087", label: "PayPal" },
  crunchyroll:     { slug: "crunchyroll",     color: "#F47521", label: "Crunchyroll" },
  skype:           { slug: "skype",           color: "#00AFF0", label: "Skype" },
  soundcloud:      { slug: "soundcloud",      color: "#FF5500", label: "SoundCloud" },
  "amazon-music":  { slug: "amazonmusic",     color: "#00A8E1", label: "Amazon Music" },
  roblox:          { slug: "roblox",          color: "#232527", label: "Roblox" },
  bungie:          { slug: "bungie",          color: "#1A1A1A", label: "Bungie.net" },
  samsung:         { slug: "samsung",         color: "#1428A0", label: "Samsung" },
  mastodon:        { slug: "mastodon",        color: "#6364FF", label: "Mastodon" },
  bluesky:         { slug: "bluesky",         color: "#0285FF", label: "Bluesky" },
  domain:          { slug: "",                color: "#4b5563", label: "Site" },
}
function connectionInfo(type: string) { return CONNECTION_INFO[(type || "").toLowerCase()] || null }

function ConnectionCard({ type, name, verified }: { type: string; name: string; verified?: boolean }) {
  const info = connectionInfo(type)
  const [err, setErr] = useState(false)
  const color = info?.color || "var(--primary)"
  const label = info?.label || type
  const inlineSvg = CONNECTION_SVG[(type || "").toLowerCase()]
  const initial = (name || label || "?").charAt(0).toUpperCase()
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] shadow-sm ring-1 ring-black/10" style={{ background: color }}>
        {inlineSvg
          ? <svg viewBox="0 0 24 24" width={20} height={20} fill="#fff" role="img" aria-label={label}><path fillRule="evenodd" clipRule="evenodd" d={inlineSvg} /></svg>
          : info?.slug && !err
            ? <img src={brandIcon(info.slug)} alt={label} width={20} height={20} className="h-5 w-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} onError={() => setErr(true)} />
            : info && !info.slug
              ? <Globe size={18} className="text-white" />
              : name
                ? <span className="text-sm font-bold text-white">{initial}</span>
                : <Link2 size={18} className="text-white" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <span className="truncate">{name || label}</span>
          {verified && <BadgeCheck size={13} className="shrink-0 text-primary" />}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

const BADGE_CDN = "https://ik.imagekit.io/xys3wb0qo/"
const FLAG_ICONS: Record<string, { file: string; label: string }> = {
  STAFF: { file: "discordstaff.svg", label: "Equipe do Discord" },
  DISCORD_EMPLOYEE: { file: "discordstaff.svg", label: "Equipe do Discord" },
  PARTNER: { file: "discordpartner.svg", label: "Parceiro do Discord" },
  PARTNERED_SERVER_OWNER: { file: "discordpartner.svg", label: "Dono de servidor parceiro" },
  HYPESQUAD: { file: "hypesquadevents.svg", label: "HypeSquad Events" },
  HYPESQUAD_EVENTS: { file: "hypesquadevents.svg", label: "HypeSquad Events" },
  BUG_HUNTER_LEVEL_1: { file: "discordbughunter1.svg", label: "Caçador de Bugs Nível 1" },
  BUG_HUNTER_LEVEL_2: { file: "discordbughunter2.svg", label: "Caçador de Bugs Nível 2" },
  HYPESQUAD_ONLINE_HOUSE_1: { file: "hypesquadbravery.svg", label: "HypeSquad Bravery" },
  HYPESQUAD_ONLINE_HOUSE_2: { file: "hypesquadbrilliance.svg", label: "HypeSquad Brilliance" },
  HYPESQUAD_ONLINE_HOUSE_3: { file: "hypesquadbalance.svg", label: "HypeSquad Balance" },
  PREMIUM_EARLY_SUPPORTER: { file: "discordearlysupporter.svg", label: "Apoiador Inicial" },
  EARLY_SUPPORTER: { file: "discordearlysupporter.svg", label: "Apoiador Inicial" },
  VERIFIED_DEVELOPER: { file: "discordbotdev.svg", label: "Desenvolvedor de Bot Verificado" },
  EARLY_VERIFIED_BOT_DEVELOPER: { file: "discordbotdev.svg", label: "Desenvolvedor de Bot Verificado" },
  VERIFIED_BOT_DEVELOPER: { file: "discordbotdev.svg", label: "Desenvolvedor de Bot Verificado" },
  CERTIFIED_MODERATOR: { file: "discordmod.svg", label: "Moderador Certificado" },
  DISCORD_CERTIFIED_MODERATOR: { file: "discordmod.svg", label: "Moderador Certificado" },
  MODERATOR_PROGRAMS_ALUMNI: { file: "discordmod.svg", label: "Ex-Moderador Certificado" },
  ACTIVE_DEVELOPER: { file: "activedeveloper.svg", label: "Desenvolvedor Ativo" },
  PREMIUM: { file: "discordnitro.svg", label: "Nitro" },
  NITRO: { file: "discordnitro.svg", label: "Nitro" },
}
const FLAG_LABELS: Record<string, string> = {
  SPAMMER: "Marcada como spammer",
  QUARANTINED: "Conta em quarentena",
  MFA_SMS: "2FA por SMS",
  VERIFIED_BOT: "Bot verificado",
  SYSTEM: "Conta de sistema",
  TEAM_USER: "Conta de equipe",
  BOT_HTTP_INTERACTIONS: "Bot (interações HTTP)",
  HAS_UNREAD_URGENT_MESSAGES: "Mensagens urgentes não lidas",
  UNDERAGE_DELETED: "Marcada p/ exclusão (menor de idade)",
  DISABLE_PREMIUM: "Nitro desativado",
}
function prettyFlag(f: string): string {
  return FLAG_LABELS[f.toUpperCase()] || f.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase())
}
function AccountFlag({ flag }: { flag: string }) {
  const ic = FLAG_ICONS[(flag || "").toUpperCase()]
  const [err, setErr] = useState(false)
  if (ic && !err) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/20 px-2 py-1">
            <img src={BADGE_CDN + ic.file} alt={ic.label} className="h-4 w-4" onError={() => setErr(true)} />
            <span className="text-[11px] font-medium text-foreground">{ic.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{ic.label}</TooltipContent>
      </Tooltip>
    )
  }
  return <span className="rounded-md border border-border/50 bg-secondary/20 px-2 py-1 text-[11px] text-muted-foreground">{prettyFlag(flag)}</span>
}

/** codepoints de um emoji no formato do emoji-datasource (hex, minúsculo, unido por "-"). */
function emojiCodepoints(str: string): string {
  const cps: string[] = []
  for (const ch of str) { const cp = ch.codePointAt(0); if (cp) cps.push(cp.toString(16)) }
  return cps.join("-")
}
/** emoji estilo Apple (imagem), com fallback pro emoji nativo se a imagem faltar. */
function AppleEmoji({ char, size = 18 }: { char: string; size?: number }) {
  const [err, setErr] = useState(false)
  const cp = useMemo(() => emojiCodepoints(char), [char])
  if (err || !cp) return <span style={{ fontSize: size, lineHeight: 1 }}>{char}</span>
  return <img src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15/img/apple/64/${cp}.png`} alt={char} width={size} height={size} loading="lazy" className="inline-block align-[-0.15em]" style={{ width: size, height: size }} onError={() => setErr(true)} />
}

const EMOJI_SEQ_RE = /\p{RI}\p{RI}|[#*0-9]️⃣|\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*/gu

/** renderiza um texto trocando os emojis unicode por emojis Apple. */
function EmojiText({ text, size = 16, className }: { text: string; size?: number; className?: string }) {
  const parts = useMemo(() => {
    const out: { t: string; emoji: boolean }[] = []
    const re = new RegExp(EMOJI_SEQ_RE)
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), emoji: false })
      out.push({ t: m[0], emoji: true })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ t: text.slice(last), emoji: false })
    return out
  }, [text])
  return <span className={className}>{parts.map((p, i) => p.emoji ? <AppleEmoji key={i} char={p.t} size={size} /> : <span key={i}>{p.t}</span>)}</span>
}

/** lista ranqueada com barra proporcional + contagem — mostra "quantas vezes". */
function BarList({ data, pageSize = 12, color = "var(--primary)", unit = "x", noun = "itens", lead, searchable = true, dense = false, onItemClick }: {
  data: KV[]; pageSize?: number; color?: string; unit?: string; noun?: string
  lead?: (item: KV, i: number) => React.ReactNode; searchable?: boolean; dense?: boolean; onItemClick?: (item: KV) => void
}) {
  const max = data.reduce((mx, d) => (d.value > mx ? d.value : mx), 1)
  if (!data.length) return <EmptyRow text="Sem dados" />
  return (
    <DataList items={data} pageSize={pageSize} noun={noun} search={searchable ? (i) => i.key : undefined}
      renderRow={(it, idx) => {
        const pct = Math.max(3, Math.round((it.value / max) * 100))
        const clickable = !!onItemClick
        const Tag: React.ElementType = clickable ? "button" : "div"
        return (
          <Tag key={it.key + idx} {...(clickable ? { type: "button" as const, onClick: () => onItemClick!(it) } : {})}
            className={`group relative flex w-full items-center overflow-hidden border border-border/40 bg-secondary/10 text-left ${dense ? "gap-2 rounded-md px-2 py-1" : "gap-2.5 rounded-lg px-2.5 py-2"} ${clickable ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-secondary/20" : ""}`}>
            <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}2e, ${color}08)` }} />
            <span className={`relative shrink-0 text-right font-bold tabular-nums text-muted-foreground ${dense ? "w-4 text-[10px]" : "w-5 text-[11px]"}`}>{idx + 1}</span>
            {lead && <span className="relative shrink-0">{lead(it, idx)}</span>}
            <span className={`relative min-w-0 flex-1 truncate text-foreground ${dense ? "text-[13px]" : "text-sm"}`}>{it.key}</span>
            <span className={`relative shrink-0 tabular-nums font-bold text-foreground ${dense ? "text-[13px]" : "text-sm"}`}>{fmt(it.value)}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span></span>
            {clickable && <ChevronRight size={13} className="relative shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />}
          </Tag>
        )
      }} />
  )
}

/** lista de eventos em frases: "{nome} {ação} {n} vezes". */
function EventSentenceList({ events, name, pageSize = 14 }: { events: EventCount[]; name: string; pageSize?: number }) {
  const first = (name || "Você").split(/\s+/)[0] || name
  const max = events.length ? events[0].value : 1
  if (!events.length) return <EmptyRow text="Nenhum evento reconhecido neste pacote" />
  return (
    <DataList items={events} pageSize={pageSize} noun="tipos" search={(e) => e.key + " " + (e.phrase || "")}
      renderRow={(e, idx) => {
        const pct = Math.max(3, Math.round((e.value / max) * 100))
        return (
          <div key={e.key + idx} className="relative flex items-center gap-2.5 overflow-hidden rounded-lg border border-border/40 bg-secondary/10 px-2.5 py-2">
            <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg, color-mix(in srgb, var(--chart-2, #22c55e) 20%, transparent), transparent)" }} />
            <span className="relative w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground">{idx + 1}</span>
            <p className="relative min-w-0 flex-1 truncate text-sm text-foreground/90">
              {e.phrase
                ? <><span className="font-semibold text-foreground">{first}</span> {e.phrase} <span className="font-bold tabular-nums text-foreground">{fmt(e.value)}</span> {e.value === 1 ? "vez" : "vezes"}</>
                : <><span className="font-bold tabular-nums text-foreground">{fmt(e.value)}×</span> <span className="text-muted-foreground">{e.key}</span></>}
            </p>
          </div>
        )
      }} />
  )
}


function AreaTimeline({ data, color = "var(--primary)", id }: { data: { label: string; value: number }[]; color?: string; id: string }) {
  return (
    <ChartContainer config={chartConfig} className="h-52 w-full [&_.recharts-wrapper]:!overflow-visible">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} width={44} />
        <ChartTooltip cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }} content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)", fill: color }} />
      </AreaChart>
    </ChartContainer>
  )
}

/** controle segmentado (pills) para filtros. */
function Segmented<T extends string>({ options, value, onChange }: { options: { v: T; label: React.ReactNode; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary/20 p-0.5">
      {options.map((o) => (
        <button key={o.v} type="button" disabled={o.disabled} onClick={() => onChange(o.v)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-30 ${value === o.v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

type Gran = "hour" | "weekday" | "month" | "year"
type ChartKind = "area" | "bar" | "line"

const GRAN_DESC: Record<Gran, string> = { hour: "por hora do dia (UTC)", weekday: "por dia da semana", month: "por mês", year: "por ano" }

/** gráfico temporal com filtro de granularidade + troca de tipo + contexto. */
function TimeExplorer({ byHour, byWeekday, byMonth, id, color = "var(--primary)", defaultGran = "month", unitLabel = "mensagens" }: {
  byHour?: number[]; byWeekday?: number[]; byMonth?: { month: string; count: number }[]; id: string; color?: string; defaultGran?: Gran; unitLabel?: string
}) {
  const hasMonth = !!(byMonth && byMonth.length)
  const hasHour = !!(byHour && byHour.some((v) => v > 0))
  const hasWeek = !!(byWeekday && byWeekday.some((v) => v > 0))
  const initial: Gran = hasMonth ? defaultGran : hasHour ? "hour" : "weekday"
  const [gran, setGran] = useState<Gran>(initial)
  const [kind, setKind] = useState<ChartKind>("area")

  const data = useMemo(() => {
    if (gran === "hour") return (byHour || []).map((v, i) => ({ label: `${i}h`, value: v }))
    if (gran === "weekday") return (byWeekday || []).map((v, i) => ({ label: WEEKDAYS[i], value: v }))
    if (gran === "month") return (byMonth || []).map((b) => ({ label: fmtMonth(b.month), value: b.count }))
    const ym = new Map<string, number>()
    for (const b of byMonth || []) { const y = b.month.slice(0, 4); ym.set(y, (ym.get(y) || 0) + b.count) }
    return [...ym.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([y, c]) => ({ label: y, value: c }))
  }, [gran, byHour, byWeekday, byMonth])

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])
  const peak = useMemo(() => data.reduce<{ label: string; value: number } | null>((a, b) => (!a || b.value > a.value ? b : a), null), [data])

  const granOpts: { v: Gran; label: string; disabled?: boolean }[] = [
    { v: "hour", label: "Hora", disabled: !hasHour },
    { v: "weekday", label: "Semana", disabled: !hasWeek },
    { v: "month", label: "Mês", disabled: !hasMonth },
    { v: "year", label: "Ano", disabled: !hasMonth },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={gran} onChange={setGran} options={granOpts} />
        <Segmented value={kind} onChange={setKind} options={[{ v: "area", label: "Área" }, { v: "bar", label: "Barra" }, { v: "line", label: "Linha" }]} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)} {GRAN_DESC[gran]}</span>
        <span className="text-muted-foreground">Total: <span className="font-semibold tabular-nums text-foreground">{fmt(total)}</span></span>
        {peak && peak.value > 0 && <span className="text-muted-foreground">Pico: <span className="font-semibold text-foreground">{peak.label}</span> <span className="tabular-nums">({fmt(peak.value)})</span></span>}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/70"><MousePointerClick size={11} /> passe o mouse para ver cada ponto</span>
      </div>
      <TimeChart data={data} kind={kind} color={color} id={id} unitLabel={unitLabel} />
    </div>
  )
}

function TimeChart({ data, kind, color, id, unitLabel }: { data: { label: string; value: number }[]; kind: ChartKind; color: string; id: string; unitLabel: string }) {
  const margin = { top: 8, right: 10, bottom: 0, left: -10 }
  const dot = { r: 5, strokeWidth: 2, stroke: "var(--background)", fill: color }
  const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
  const xAxis = <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
  const yAxis = <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} width={44} />
  const tip = <ChartTooltip
    cursor={kind === "bar" ? { fill: color, fillOpacity: 0.12 } : { stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
    content={<ChartTooltipContent labelKey="label" formatter={(v: any) => <span className="tabular-nums"><span className="font-semibold text-foreground">{fmt(Number(v))}</span> <span className="text-muted-foreground">{unitLabel}</span></span>} />}
  />
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full [&_.recharts-wrapper]:!overflow-visible">
      {kind === "bar" ? (
        <BarChart data={data} margin={margin}>
          {grid}{xAxis}{yAxis}{tip}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={color} maxBarSize={48} activeBar={{ fillOpacity: 0.75 }} />
        </BarChart>
      ) : kind === "line" ? (
        <LineChart data={data} margin={margin}>
          {grid}{xAxis}{yAxis}{tip}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} activeDot={dot} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={margin}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
          {grid}{xAxis}{yAxis}{tip}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={dot} />
        </AreaChart>
      )}
    </ChartContainer>
  )
}

/** pódio das 3 palavras mais ditas, com contagem em destaque. */
function WordPodium({ words, onClick }: { words: KV[]; onClick?: (word: string) => void }) {
  const top = words.slice(0, 3)
  if (top.length < 3) return null
  const max = top[0].value || 1
  return (
    <div className="mb-4 grid grid-cols-3 gap-2.5">
      {top.map((w, i) => (
        <button key={w.key} type="button" onClick={onClick ? () => onClick(w.key) : undefined} disabled={!onClick}
          className={`relative overflow-hidden rounded-xl border p-3 text-center transition-transform ${onClick ? "cursor-pointer hover:-translate-y-0.5" : ""} ${i === 0 ? "border-amber-400/40 bg-amber-400/5" : i === 1 ? "border-slate-300/30 bg-slate-300/5" : "border-orange-500/30 bg-orange-500/5"}`}>
          <div className={`mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${MEDAL[i]}`}>{i + 1}</div>
          <div className="truncate text-sm font-bold text-foreground" title={w.key}>{w.key}</div>
          <div className="mt-0.5 text-lg font-extrabold tabular-nums text-primary"><CountUp value={w.value} /><span className="text-xs font-normal text-muted-foreground">x</span></div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary/40"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.round((w.value / max) * 100)}%` }} /></div>
        </button>
      ))}
    </div>
  )
}


/** linha compacta ranqueada (DM, canal ou servidor) com barra proporcional. */
function RankedRow({ item, rank, kind, onClick, max }: { item: TopEntry; rank: number; kind: "user" | "channel" | "server"; onClick?: () => void; max?: number }) {
  const pct = max ? Math.max(2, Math.round((item.value / max) * 100)) : 0
  const m = item.metrics
  const subChips = kind === "server"
    ? [{ icon: <Hash size={10} />, v: item.extra || 0, suffix: " canais" }]
    : ([
        { icon: <Type size={10} />, v: m?.chars || 0, suffix: " car." },
        { icon: <Smile size={10} />, v: m?.emojis || 0, suffix: "" },
        { icon: <Flame size={10} />, v: m?.curses || 0, suffix: "" },
      ].filter((c) => c.v > 0).slice(0, 3))
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border border-border/50 bg-secondary/10 px-2.5 py-2 text-left transition-colors ${onClick ? "cursor-pointer hover:border-primary/40 hover:bg-secondary/20" : "cursor-default"}`}>
      {pct > 0 && <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 13%, transparent), transparent)" }} />}
      <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums ${rank < 3 ? MEDAL[rank] : "border-border/60 bg-secondary/40 text-muted-foreground"}`}>{rank + 1}</span>
      {kind === "user" ? (
        item.avatar ? <img src={item.avatar} alt="" className="relative h-8 w-8 shrink-0 rounded-full border border-border object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden" }} />
          : <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{item.name.charAt(0).toUpperCase()}</div>
      ) : <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{kind === "server" ? <Server size={14} /> : <Hash size={14} />}</div>}
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
          {item.isBot && <span className="rounded bg-primary/15 px-1 py-px text-[9px] font-bold uppercase text-primary">bot</span>}
          {item.sub && <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">· {item.sub}</span>}
        </div>
        {subChips.length > 0 && (
          <div className="mt-0.5 flex items-center gap-2.5 text-[10px] tabular-nums text-muted-foreground">
            {subChips.map((c, i) => <span key={i} className="flex items-center gap-0.5"><span className="text-primary/50">{c.icon}</span>{fmt(c.v)}{c.suffix}</span>)}
          </div>
        )}
      </div>
      <div className="relative shrink-0 text-right">
        <div className="text-sm font-bold tabular-nums text-foreground">{fmt(item.value)}</div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">msgs</div>
      </div>
      {onClick && <ChevronRight size={15} className="relative shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />}
    </button>
  )
}

const ACTIVITY_GROUPS: { title: string; icon: React.ReactNode; icons: string[] }[] = [
  { title: "Chamadas de voz", icon: <PhoneCall size={13} />, icons: ["phone", "phone-call", "phone-off", "mic", "video"] },
  { title: "Mensagens & reações", icon: <MessageSquare size={13} />, icons: ["send", "heart", "check"] },
  { title: "Servidores", icon: <Server size={13} />, icons: ["server", "server-off", "eye"] },
  { title: "Canais", icon: <Hash size={13} />, icons: ["hash", "plus", "trash"] },
  { title: "Sessões & login", icon: <Power size={13} />, icons: ["power", "activity", "login", "key"] },
  { title: "Convites & amizades", icon: <UserPlus size={13} />, icons: ["link", "user-plus", "users"] },
  { title: "Navegação & app", icon: <MousePointerClick size={13} />, icons: ["search", "user", "square", "keyboard", "graduation", "gamepad", "terminal", "bell"] },
]

function ActivityGrid({ stats, name }: { stats: ActivityStat[]; name: string }) {
  if (!stats.length) return <EmptyRow text="Sem estatísticas" />
  const first = (name || "Você").split(/\s+/)[0] || name

  const byIcon = new Map(stats.map((s) => [s.icon, s]))
  const used = new Set<string>()
  const groups = ACTIVITY_GROUPS
    .map((g) => {
      const items = g.icons.map((ic) => byIcon.get(ic)).filter(Boolean) as ActivityStat[]
      items.forEach((s) => used.add(s.icon))
      return { title: g.title, icon: g.icon, items }
    })
    .filter((g) => g.items.length > 0)
  const others = stats.filter((s) => !used.has(s.icon))
  if (others.length) groups.push({ title: "Outros", icon: <Sparkles size={13} />, items: others })

  const chip = (s: ActivityStat) => (
    <div key={s.label} className="flex items-center gap-2 rounded-md border border-border/40 bg-secondary/10 px-2.5 py-1.5 transition-colors hover:border-primary/30">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{STAT_ICONS[s.icon] || <ActivityIcon size={12} />}</span>
      <p className="min-w-0 truncate text-[13px] leading-tight text-foreground/90" title={s.phrase ? `${first} ${s.phrase} ${fmt(s.value)} ${s.value === 1 ? "vez" : "vezes"}` : `${fmt(s.value)} ${s.label.toLowerCase()}`}>
        {s.phrase ? (
          <>{s.phrase.charAt(0).toUpperCase() + s.phrase.slice(1)} <span className="font-bold tabular-nums text-primary">{fmt(s.value)}</span> {s.value === 1 ? "vez" : "vezes"}</>
        ) : (
          <><span className="font-bold tabular-nums text-primary">{fmt(s.value)}</span> {s.label.toLowerCase()}</>
        )}
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="text-primary/70">{g.icon}</span>{g.title}
            <span className="ml-1 rounded bg-secondary/40 px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground">{g.items.length}</span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{g.items.map(chip)}</div>
        </div>
      ))}
    </div>
  )
}


function ChannelDialog({ entry, onClose }: { entry: TopEntry | null; onClose: () => void }) {
  const d = entry?.detail
  const activeDays = d?.firstAt && d?.lastAt ? Math.max(1, Math.round((new Date(d.lastAt).getTime() - new Date(d.firstAt).getTime()) / 86400000)) : null
  const perDay = activeDays && entry ? (entry.value / activeDays).toFixed(1) : null
  return (
    <Dialog open={!!entry} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
        {entry && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {entry.avatar ? <img src={entry.avatar} alt="" className="h-12 w-12 rounded-full border border-border object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{entry.name.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><h3 className="truncate text-lg font-bold text-foreground">{entry.name}</h3>{entry.isBot && <span className="rounded bg-primary/15 px-1 py-px text-[9px] font-bold uppercase text-primary">bot</span>}</div>
                <p className="truncate text-xs text-muted-foreground">{entry.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat icon={<MessageSquare size={12} />} label="Mensagens" value={entry.value} accent />
              <MiniStat icon={<Type size={12} />} label="Caracteres" value={entry.metrics?.chars || 0} />
              <MiniStat icon={<Type size={12} />} label="Média/msg" value={d?.avgLength || 0} suffix=" caract." />
              {perDay && <MiniStat icon={<ActivityIcon size={12} />} label="Msgs/dia" value={Number(perDay)} />}
              <MiniStat icon={<Link2 size={12} />} label="Links" value={entry.metrics?.links || 0} />
              <MiniStat icon={<AtSign size={12} />} label="Menções" value={entry.metrics?.mentions || 0} />
              <MiniStat icon={<Smile size={12} />} label="Emojis" value={entry.metrics?.emojis || 0} />
              <MiniStat icon={<Paperclip size={12} />} label="Anexos" value={entry.metrics?.attachments || 0} />
              <MiniStat icon={<Flame size={12} />} label="Palavrões" value={entry.metrics?.curses || 0} />
            </div>

            {d && (d.firstAt || d.lastAt) && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-border/50 bg-secondary/10 px-2.5 py-1 text-muted-foreground">Primeira: <span className="text-foreground">{fmtDate(d.firstAt)}</span></span>
                <span className="rounded-md border border-border/50 bg-secondary/10 px-2.5 py-1 text-muted-foreground">Última: <span className="text-foreground">{fmtDate(d.lastAt)}</span></span>
                {activeDays && <span className="rounded-md border border-border/50 bg-secondary/10 px-2.5 py-1 text-muted-foreground">Período: <span className="text-foreground">{activeDays} dias</span></span>}
              </div>
            )}

            {d && (d.byHour.some((v) => v > 0) || d.byMonth.length > 0) && (
              <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atividade nesta conversa</h4><TimeExplorer byHour={d.byHour} byWeekday={d.byWeekday} byMonth={d.byMonth} id={`dlg-${entry.id}`} color="var(--chart-2, #22c55e)" defaultGran={d.byMonth.length > 1 ? "month" : "hour"} /></div>
            )}

            {d && d.longest && d.longest.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem mais longa aqui ({fmt(d.longest.length)} caracteres)</h4>
                <p className="rounded-lg border border-border/50 bg-secondary/10 p-3 text-sm italic text-foreground/80">"<EmojiText text={d.longest.preview} size={15} />{d.longest.length > 280 ? "…" : ""}"</p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Palavras mais usadas aqui</h4>
                {d && d.topWords.length ? <BarList data={d.topWords} noun="palavras" pageSize={8} dense /> : <EmptyRow text="Sem palavras" />}
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emojis mais usados aqui</h4>
                {d && d.topEmojis.length ? (
                  <DataList items={d.topEmojis} pageSize={18} noun="emojis" wrap renderRow={(e) => <span key={e.key} className="inline-flex w-[64px] flex-col items-center gap-1 rounded-lg border border-border/50 bg-secondary/10 px-2 py-1.5" title={`${e.key} — ${fmt(e.value)}x`}><AppleEmoji char={e.key} size={26} /><span className="text-[11px] font-semibold tabular-nums text-foreground">{fmt(e.value)}</span></span>} />
                ) : <EmptyRow text="Sem emojis" />}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MiniStat({ icon, label, value, accent, suffix }: { icon: React.ReactNode; label: string; value: number; accent?: boolean; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/10 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><span className="text-primary/60">{icon}</span>{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{fmt(value)}{suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}</div>
    </div>
  )
}

function WordDialog({ word, places, onClose }: { word: string | null; places: WordPlace[]; onClose: () => void }) {
  const total = places.reduce((s, p) => s + p.value, 0)
  const max = places[0]?.value || 1
  return (
    <Dialog open={!!word} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto border-border bg-card">
        {word && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Type size={20} /></div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-foreground">"{word}"</h3>
                <p className="text-xs text-muted-foreground">{fmt(total)} {total === 1 ? "vez" : "vezes"} · {fmt(places.length)} {places.length === 1 ? "lugar" : "lugares"}</p>
              </div>
            </div>
            {places.length ? (
              <div className="space-y-1.5">
                {places.map((p, i) => {
                  const pct = Math.max(3, Math.round((p.value / max) * 100))
                  return (
                    <div key={i} className="relative flex items-center gap-2.5 overflow-hidden rounded-lg border border-border/40 bg-secondary/10 px-2.5 py-2">
                      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 16%, transparent), transparent)" }} />
                      <span className="relative w-4 shrink-0 text-right text-[10px] font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                      {p.kind === "dm" && p.avatar
                        ? <img src={p.avatar} alt="" className="relative h-7 w-7 shrink-0 rounded-full border border-border object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden" }} />
                        : <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{p.kind === "channel" ? <Hash size={13} /> : <Users size={13} />}</div>}
                      <div className="relative min-w-0 flex-1">
                        <div className="truncate text-sm text-foreground">{p.name}</div>
                        {p.sub && <div className="truncate text-[10px] text-muted-foreground">{p.sub}</div>}
                      </div>
                      <span className="relative shrink-0 text-sm font-bold tabular-nums text-primary">{fmt(p.value)}<span className="text-[10px] font-normal text-muted-foreground">x</span></span>
                    </div>
                  )
                })}
              </div>
            ) : <EmptyRow text="Sem detalhes de onde essa palavra foi usada" />}
            <p className="text-[11px] leading-relaxed text-muted-foreground">Conversas, grupos e canais onde você mais escreveu essa palavra.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


export default function PaginaAnalisePackage() {
  const [zipPath, setZipPath] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [isDragging, setIsDragging] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const [pct, setPct] = useState(0)
  const [statusMsg, setStatusMsg] = useState("")
  const [phaseLabel, setPhaseLabel] = useState("")
  const [msgsParsed, setMsgsParsed] = useState(0)
  const [eventsParsed, setEventsParsed] = useState(0)
  const [stats, setStats] = useState<PackageStats | null>(null)
  const taskIdRef = useRef<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [botToken, setBotToken] = useState("")
  const [useBotToken, setUseBotToken] = useState(false)
  const [saved, setSaved] = useState<SavedAnalysisMeta[]>([])
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => { const s = localStorage.getItem(LS_TOKEN); if (s) { setBotToken(s); setUseBotToken(true) } }, [])

  const loadSavedList = useCallback(async () => {
    try { const res = await api.listarPackagesSalvos<SavedAnalysisMeta[]>(); setSaved((res.data as SavedAnalysisMeta[]) || []) } catch { /* ignore */ }
  }, [])
  useEffect(() => { loadSavedList() }, [loadSavedList])

  const PHASE_LABELS: Record<string, string> = { starting: "Preparando", account: "Lendo conta", servers: "Servidores", messages: "Mensagens", activity: "Atividade", finishing: "Finalizando" }

  useEffect(() => {
    let cancelled = false
    const recover = async () => {
      try {
        const running = await api.getRunningTasks()
        const tasks = (running.data || []) as Array<{ id: string; tool: string; phase?: string; progress: number }>
        const active = tasks.find((t) => t.tool === "package-analytics")
        if (active && !cancelled) { taskIdRef.current = active.id; setPct(active.progress || 0); setPhaseLabel(PHASE_LABELS[active.phase || ""] || "Analisando"); setPhase("analyzing"); return }
      } catch { /* ignore */ }
      const last = localStorage.getItem(LS_LAST_TASK)
      if (last && !cancelled) { try { const res = await api.getPackageResultado<PackageStats>(last); if (res.data && !cancelled) { taskIdRef.current = last; setStats(res.data as PackageStats); setPhase("done") } } catch { /* expirado */ } }
    }
    recover(); return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useWSEvent<PkgProgress>("tool:progress", (data) => {
    if (data.tool !== "package-analytics" || data.taskId !== taskIdRef.current) return
    setPct(data.progress); if (data.message) setStatusMsg(data.message); if (data.phase) setPhaseLabel(PHASE_LABELS[data.phase] || data.phase)
    if (typeof data.messagesParsed === "number") setMsgsParsed(data.messagesParsed); if (typeof data.eventsParsed === "number") setEventsParsed(data.eventsParsed)
    if (phase !== "analyzing") setPhase("analyzing")
  })
  useWSEvent<{ taskId: string; tool: string }>("tool:completed", async (data) => {
    if (data.tool !== "package-analytics" || data.taskId !== taskIdRef.current) return
    try { const res = await api.getPackageResultado<PackageStats>(data.taskId); setStats(res.data as PackageStats); setPhase("done"); notify("BrunnoClear", "Análise do package concluída!") }
    catch { setError("Falha ao carregar o resultado da análise"); setPhase("error") }
  })
  useWSEvent<{ taskId: string; tool: string; error: string }>("tool:error", (data) => {
    if (data.tool !== "package-analytics" || data.taskId !== taskIdRef.current) return
    setError(data.error || "Erro desconhecido"); setPhase("error")
  })

  const pickPath = useCallback((path: string) => { setZipPath(path); setError("") }, [])
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file?.name.endsWith(".zip")) { const p = window.electronAPI?.webUtils.getPathForFile(file); if (p) pickPath(p) } }, [pickPath])
  const handleFileSelect = useCallback(async () => { const p = await window.electronAPI?.dialog.openFile([{ name: "ZIP files", extensions: ["zip"] }]); if (p) pickPath(p) }, [pickPath])

  const handleAnalyze = async () => {
    if (!zipPath.trim()) return
    setStarting(true); setError(""); setPct(0); setMsgsParsed(0); setEventsParsed(0); setStatusMsg("Iniciando..."); setPhaseLabel("Preparando")
    if (useBotToken && botToken.trim()) localStorage.setItem(LS_TOKEN, botToken.trim()); else localStorage.removeItem(LS_TOKEN)
    try {
      const res = await api.analisarPackageDados(zipPath.trim(), useBotToken ? botToken.trim() : undefined)
      const tid = (res.data as { taskId: string }).taskId; taskIdRef.current = tid; localStorage.setItem(LS_LAST_TASK, tid); setPhase("analyzing")
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao iniciar análise"); setPhase("error") } finally { setStarting(false) }
  }
  const reset = () => { setPhase("idle"); setStats(null); setZipPath(""); setError(""); setPct(0); setSavedId(null); taskIdRef.current = null; localStorage.removeItem(LS_LAST_TASK); loadSavedList() }
  const downloadJson = () => { if (!stats) return; const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `analise-${stats.account.username || "package"}.json`; a.click(); URL.revokeObjectURL(url) }

  const handleCancel = async () => {
    const tid = taskIdRef.current
    setCancelling(true)
    try { if (tid) await api.cancelTask(tid) } catch { /* ignore */ }
    taskIdRef.current = null; localStorage.removeItem(LS_LAST_TASK)
    setPhase("idle"); setPct(0); setMsgsParsed(0); setEventsParsed(0); setStatusMsg(""); setError(""); setCancelling(false)
  }

  const handleSave = async () => {
    if (!taskIdRef.current || !stats) return
    setSaving(true)
    try {
      const res = await api.salvarPackage(taskIdRef.current, stats.account.displayName)
      const meta = res.data as SavedAnalysisMeta
      setSavedId(meta.id); notify("BrunnoClear", "Análise salva! Acesse depois sem reanalisar.")
      loadSavedList()
    } catch (err) { notify("BrunnoClear", err instanceof Error ? err.message : "Falha ao salvar análise") } finally { setSaving(false) }
  }

  const handleLoadSaved = async (id: string) => {
    setStarting(true); setError("")
    try {
      const res = await api.getPackageSalvo<PackageStats>(id)
      if (res.data) { setStats(res.data as PackageStats); setSavedId(id); taskIdRef.current = null; setPhase("done") }
    } catch { setError("Não foi possível carregar a análise salva") } finally { setStarting(false) }
  }
  const handleDeleteSaved = async (id: string) => {
    try { await api.deletarPackageSalvo(id) } catch { /* ignore */ }
    loadSavedList()
  }

  if (phase === "idle" || phase === "error") return <IdleScreen {...{ zipPath, setZipPath, isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileSelect, showAdvanced, setShowAdvanced, useBotToken, setUseBotToken, botToken, setBotToken, handleAnalyze, starting, error, saved, onLoadSaved: handleLoadSaved, onDeleteSaved: handleDeleteSaved }} />
  if (phase === "analyzing") return <AnalyzingScreen {...{ pct, statusMsg, phaseLabel, msgsParsed, eventsParsed, onCancel: handleCancel, cancelling }} />
  if (phase === "done" && stats) return <Dashboard stats={stats} onReset={reset} onDownload={downloadJson} onSave={handleSave} saving={saving} isSaved={!!savedId} canSave={!savedId && !!taskIdRef.current} />
  return null
}


function IdleScreen(p: any) {
  return (
    <AnimatedSection className="space-y-6">
      <div className="ga overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><PieIcon size={22} className="text-primary" /></div>
          <div><h2 className="text-base font-bold text-foreground">Análise de Package</h2><p className="text-xs text-muted-foreground">Transforme seu pacote de dados do Discord num dashboard completo, animado e profissional</p></div>
        </div>
        <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${p.isDragging ? "border-primary bg-primary/5" : p.zipPath ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/10 hover:border-primary/40 cursor-pointer"}`}
          onDragOver={p.handleDragOver} onDragLeave={p.handleDragLeave} onDrop={p.handleDrop} onClick={p.zipPath ? undefined : p.handleFileSelect} role={p.zipPath ? undefined : "button"}>
          {p.zipPath ? (
            <div className="flex w-full items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10"><FileArchive size={24} className="text-primary" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{p.zipPath.split(/[/\\]/).pop()}</p><p className="truncate text-xs text-muted-foreground">{p.zipPath}</p></div>
              <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); p.setZipPath("") }} className="relative z-10 h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-red-400"><X size={14} /></Button>
            </div>
          ) : (<><Upload size={34} className="mb-3 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Arraste o arquivo ZIP do seu pacote aqui</p><p className="mt-1 text-xs text-muted-foreground">ou clique para selecionar</p></>)}
        </div>
        <div className="mt-4 rounded-lg border border-border/50 bg-secondary/10 p-3"><p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Como obter:</span> Discord → Configurações → Dados e privacidade → Solicitar todos os meus dados → aguarde o e-mail. Funciona com pacotes <span className="text-foreground">PT</span> e <span className="text-foreground">EN</span>. Processado 100% localmente.</p></div>
        <button onClick={() => p.setShowAdvanced((v: boolean) => !v)} className="mt-4 flex w-full items-center gap-2 rounded-lg border border-border/50 bg-secondary/10 px-3 py-2.5 text-left text-xs transition-colors hover:bg-secondary/20"><KeyRound size={14} className="text-primary/70" /><span className="flex-1 font-medium text-foreground">Resolver fotos e nomes dos usuários (opcional)</span><ChevronDown size={14} className={`transition-transform ${p.showAdvanced ? "rotate-180" : ""}`} /></button>
        {p.showAdvanced && (
          <div className="mt-2 space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">Sua conta entra por <span className="text-foreground">token de usuário</span>, que não pode buscar outros usuários com segurança. Para ver <span className="text-foreground">foto e nome</span> de todos das suas DMs (inclusive não-amigos e bots), configure um <span className="text-foreground">token de BOT</span> — opcional.</p>
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-2.5"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-yellow-500" /><p className="text-[11px] leading-relaxed text-yellow-400/90">O bot fará <span className="font-medium">fetch dos usuários</span>, o que <span className="font-medium">aumenta o tempo</span>. Sem token, os nomes ainda aparecem (via pacote). Fica salvo <span className="font-medium">só neste PC</span>.</p></div>
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-foreground">Usar token de bot</span><Switch checked={p.useBotToken} onCheckedChange={p.setUseBotToken} /></div>
            {p.useBotToken && <Input type="password" placeholder="Cole o token do seu bot" value={p.botToken} onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setBotToken(e.target.value)} className="h-10 border-border bg-secondary/40 font-mono text-xs" />}
          </div>
        )}
        <Button onClick={p.handleAnalyze} disabled={p.starting || !p.zipPath.trim()} className="mt-4 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">{p.starting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Search size={18} className="mr-2" />}{p.starting ? "Iniciando..." : "Analisar Package"}</Button>
      </div>
      {p.error && (<div className="ga flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4"><AlertTriangle size={16} className="shrink-0 text-red-400" /><span className="text-sm text-red-400">{p.error}</span></div>)}
      {p.saved && p.saved.length > 0 && (
        <div className="ga rounded-xl border border-border bg-card/40 p-5">
          <div className="mb-3 flex items-center gap-2"><BadgeCheck size={16} className="text-primary" /><h3 className="text-sm font-semibold text-foreground">Análises salvas</h3><span className="ml-auto text-xs text-muted-foreground">{fmt(p.saved.length)}</span></div>
          <div className="space-y-2">
            {p.saved.map((s: SavedAnalysisMeta) => (
              <div key={s.id} className="group flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 p-2.5 transition-colors hover:border-primary/40">
                <button type="button" onClick={() => p.onLoadSaved(s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {s.avatar ? <img src={s.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full border border-border object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden" }} /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(s.displayName || s.name || "?").charAt(0).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{s.username} · {fmt(s.totalMessages)} msgs · {fmtDate(s.savedAt)}</p>
                  </div>
                </button>
                <button type="button" onClick={() => p.onLoadSaved(s.id)} className="shrink-0 rounded-md border border-border bg-secondary/20 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">Abrir</button>
                <button type="button" onClick={() => p.onDeleteSaved(s.id)} title="Excluir" className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </AnimatedSection>
  )
}


function AnalyzingScreen({ pct, statusMsg, phaseLabel, msgsParsed, eventsParsed, onCancel, cancelling }: { pct: number; statusMsg: string; phaseLabel: string; msgsParsed: number; eventsParsed: number; onCancel: () => void; cancelling: boolean }) {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(ringRef.current, { rotate: 360, duration: 3, repeat: -1, ease: "none" })
      if (dotsRef.current) gsap.to(dotsRef.current.children, { y: -6, duration: 0.5, repeat: -1, yoyo: true, stagger: 0.12, ease: "sine.inOut" })
    })
    return () => ctx.revert()
  }, [])
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div ref={ringRef} className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/40" />
        <div className="absolute inset-3 rounded-full border border-border/60" />
        <div className="flex flex-col items-center"><PieIcon size={30} className="text-primary" /><span className="mt-1 text-3xl font-bold tabular-nums text-foreground">{pct}%</span></div>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Analisando seu package</h2>
        <p className="mt-1 text-sm text-muted-foreground">{statusMsg || "Processando..."}</p>
        <span className="mt-2 inline-block rounded-full border border-border bg-secondary/30 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{phaseLabel}</span>
      </div>
      <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-300 ease-out" style={{ width: `${pct}%` }} /></div>
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/40 p-4 text-center"><div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground"><MessageSquare size={12} /> Mensagens</div><div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{fmt(msgsParsed)}</div></div>
        <div className="rounded-xl border border-border bg-card/40 p-4 text-center"><div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground"><ActivityIcon size={12} /> Eventos</div><div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{fmt(eventsParsed)}</div></div>
      </div>
      <div ref={dotsRef} className="flex gap-2">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-primary/70" />)}</div>
      <Button variant="outline" onClick={onCancel} disabled={cancelling} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400">
        {cancelling ? <Loader2 size={16} className="mr-2 animate-spin" /> : <X size={16} className="mr-2" />}{cancelling ? "Cancelando..." : "Cancelar análise"}
      </Button>
      <p className="max-w-md text-center text-xs text-muted-foreground">Pacotes grandes podem levar alguns minutos. Pode navegar em outras páginas à vontade — a análise continua rodando em segundo plano e volta pra cá quando terminar.</p>
    </div>
  )
}


function Dashboard({ stats, onReset, onDownload, onSave, saving, isSaved, canSave }: { stats: PackageStats; onReset: () => void; onDownload: () => void; onSave: () => void; saving: boolean; isSaved: boolean; canSave: boolean }) {
  const { account: acc, messages: m, activity: act } = stats
  const [drill, setDrill] = useState<TopEntry | null>(null)
  const [wordDrill, setWordDrill] = useState<string | null>(null)
  const monthData = m.byMonth.map((b) => ({ label: b.month, value: b.count }))
  const actMonthData = act.byMonth.map((b) => ({ label: fmtMonth(b.month), value: b.count }))

  const activeDays = m.firstMessageAt && m.lastMessageAt ? Math.max(1, Math.round((new Date(m.lastMessageAt).getTime() - new Date(m.firstMessageAt).getTime()) / 86400000)) : null
  const msgsPerDay = activeDays ? Math.round(m.totalMessages / activeDays) : null
  const wordsPerMsg = m.totalMessages ? (m.totalWords / m.totalMessages).toFixed(1) : "0"
  const peakHour = m.byHour.some((v) => v > 0) ? m.byHour.indexOf(Math.max(...m.byHour)) : null
  const peakWeekday = m.byWeekday.some((v) => v > 0) ? m.byWeekday.indexOf(Math.max(...m.byWeekday)) : null
  const peakMonth = m.byMonth.length ? m.byMonth.reduce((a, b) => (b.count > a.count ? b : a)) : null

  return (
    <div className="space-y-6">
      <ChannelDialog entry={drill} onClose={() => setDrill(null)} />
      <WordDialog word={wordDrill} places={wordDrill ? (m.wordPlaces?.[wordDrill] || []) : []} onClose={() => setWordDrill(null)} />
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/20" />
        <div className="flex flex-wrap items-center gap-4 p-6">
          <div className="relative shrink-0">
            {acc.avatarDataUri ? <img src={acc.avatarDataUri} alt={acc.displayName} className="h-16 w-16 rounded-full border-2 border-primary/30 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-2xl font-bold text-primary">{acc.displayName.charAt(0).toUpperCase()}</div>}
            {acc.avatarDecorationUrl && <img src={acc.avatarDecorationUrl} alt="" className="pointer-events-none absolute -inset-1.5 h-[76px] w-[76px]" onError={(e) => { e.currentTarget.style.display = "none" }} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-bold text-foreground">{acc.displayName}</h2>{acc.verified && <BadgeCheck size={16} className="text-primary" />}{acc.badges.map((b) => (<Tooltip key={b.name}><TooltipTrigger asChild><img src={b.url} alt={b.name} className="h-5 w-5" onError={(e) => { e.currentTarget.style.display = "none" }} /></TooltipTrigger><TooltipContent side="top" className="text-xs">{b.name}</TooltipContent></Tooltip>))}</div>
            <p className="text-sm text-muted-foreground">@{acc.username} · {acc.id}</p>
            <p className="mt-1 text-xs text-muted-foreground">Criada em {fmtDate(acc.createdAt)} · {humanDuration(acc.accountAgeDays)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{stats.language === "pt" ? "PT-BR" : stats.language === "en" ? "EN" : "Pacote"}</span>
            {isSaved ? (
              <span className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"><BadgeCheck size={14} /> Salva</span>
            ) : canSave ? (
              <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="border-primary/40 text-primary hover:bg-primary/10">{saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <BadgeCheck size={14} className="mr-1.5" />}{saving ? "Salvando..." : "Salvar"}</Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onDownload} className="border-border text-muted-foreground hover:text-foreground"><Download size={14} className="mr-1.5" /> JSON</Button>
            <Button size="sm" onClick={onReset} className="bg-primary text-primary-foreground hover:bg-primary/90"><RotateCcw size={14} className="mr-1.5" /> Novo</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {[{ v: "overview", label: "Visão Geral", icon: <TrendingUp size={14} /> }, { v: "messages", label: "Mensagens", icon: <MessageSquare size={14} /> }, { v: "activity", label: "Atividade", icon: <ActivityIcon size={14} /> }, { v: "places", label: "Locais & Dispositivos", icon: <Globe size={14} /> }, { v: "servers", label: "Servidores", icon: <Server size={14} /> }, { v: "account", label: "Conta", icon: <Users size={14} /> }].map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-primary">{t.icon} {t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <AnimatedSection>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<MessageSquare size={12} />} label="Mensagens arquivadas" num={m.totalMessages} accent hint="Mensagens salvas no pacote. Pode diferir do total enviado na telemetria." />
              <StatCard icon={<Type size={12} />} label="Caracteres" num={m.totalCharacters} sub={`~${fmt(Math.round(m.totalCharacters / 5000))} páginas`} />
              <StatCard icon={<Zap size={12} />} label="Mensagens enviadas" num={act.messagesSent} hint="Envios registrados pela telemetria (inclui apagadas)." />
              <StatCard icon={<Eye size={12} />} label="Aberturas do app" num={act.appOpens} />
              <StatCard icon={<Users size={12} />} label="Amigos" num={acc.friendsCount} />
              <StatCard icon={<Server size={12} />} label="Servidores" num={stats.servers.total} />
              <StatCard icon={<Hash size={12} />} label="Conversas" num={m.totalChannels} />
              <StatCard icon={<ActivityIcon size={12} />} label="Eventos analisados" num={act.totalEvents} />
            </div>
            {stats.funFacts.length > 0 && (
              <SectionCard icon={<Sparkles size={16} />} title="Curiosidades"><div className="grid gap-2 sm:grid-cols-2">{stats.funFacts.map((f, i) => (<div key={i} className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-secondary/10 p-3"><Sparkles size={14} className="mt-0.5 shrink-0 text-primary/70" /><EmojiText text={f} size={16} className="text-sm text-foreground/90" /></div>))}</div></SectionCard>
            )}
            <SectionCard icon={<TrendingUp size={16} />} title="Sua atividade ao longo do tempo" hint="Troque a granularidade (hora, dia da semana, mês, ano) e o tipo de gráfico." right={<span className="text-[10px] uppercase tracking-wider text-muted-foreground">UTC</span>}>
              <TimeExplorer byHour={m.byHour} byWeekday={m.byWeekday} byMonth={m.byMonth} id="ov-time" defaultGran={monthData.length > 1 ? "month" : "hour"} />
            </SectionCard>
          </AnimatedSection>
        </TabsContent>

        <TabsContent value="messages" className="mt-5">
          <AnimatedSection>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<MessageSquare size={12} />} label="Total de mensagens" num={m.totalMessages} accent />
              <StatCard icon={<Type size={12} />} label="Média por mensagem" value={`${fmt(m.avgLength)} caracteres`} hint="Quantos caracteres, em média, cada mensagem sua tem." />
              <StatCard icon={<Hash size={12} />} label="Palavras por mensagem" value={wordsPerMsg} hint="Média de palavras por mensagem enviada." />
              {msgsPerDay !== null && <StatCard icon={<ActivityIcon size={12} />} label="Mensagens por dia" num={msgsPerDay} hint={`Média no período ativo${activeDays ? ` (${fmt(activeDays)} dias)` : ""}.`} />}
              {peakHour !== null && <StatCard icon={<Clock size={12} />} label="Hora mais ativa" value={`${peakHour}h`} sub="horário UTC" />}
              {peakWeekday !== null && <StatCard icon={<Calendar size={12} />} label="Dia mais ativo" value={WEEKDAYS_FULL[peakWeekday]} />}
              {peakMonth && <StatCard icon={<Calendar size={12} />} label="Mês mais movimentado" value={fmtMonth(peakMonth.month, true)} sub={`${fmt(peakMonth.count)} mensagens`} />}
              <StatCard icon={<Type size={12} />} label="Total de caracteres" num={m.totalCharacters} sub={`~${fmt(Math.round(m.totalCharacters / 5000))} páginas`} />
              <StatCard icon={<Hash size={12} />} label="Palavras contáveis" num={m.totalWords} />
              <StatCard icon={<Link2 size={12} />} label="Links enviados" num={m.totalLinks} />
              <StatCard icon={<AtSign size={12} />} label="Menções" num={m.totalMentions} />
              <StatCard icon={<Paperclip size={12} />} label="Anexos" num={m.totalAttachments} />
              <StatCard icon={<Smile size={12} />} label="Emojis usados" num={m.totalEmojisUsed} />
              <StatCard icon={<Flame size={12} />} label="Palavrões" num={m.curseWords} />
            </div>
            <SectionCard icon={<Users size={16} />} title="DMs mais movimentadas" hint={stats.usersResolved ? "Fotos resolvidas via token de bot. Clique para ver detalhes." : "Clique numa DM para ver palavras, emojis e horários. Ative o token de bot para as fotos."}>
              <DataList items={m.topDMs} pageSize={15} noun="conversas" search={(i) => i.name + " " + i.id} renderRow={(it, idx) => <RankedRow key={it.id + idx} item={it} rank={idx} kind="user" max={m.topDMs[0]?.value} onClick={() => setDrill(it)} />} />
            </SectionCard>
            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard icon={<Server size={16} />} title="Servidores mais ativos"><DataList items={m.topGuilds} pageSize={10} noun="servidores" search={(i) => i.name} renderRow={(it, idx) => <RankedRow key={it.id + idx} item={it} rank={idx} kind="server" max={m.topGuilds[0]?.value} />} /></SectionCard>
              <SectionCard icon={<Hash size={16} />} title="Canais com mais mensagens" hint="Clique num canal para ver os detalhes."><DataList items={m.topChannels} pageSize={10} noun="canais" search={(i) => i.name + " " + (i.sub || "")} renderRow={(it, idx) => <RankedRow key={it.id + idx} item={it} rank={idx} kind="channel" max={m.topChannels[0]?.value} onClick={() => setDrill(it)} />} /></SectionCard>
            </div>
            <SectionCard icon={<Type size={16} />} title="Palavras mais usadas" hint="Clique numa palavra para ver em quais conversas e canais você a escreveu." right={<span className="text-xs text-muted-foreground">{fmt(m.topWords.length)} palavras</span>}>
              <WordPodium words={m.topWords} onClick={setWordDrill} />
              <div className="mt-4 border-t border-border/40 pt-4"><BarList data={m.topWords} pageSize={15} noun="palavras" onItemClick={(it) => setWordDrill(it.key)} /></div>
            </SectionCard>
            {m.topCurses && m.topCurses.length > 0 && (
              <SectionCard icon={<Flame size={16} />} title="Palavrões mais usados" hint="Quantas vezes cada palavrão apareceu (PT + EN)." right={<span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-400">{fmt(m.curseWords)} no total</span>}>
                <BarList data={m.topCurses} pageSize={12} noun="palavrões" color="#ef4444" lead={() => <Flame size={13} className="text-red-400" />} />
              </SectionCard>
            )}
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <SectionCard className="flex flex-col" icon={<Smile size={16} />} title="Emojis favoritos" right={<span className="text-xs text-muted-foreground">{fmt(m.topEmojis.length)}</span>}>
                <DataList items={m.topEmojis} pageSize={24} noun="emojis" wrap fill renderRow={(e) => (
                  <span key={e.key} className="inline-flex h-[72px] w-[70px] flex-col items-center justify-center gap-1 rounded-lg border border-border/50 bg-secondary/10 px-2" title={`${e.key} — ${fmt(e.value)}x`}>
                    <AppleEmoji char={e.key} size={30} />
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">{fmt(e.value)}</span>
                  </span>
                )} />
              </SectionCard>
              <SectionCard className="flex flex-col" icon={<Smile size={16} />} title="Emojis customizados" right={<span className="text-xs text-muted-foreground">{fmt(m.topCustomEmojis.length)}</span>}>
                <CustomEmojiGrid emojis={m.topCustomEmojis} />
              </SectionCard>
            </div>
            {m.longestMessage && <SectionCard icon={<Type size={16} />} title={`Mensagem mais longa (${fmt(m.longestMessage.length)} caracteres)`}><p className="rounded-lg border border-border/50 bg-secondary/10 p-3 text-sm italic text-foreground/80">"<EmojiText text={m.longestMessage.preview} size={15} />{m.longestMessage.length > 280 ? "…" : ""}"</p></SectionCard>}
            <div className="grid gap-3 sm:grid-cols-2"><StatCard icon={<Calendar size={12} />} label="Primeira mensagem" value={fmtDate(m.firstMessageAt)} /><StatCard icon={<Calendar size={12} />} label="Última mensagem" value={fmtDate(m.lastMessageAt)} /></div>
          </AnimatedSection>
        </TabsContent>

        <TabsContent value="activity" className="mt-5">
          <AnimatedSection>
            {!act.hasData ? (
              <div className="ga flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4"><AlertTriangle size={16} className="shrink-0 text-yellow-500" /><span className="text-sm text-yellow-400">Este pacote não contém dados de atividade/telemetria.</span></div>
            ) : (
              <>
                <SectionCard icon={<ActivityIcon size={16} />} title="O que você fez no Discord" hint="Contagens derivadas da telemetria (pasta Activity)."><ActivityGrid stats={act.stats} name={acc.displayName} /></SectionCard>
                {actMonthData.length > 1 && <SectionCard icon={<Calendar size={16} />} title="Eventos ao longo do tempo"><AreaTimeline data={actMonthData} color="var(--chart-2, #22c55e)" id="actMonth" /></SectionCard>}
                <SectionCard icon={<Gamepad2 size={16} />} title="Jogos mais jogados" hint="Tempo total detectado pelo Discord.">
                  {stats.games.length ? (<div className="grid gap-2 sm:grid-cols-2">{stats.games.map((g) => (<div key={g.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 p-2.5">{g.iconUrl ? <img src={g.iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Gamepad2 size={16} /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{/^\d+$/.test(g.name) ? `Aplicativo ${g.id.slice(-6)}` : g.name}</p><p className="text-[11px] text-muted-foreground">{humanMinutes(g.totalMinutes)}</p></div></div>))}</div>) : <EmptyRow text="Nenhum jogo detectado" />}
                </SectionCard>
                <SectionCard icon={<ActivityIcon size={16} />} title="Tudo o que você fez, em detalhe" hint="Cada tipo de ação registrada, em frases. Só ações com tradução aparecem." right={<span className="text-xs text-muted-foreground">{fmt(act.eventTypes.length)} tipos</span>}>
                  <EventSentenceList events={act.eventTypes} name={acc.displayName} />
                </SectionCard>
                <SectionCard icon={<Bot size={16} />} title="Seus bots / aplicativos" hint="Aplicativos de desenvolvedor da sua conta.">{stats.bots.length ? (<div className="grid gap-2 sm:grid-cols-2">{stats.bots.map((b) => (<div key={b.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 p-2.5">{b.iconUrl ? <img src={b.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot size={14} /></div>}<span className="flex-1 truncate text-sm text-foreground">{b.name}</span>{b.verified && <BadgeCheck size={13} className="text-primary" />}{b.public && <span className="rounded bg-secondary/40 px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">público</span>}</div>))}</div>) : <EmptyRow text="Nenhum aplicativo" />}</SectionCard>
              </>
            )}
          </AnimatedSection>
        </TabsContent>

        <TabsContent value="places" className="mt-5">
          <AnimatedSection>
            {!act.hasData ? <EmptyRow text="Sem dados de telemetria neste pacote" /> : (
              <>
                <div className="ga flex items-start gap-2.5 rounded-xl border border-border/50 bg-secondary/10 p-4"><Info size={15} className="mt-0.5 shrink-0 text-primary/70" /><p className="text-xs leading-relaxed text-muted-foreground">Os números contam <span className="font-medium text-foreground">eventos de telemetria</span> de cada local/dispositivo — <span className="font-medium text-foreground">não</span> são logins. Ex.: uma cidade com 277 mil eventos significa que você usou muito o Discord por lá. Para logins reais, veja abaixo.</p></div>
                <div className="grid gap-3 sm:grid-cols-2"><StatCard icon={<LogIn size={12} />} label="Logins bem-sucedidos" num={act.successfulLogins} accent hint="Número real de logins." /><StatCard icon={<Key size={12} />} label="Tentativas de login" num={act.attemptedLogins} /></div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <SectionCard icon={<Globe size={16} />} title="Países" hint="Eventos por país — quanto você usou o Discord em cada lugar." right={<span className="text-xs text-muted-foreground">{fmt(act.topCountries.length)}</span>}>
                    <BarList data={act.topCountries.map((d) => ({ key: countryName(d.key), value: d.value, code: d.key }))} noun="países" unit="" pageSize={10} lead={(it) => <Flag code={(it as KV & { code: string }).code} />} />
                  </SectionCard>
                  <SectionCard icon={<Globe size={16} />} title="Idiomas" hint="Idioma do app configurado em cada sessão." right={<span className="text-xs text-muted-foreground">{fmt(act.locales.length)}</span>}>
                    <BarList data={act.locales.map((d) => { const info = localeInfo(d.key); return { key: info.name, value: d.value, code: info.cc } })} noun="idiomas" unit="" pageSize={10} color="var(--chart-2, #22c55e)" lead={(it) => <Flag code={(it as KV & { code: string }).code} />} />
                  </SectionCard>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <SectionCard icon={<Monitor size={16} />} title="Sistemas operacionais"><Donut data={relabelKV(act.osBreakdown, osLabel)} /></SectionCard>
                  <SectionCard icon={<Monitor size={16} />} title="Navegadores / clientes"><Donut data={relabelKV(act.browserBreakdown, browserLabel)} /></SectionCard>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <SectionCard icon={<MapPin size={16} />} title="Cidades" right={<span className="text-xs text-muted-foreground">{fmt(act.topCities.length)}</span>}>
                    <BarList data={act.topCities} noun="cidades" unit="" pageSize={12} color="var(--chart-2, #22c55e)" />
                  </SectionCard>
                  <SectionCard icon={<Globe size={16} />} title="Provedores (ISP)" right={<span className="text-xs text-muted-foreground">{fmt(act.topISPs.length)}</span>}>
                    <BarList data={act.topISPs} noun="provedores" unit="" pageSize={12} />
                  </SectionCard>
                </div>
              </>
            )}
          </AnimatedSection>
        </TabsContent>

        <TabsContent value="servers" className="mt-5">
          <AnimatedSection>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={<Server size={12} />} label="Servidores no pacote" num={stats.servers.total} accent />
              <StatCard icon={<MessageSquare size={12} />} label="Msgs em servidores" num={stats.servers.list.reduce((s, x) => s + x.messages, 0)} />
              <StatCard icon={<Hash size={12} />} label="Canais de servidor" num={m.totalGuildChannels} />
            </div>
            <SectionCard icon={<Server size={16} />} title="Todos os servidores">
              <DataList items={stats.servers.list} pageSize={18} noun="servidores" search={(s) => s.name + " " + s.id} renderRow={(s, idx) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/10 p-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${idx < 3 ? MEDAL[idx] : "border-border bg-secondary/40 text-muted-foreground"}`}>{idx + 1}</div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{s.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{s.name}</p><p className="truncate text-[10px] text-muted-foreground">{s.id}</p></div>
                  <div className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-muted-foreground"><span className="flex items-center gap-1"><MessageSquare size={11} className="text-primary/60" />{fmt(s.messages)}</span><span className="flex items-center gap-1"><Hash size={11} className="text-primary/60" />{fmt(s.channels)}</span></div>
                </div>
              )} />
            </SectionCard>
          </AnimatedSection>
        </TabsContent>

        <TabsContent value="account" className="mt-5">
          <AnimatedSection>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Users size={12} />} label="Amigos" num={acc.friendsCount} accent />
              <StatCard icon={<ShieldBan size={12} />} label="Bloqueados" num={acc.blockedCount} />
              <StatCard icon={<UserPlus size={12} />} label="Pedidos pendentes" num={acc.pendingCount} />
              <StatCard icon={<Gem size={12} />} label="Orbs" num={acc.orbs} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <SectionCard icon={<Users size={16} />} title="Informações da conta" hint="Dados sensíveis vêm borrados — clique no olho para revelar.">
                <div className="space-y-2.5 text-sm">
                  <SecretRow icon={<Mail size={14} />} label="E-mail" value={acc.email} />
                  <SecretRow icon={<Phone size={14} />} label="Telefone" value={acc.phone} />
                  <SecretRow icon={<Fingerprint size={14} />} label="Último IP" value={acc.ip} mono />
                  <SecretRow icon={<Cake size={14} />} label="Nascimento" value={fmtBirthday(acc.dateOfBirth)} />
                  <InfoRow icon={<BadgeCheck size={14} />} label="Verificado" value={acc.verified ? "Sim" : "Não"} />
                  <InfoRow icon={<Crown size={14} />} label="Nitro" value={acc.hasNitro ? (acc.premiumUntil ? `Até ${fmtDate(acc.premiumUntil)}` : "Ativo") : "Não"} />
                  {acc.predictedAge && <InfoRow icon={<Cake size={14} />} label="Idade estimada" value={`~${acc.predictedAge}`} />}
                  <InfoRow icon={<Calendar size={14} />} label="Conta criada" value={`${fmtDate(acc.createdAt)} (${humanDuration(acc.accountAgeDays)})`} />
                  <InfoRow icon={<Server size={14} />} label="Config. de servidores" value={fmt(acc.guildSettingsCount)} />
                  <InfoRow icon={<LifeBuoy size={14} />} label="Tickets de suporte" value={fmt(acc.supportTickets)} />
                </div>
              </SectionCard>
              <div className="space-y-5">
                <SectionCard icon={<CreditCard size={16} />} title="Transações / gastos">{acc.payments ? (<div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-3"><span className="text-sm text-muted-foreground">Total gasto</span><span className="text-lg font-bold tabular-nums text-primary">{fmtMoney(acc.payments.totalSpent, acc.payments.currency)}<span className="ml-1 text-xs font-normal text-muted-foreground">({acc.payments.count}x)</span></span></div>) : <EmptyRow text="Nenhuma transação registrada" />}</SectionCard>
                <SectionCard icon={<Link2 size={16} />} title="Conexões" right={acc.connections.length ? <span className="text-xs text-muted-foreground">{fmt(acc.connections.length)}</span> : undefined}>{acc.connections.length ? (<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{acc.connections.map((c, i) => <ConnectionCard key={i} type={c.type} name={c.name} verified={c.verified} />)}</div>) : <EmptyRow text="Nenhuma conexão" />}</SectionCard>
                {(acc.badges.length > 0 || acc.flags.length > 0) && <SectionCard icon={<Sparkles size={16} />} title="Flags da conta" hint="Selos e flags da conta com os ícones oficiais do Discord."><div className="flex flex-wrap gap-1.5">{acc.badges.map((b) => (<Tooltip key={b.name}><TooltipTrigger asChild><span className="flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/20 px-2 py-1"><img src={b.url} alt={b.name} className="h-4 w-4" onError={(e) => { e.currentTarget.style.display = "none" }} /><span className="text-[11px] font-medium text-foreground">{b.name}</span></span></TooltipTrigger><TooltipContent side="top" className="text-xs">{b.name}</TooltipContent></Tooltip>))}{acc.flags.map((f) => <AccountFlag key={f} flag={f} />)}</div></SectionCard>}
              </div>
            </div>
          </AnimatedSection>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CustomEmojiGrid({ emojis }: { emojis: CustomEmojiStat[] }) {
  if (!emojis.length) return <EmptyRow text="Nenhum emoji customizado" />
  return (
    <DataList items={emojis} pageSize={24} noun="emojis" wrap fill search={(e) => e.name} renderRow={(e) => (
      <span key={e.id} className="inline-flex h-[72px] w-[70px] flex-col items-center justify-center gap-1 rounded-lg border border-border/50 bg-secondary/10 px-2" title={`:${e.name}: — ${fmt(e.value)}x`}>
        <img src={emojiUrl(e)} alt={e.name} className="h-7 w-7 shrink-0 object-contain" onError={(ev) => { ev.currentTarget.style.display = "none" }} />
        <span className="w-full truncate text-center text-[9px] leading-tight text-muted-foreground">{e.name}</span>
        <span className="text-[10px] font-semibold tabular-nums text-foreground">{fmt(e.value)}</span>
      </span>
    )} />
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (<div className="flex items-center gap-3 border-b border-border/40 pb-2.5 last:border-0 last:pb-0"><span className="text-muted-foreground">{icon}</span><span className="text-muted-foreground">{label}</span><span className="ml-auto max-w-[60%] truncate text-right font-medium text-foreground" title={value}>{value}</span></div>)
}
function SecretRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | null; mono?: boolean }) {
  return (<div className="flex items-center gap-3 border-b border-border/40 pb-2.5"><span className="text-muted-foreground">{icon}</span><span className="text-muted-foreground">{label}</span><span className="ml-auto text-right"><Secret value={value} mono={mono} /></span></div>)
}
