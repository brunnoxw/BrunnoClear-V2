import { useState, useEffect, useCallback } from "react"
import { X, Sparkles, Bug, Zap, Wrench, ExternalLink, Heart } from "lucide-react"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

const GITHUB_OWNER = "brunnoxw"
const GITHUB_REPO = "BrunnoClear-V2"
const STORAGE_KEY = "changelog-versao-vista"
const FORCE_PREVIEW = import.meta.env.VITE_FORCE_CHANGELOG === '1'

interface ReleaseNote {
  version: string
  title: string
  body: string
  publishedAt: string
  url: string
}

/**
 * Busca as release notes da versão atual via GitHub API (público)
 */
async function fetchReleaseNotes(version: string): Promise<ReleaseNote | null> {
  try {
    const tag = version.startsWith("v") ? version : `v${version}`
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${tag}`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return parseRelease(data)
  } catch {
    return null
  }
}

async function fetchLatestRelease(): Promise<ReleaseNote | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return parseRelease(data)
  } catch {
    return null
  }
}

function parseRelease(data: any): ReleaseNote {
  return {
    version: data.tag_name?.replace(/^v/, "") ?? "?",
    title: data.name ?? `Versão ${data.tag_name ?? "?"}`,
    body: data.body ?? "",
    publishedAt: data.published_at ?? "",
    url: data.html_url ?? "",
  }
}

type SectionType = "new" | "fix" | "improvement" | "other"

interface ChangeSection {
  type: SectionType
  items: string[]
}

const sectionConfig: Record<SectionType, { icon: typeof Sparkles; label: string; color: string; bg: string; badge: string }> = {
  new:         { icon: Sparkles, label: "Novidades",  color: "text-emerald-400", bg: "bg-emerald-500/15 ring-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-400" },
  fix:         { icon: Bug,      label: "Correções",  color: "text-amber-400",   bg: "bg-amber-500/15 ring-amber-500/30",   badge: "bg-amber-500/20 text-amber-400" },
  improvement: { icon: Zap,      label: "Melhorias",  color: "text-blue-400",    bg: "bg-blue-500/15 ring-blue-500/30",     badge: "bg-blue-500/20 text-blue-400" },
  other:       { icon: Wrench,   label: "Outros",     color: "text-zinc-400",    bg: "bg-zinc-500/15 ring-zinc-500/30",     badge: "bg-zinc-500/20 text-zinc-400" },
}

function detectSectionType(heading: string): SectionType {
  const h = heading.toLowerCase()
  if (/novidade|new|feat|✨/.test(h)) return "new"
  if (/corre[çc]|fix|bug|🐛/.test(h)) return "fix"
  if (/melhori|improv|otimiz|perf|⚡/.test(h)) return "improvement"
  return "other"
}

function categorizeLineAuto(line: string): SectionType {
  const l = line.toLowerCase()
  if (/\bnov[oa]\b|feat|adicion|criado|implementa|novo /i.test(l)) return "new"
  if (/\bfix\b|corrig|bug|resolv|ajust/i.test(l)) return "fix"
  if (/\bmelhori|improv|otimiz|refator|atualiz|performance/i.test(l)) return "improvement"
  return "other"
}

function parseBody(body: string): ChangeSection[] {
  const lines = body.split("\n")
  const sections: ChangeSection[] = []
  let currentType: SectionType | null = null

  const isNoise = (l: string) =>
    /^\*?\*?full changelog\*?\*?/i.test(l.trim()) ||
    /^https?:\/\/github\.com\/.+\/compare\//i.test(l.trim()) ||
    /^## what's changed/i.test(l.trim()) ||
    /^## new contributors/i.test(l.trim()) ||
    /^\* .+ made their first contribution/i.test(l.trim())

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || isNoise(line)) continue

    const headingMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headingMatch) {
      currentType = detectSectionType(headingMatch[1])
      if (!sections.find((s) => s.type === currentType)) {
        sections.push({ type: currentType, items: [] })
      }
      continue
    }

    const itemMatch = line.match(/^[-*•]\s+(.+)/)
    if (itemMatch) {
      const text = itemMatch[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/ by @\S+ in .+$/i, "")
        .trim()

      if (!text) continue

      if (currentType) {
        const section = sections.find((s) => s.type === currentType)
        section?.items.push(text)
      } else {
        const autoType = categorizeLineAuto(text)
        let section = sections.find((s) => s.type === autoType)
        if (!section) {
          section = { type: autoType, items: [] }
          sections.push(section)
        }
        section.items.push(text)
      }
      continue
    }

    if (line.length > 5 && !line.startsWith("#")) {
      const cleaned = line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim()
      if (cleaned && !isNoise(cleaned)) {
        const autoType = currentType ?? categorizeLineAuto(cleaned)
        let section = sections.find((s) => s.type === autoType)
        if (!section) {
          section = { type: autoType, items: [] }
          sections.push(section)
        }
        section.items.push(cleaned)
      }
    }
  }

  const order: SectionType[] = ["new", "fix", "improvement", "other"]
  sections.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  return sections.filter((s) => s.items.length > 0)
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (/^`[^`]+`$/.test(part)) return <code key={i} className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })
}


