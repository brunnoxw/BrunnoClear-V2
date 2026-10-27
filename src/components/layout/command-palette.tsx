import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Command } from "cmdk"
import {
  LayoutDashboard, User, BarChart3, Trash2, Package, MessageSquare, PhoneOff,
  UserMinus, LogOut, Copy, Image, MoveRight, Timer, MicOff, VolumeX, Users,
  Anchor, Shield, Crosshair, PieChart, Archive, Radio, BellRing, Settings,
  ListTodo, Terminal, Gamepad2, Search, X,
} from "lucide-react"
import { ThemedIcon } from "@/components/themed-icon"
import { xpIconForRoute } from "@/lib/xp-icons"

interface PaletteItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  keywords?: string[]
}

interface PaletteGroup {
  heading: string
  items: PaletteItem[]
}

const GROUPS: PaletteGroup[] = [
  {
    heading: "Geral",
    items: [
      { label: "Visão Geral", href: "/", icon: LayoutDashboard, keywords: ["home", "inicio", "dashboard"] },
      { label: "Perfil", href: "/perfil", icon: User },
      { label: "Analytics", href: "/analytics", icon: BarChart3, keywords: ["estatisticas"] },
    ],
  },
  {
    heading: "Mensagens",
    items: [
      { label: "Limpar DM", href: "/limpar-dm", icon: Trash2 },
      { label: "Limpar DM dos Amigos", href: "/limpar-dm-amigos", icon: Trash2 },
      { label: "Limpar DMs Abertas", href: "/limpar-dms", icon: Trash2 },
      { label: "Limpar Package", href: "/limpar-package", icon: Package },
      { label: "Abrir DMs", href: "/abrir-dms", icon: MessageSquare },
      { label: "Fechar DMs", href: "/fechar-dms", icon: PhoneOff },
    ],
  },
  {
    heading: "Conta",
    items: [
      { label: "Remover Amigos", href: "/remover-amigos", icon: UserMinus },
      { label: "Sair de Servidores", href: "/sair-servidores", icon: LogOut },
    ],
  },
  {
    heading: "Servidores",
    items: [
      { label: "Clonar Servidor", href: "/clonar-servidor", icon: Copy },
      { label: "Scraper Ícones", href: "/scraper-icones", icon: Image },
    ],
  },
  {
    heading: "Call",
    items: [
      { label: "Desconectar Call", href: "/desconectar-call", icon: PhoneOff },
      { label: "Mover Call", href: "/mover-call", icon: MoveRight },
      { label: "Farm Call", href: "/farm-call", icon: Timer },
      { label: "Mutar Call", href: "/mutar-call", icon: MicOff },
      { label: "Ensurdecer Call", href: "/ensurdecer-call", icon: VolumeX },
      { label: "Listar Call", href: "/listar-call", icon: Users },
      { label: "Elevador", href: "/elevador", icon: MoveRight },
      { label: "Coleira", href: "/coleira", icon: Anchor },
      { label: "Proteger User", href: "/proteger-user", icon: Shield },
      { label: "Tormentar", href: "/tormentar", icon: Crosshair },
    ],
  },
  {
    heading: "Dados",
    items: [
      { label: "Análise de Package", href: "/analise-package", icon: PieChart },
      { label: "Backups", href: "/backups", icon: Archive },
    ],
  },
  {
    heading: "Monitoramento",
    items: [
      { label: "Dashboard de Monitoramento", href: "/monitoramento", icon: Radio },
      { label: "Alertas", href: "/alertas", icon: BellRing },
      { label: "Configuração de Monitoramento", href: "/monitoramento/config", icon: Settings },
    ],
  },
  {
    heading: "Sistema",
    items: [
      { label: "Tasks", href: "/tasks", icon: ListTodo },
      { label: "Prefix Commands", href: "/prefix-commands", icon: Terminal },
      { label: "Rich Presence", href: "/rpc", icon: Gamepad2 },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
]

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("open-command-palette", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command-palette", onOpen)
    }
  }, [])

  const go = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  if (!open) return null

  return (
    <div className="command-palette-overlay fixed inset-0 z-[9998] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <Command
        label="Command palette"
        loop
        className="command-palette-window relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl shadow-black/50 animate-in fade-in-0 zoom-in-95"
      >
        <div className="command-palette-titlebar theme-xp-only">
          <ThemedIcon name="run"><Search size={16} /></ThemedIcon>
          <span>Executar — BrunnoClear</span>
          <button type="button" data-window-action="close" onClick={() => setOpen(false)} aria-label="Fechar busca" title="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="command-palette-search flex items-center gap-2.5 border-b border-border px-4">
          <ThemedIcon name="search" className="text-muted-foreground"><Search size={16} /></ThemedIcon>
          <Command.Input
            autoFocus
            placeholder="Buscar páginas e ferramentas..."
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">ESC</kbd>
        </div>
        <Command.List className="max-h-[55vh] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            Nada encontrado.
          </Command.Empty>
          {GROUPS.map((group) => (
            <Command.Group
              key={group.heading}
              heading={group.heading}
              className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
            >
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-foreground"
                  >
                    <ThemedIcon name={xpIconForRoute(item.href)} className="text-muted-foreground"><Icon size={16} /></ThemedIcon>
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  )
}