export function WhatsNew() {
  const [release, setRelease] = useState<ReleaseNote | null>(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const electronAPI = window.electronAPI
      let version: string | null = null
      let notes: ReleaseNote | null = null

      console.log('[WhatsNew] Iniciando check...', { hasElectronAPI: !!electronAPI, hasGetReleaseNotes: !!electronAPI?.updater?.getReleaseNotes })

      if (electronAPI?.updater?.getReleaseNotes) {
        try {
          version = (await electronAPI.app.getVersion()) ?? null
        } catch {}
        console.log('[WhatsNew] Versão Electron:', version)
        if (!version || cancelled) return

        const lastSeen = localStorage.getItem(STORAGE_KEY)
        console.log('[WhatsNew] Última versão vista:', lastSeen, 'force:', FORCE_PREVIEW)
        if (!FORCE_PREVIEW && lastSeen === version) {
          console.log('[WhatsNew] Já viu esta versão, saindo.')
          return
        }

        console.log('[WhatsNew] Buscando release notes via IPC...')
        const data = await electronAPI.updater.getReleaseNotes(version)
        console.log('[WhatsNew] Resposta IPC:', JSON.stringify(data, null, 2))
        if (data && data.body) {
          notes = {
            version: data.version?.replace(/^v/, "") ?? version,
            title: data.name ?? `Versão ${version}`,
            body: data.body,
            publishedAt: data.published_at ?? "",
            url: data.html_url ?? "",
          }
        } else {
          console.log('[WhatsNew] IPC retornou body vazio/null. Tentando fetch direto da latest...')
          try {
            const latestRes = await fetch(
              `https://api.github.com/repos/brunnoxw/BrunnoClear-V2/releases`,
              { headers: { Accept: "application/vnd.github.v3+json" } }
            )
            if (latestRes.ok) {
              const releases: any[] = await latestRes.json()
              const withBody = releases.find((r: any) => r.body && r.body.trim().length > 0)
              if (withBody) {
                console.log('[WhatsNew] Encontrada release com body:', withBody.tag_name)
                notes = parseRelease(withBody)
                notes.version = version
              }
            }
          } catch (e) {
            console.log('[WhatsNew] Fallback fetch falhou:', e)
          }
        }
      } else {
        console.log('[WhatsNew] Sem Electron, tentando fetch público...')
        notes = await fetchLatestRelease()
        console.log('[WhatsNew] Resultado fetch público:', notes)
        if (notes) version = notes.version
        if (!version || cancelled) return

        const lastSeen = localStorage.getItem(STORAGE_KEY)
        if (!FORCE_PREVIEW && lastSeen === version) return
      }
      if (cancelled) return

      if (notes && notes.body.trim().length > 0) {
        const sections = parseBody(notes.body)
        if (sections.length > 0) {
          console.log('[WhatsNew] Exibindo changelog!', notes.title, sections)
          setRelease(notes)
          setVisible(true)
        } else {
          console.log('[WhatsNew] Body existente mas sem itens parseáveis.')
        }
      } else {
        console.log('[WhatsNew] Nenhuma release note encontrada, tentará novamente depois.')
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  const dismiss = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      setClosing(false)
      if (release && !FORCE_PREVIEW) {
        localStorage.setItem(STORAGE_KEY, release.version)
      }
    }, 300)
  }, [release])

  if (!visible || !release) return null

  const sections = parseBody(release.body)
  const formattedDate = release.publishedAt
    ? new Date(release.publishedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null
  const totalChanges = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" onClick={dismiss} />

      <div
        className={`relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/50 transition-all duration-300 ${
          closing ? "translate-y-6 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
        <div className="relative flex shrink-0 items-center gap-4 border-b border-border bg-primary/5 px-6 py-4">
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Novidades</p>
            <h2 className="text-xl font-black tracking-tight text-foreground">Versão {release.version}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {formattedDate && <span>{formattedDate}</span>}
              <span className="text-border">•</span>
              <span>{totalChanges} alteraç{totalChanges === 1 ? "ão" : "ões"}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid items-start gap-2.5 sm:grid-cols-2">
            {sections.map((section) => {
              const config = sectionConfig[section.type]
              const Icon = config.icon
              return (
                <div key={section.type} className="overflow-hidden rounded-lg border border-border bg-secondary/20">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 ${config.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${config.color}`}>
                      {config.label}
                    </span>
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${config.badge}`}>
                      {section.items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5">
                        <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current ${config.color}`} />
                        <span className="text-[13px] leading-relaxed text-muted-foreground [&_strong]:text-foreground">{renderInline(item)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-secondary/10 px-4 py-3">
          <span className="mr-0.5 flex items-center gap-1 text-xs font-semibold text-foreground">
            <Heart className="h-3.5 w-3.5 fill-current text-rose-500" /> Siga meu criador:
          </span>
          <button
            onClick={() => window.electronAPI?.shell.openExternal("https://www.tiktok.com/@brunnoxw")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            style={{ background: "#010101" }}
          >
            <TikTokIcon className="h-3.5 w-3.5" /> TikTok
          </button>
          <button
            onClick={() => window.electronAPI?.shell.openExternal("https://www.instagram.com/brunno.xw/")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            style={{ background: "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)" }}
          >
            <InstagramIcon className="h-3.5 w-3.5" /> Instagram
          </button>

          <button
            onClick={() => window.electronAPI?.shell.openExternal(release.url)}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> GitHub
          </button>
          <button
            onClick={dismiss}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.97]"
          >
            Entendi!
          </button>
        </div>
      </div>
    </div>
  )
}
