
import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Trash2,
  UserMinus,
  LogOut as LogOutIcon,
  Phone,
  PhoneOff,
  MoveRight,
  Timer,
  MicOff,
  VolumeX,
  Users,
  Anchor,
  Shield,
  Volume2,
  Copy,
  Info,
  UserSearch,
  Image,
  Gamepad2,
  Skull,
  Settings,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Terminal,
  Key,
  BarChart3,
  Archive,
  Package,
  User,
  MessageSquare,
  UserCog,
  Server,
  PhoneCall,
  Database,
  Wrench,
  ListTodo,
  Eye,
  Radio,
  Headphones,
  Crosshair,
  BellRing,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useTokens } from "@/hooks/use-tokens"
import { AddAccountModal } from "./add-account-modal"

interface ItemMenu {
  titulo: string
  icone: React.ReactNode
  href: string
}

interface SecaoMenu {
  titulo: string
  icone: React.ReactNode
  itens: ItemMenu[]
  defaultOpen?: boolean
  alwaysOpen?: boolean
}

const secoesMenu: SecaoMenu[] = [
  {
    titulo: "Geral",
    icone: <LayoutDashboard size={16} />,
    defaultOpen: true,
    alwaysOpen: true,
    itens: [
      { titulo: "Visão Geral", icone: <LayoutDashboard size={16} />, href: "/" },
      { titulo: "Perfil", icone: <User size={16} />, href: "/perfil" },
      { titulo: "Analytics", icone: <BarChart3 size={16} />, href: "/analytics" },
    ],
  },
  {
    titulo: "Mensagens",
    icone: <MessageSquare size={16} />,
    itens: [
      { titulo: "Limpar DM", icone: <Trash2 size={16} />, href: "/limpar-dm" },
      { titulo: "Limpar DM dos Amigos", icone: <Trash2 size={16} />, href: "/limpar-dm-amigos" },
      { titulo: "Limpar DMs Abertas", icone: <Trash2 size={16} />, href: "/limpar-dms" },
      { titulo: "Limpar Package", icone: <Package size={16} />, href: "/limpar-package" },
      { titulo: "Abrir DMs", icone: <MessageSquare size={16} />, href: "/abrir-dms" },
      { titulo: "Fechar DMs", icone: <PhoneOff size={16} />, href: "/fechar-dms" },
    ],
  },
  {
    titulo: "Conta",
    icone: <UserCog size={16} />,
    itens: [
      { titulo: "Remover Amigos", icone: <UserMinus size={16} />, href: "/remover-amigos" },
      { titulo: "Sair de Servidores", icone: <LogOutIcon size={16} />, href: "/sair-servidores" },
    ],
  },
  {
    titulo: "Servidores",
    icone: <Server size={16} />,
    itens: [
      { titulo: "Clonar Servidor", icone: <Copy size={16} />, href: "/clonar-servidor" },
      { titulo: "Scraper Ícones", icone: <Image size={16} />, href: "/scraper-icones" },
    ],
  },
  {
    titulo: "Call",
    icone: <PhoneCall size={16} />,
    itens: [
      { titulo: "Desconectar Call", icone: <PhoneOff size={16} />, href: "/desconectar-call" },
      { titulo: "Mover Call", icone: <MoveRight size={16} />, href: "/mover-call" },
      { titulo: "Farm Call", icone: <Timer size={16} />, href: "/farm-call" },
      { titulo: "Mutar Call", icone: <MicOff size={16} />, href: "/mutar-call" },
      { titulo: "Ensurdecer Call", icone: <VolumeX size={16} />, href: "/ensurdecer-call" },
      { titulo: "Listar Call", icone: <Users size={16} />, href: "/listar-call" },
      { titulo: "Elevador", icone: <MoveRight size={16} />, href: "/elevador" },
      { titulo: "Coleira", icone: <Anchor size={16} />, href: "/coleira" },
      { titulo: "Proteger User", icone: <Shield size={16} />, href: "/proteger-user" },
      { titulo: "Tormentar", icone: <Crosshair size={16} />, href: "/tormentar" },
    ],
  },
  {
    titulo: "Dados",
    icone: <Database size={16} />,
    itens: [
      { titulo: "Backups", icone: <Archive size={16} />, href: "/backups" },
    ],
  },
  {
    titulo: "Monitoramento",
    icone: <Eye size={16} />,
    itens: [
      { titulo: "Dashboard", icone: <Radio size={16} />, href: "/monitoramento" },
      { titulo: "Alertas", icone: <BellRing size={16} />, href: "/alertas" },
      { titulo: "Configuração", icone: <Settings size={16} />, href: "/monitoramento/config" },
    ],
  },
  {
    titulo: "Sistema",
    icone: <Wrench size={16} />,
    alwaysOpen: true,
    itens: [
      { titulo: "Tasks", icone: <ListTodo size={16} />, href: "/tasks" },
      { titulo: "Prefix Commands", icone: <Terminal size={16} />, href: "/prefix-commands" },
      { titulo: "Rich Presence", icone: <Gamepad2 size={16} />, href: "/rpc" },
      { titulo: "Configurações", icone: <Settings size={16} />, href: "/configuracoes" },
    ],
  },
]

function AppVersion() {
  const [version, setVersion] = useState(import.meta.env.VITE_APP_VERSION || '...')
  useEffect(() => {
    window.electronAPI?.updater?.getVersion?.().then((v: string) => {
      if (v) setVersion(v)
    }).catch(() => {})
  }, [])
  return (
    <span className="text-[10px] font-medium leading-none text-primary/60">
      v{version}
    </span>
  )
}

export function Sidebar() {
  const caminhoAtual = useLocation().pathname
  const { tokens, activeTokenId, switchAccount, connecting, switchCooldownRemaining, removeToken, refetch } = useTokens()
  const [contasAbertas, setContasAbertas] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const contasRef = useRef<HTMLDivElement>(null)

  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const secao of secoesMenu) {
      if (secao.defaultOpen) {
        initial[secao.titulo] = true
      }
    }
    return initial
  })

  const secaoAtiva = secoesMenu.find((s) => s.itens.some((i) => i.href === caminhoAtual))
  if (secaoAtiva && !secoesAbertas[secaoAtiva.titulo]) {
    secoesAbertas[secaoAtiva.titulo] = true
  }

  const toggleSecao = (titulo: string) => {
    setSecoesAbertas((prev) => ({ ...prev, [titulo]: !prev[titulo] }))
  }

  const contaAtiva = tokens.find((t) => t.id === activeTokenId) || tokens[0]

  const outrasContas = tokens.filter((t) => t.id !== activeTokenId)

  const switchOnCooldown = switchCooldownRemaining > 0
  const cooldownSeconds = Math.ceil(switchCooldownRemaining / 1000)

  const [contextMenu, setContextMenu] = useState<{ tokenId: string; x: number; y: number } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, tokenId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ tokenId, x: e.clientX, y: e.clientY })
  }, [])

  const handleRemoverConta = useCallback(async () => {
    if (!contextMenu) return
    const id = contextMenu.tokenId
    setContextMenu(null)
    await removeToken(id)
    if (outrasContas.length <= 1) {
      setContasAbertas(false)
    }
  }, [contextMenu, removeToken, outrasContas.length])

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    window.addEventListener('contextmenu', handleClick)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('contextmenu', handleClick)
    }
  }, [contextMenu])

  const trocarConta = async (tokenId: string) => {
    const target = tokens.find((t) => t.id === tokenId)
    setContasAbertas(false)
    try {
      await switchAccount(tokenId)
      if (target) {
        window.electronAPI?.notification.show({
          title: "BrunnoClear",
          body: `Logado como ${target.user?.global_name || target.user?.username || target.label}`,
          icon: target.avatarUrl || undefined,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.startsWith('Aguarde')) {
        window.electronAPI?.notification.show({
          title: "BrunnoClear",
          body: msg,
        })
      } else if (target) {
        window.electronAPI?.notification.show({
          title: "BrunnoClear",
          body: `Falha ao conectar em ${target.user?.global_name || target.user?.username || target.label}`,
        })
      }
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-sm" />
            <img
              src="/icon.png"
              alt="BrunnoClear"
              className="relative h-9 w-9 rounded-xl ring-1 ring-border"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-bold leading-none tracking-tight text-foreground">
              BrunnoClear
            </span>
            <AppVersion />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {secoesMenu.map((secao) => {
            const aberta = secao.alwaysOpen || !!secoesAbertas[secao.titulo]
            return (
              <div key={secao.titulo}>
                {secao.alwaysOpen ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground">
                    <span className="text-muted-foreground/70">{secao.icone}</span>
                    <span>{secao.titulo}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleSecao(secao.titulo)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  >
                    <span className="text-muted-foreground/70">{secao.icone}</span>
                    <span className="flex-1 text-left">{secao.titulo}</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        !aberta && "-rotate-90"
                      )}
                    />
                  </button>
                )}
                <div
                  className={secao.alwaysOpen ? undefined : "overflow-hidden transition-all duration-200"}
                  style={secao.alwaysOpen ? undefined : {
                    maxHeight: aberta ? `${secao.itens.length * 44}px` : '0px',
                    opacity: aberta ? 1 : 0,
                  }}
                >
                  <ul className="space-y-0.5 py-1 pl-2">
                    {secao.itens.map((item) => {
                      const estaAtivo = caminhoAtual === item.href
                      return (
                        <li key={item.titulo}>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                              estaAtivo
                                ? "bg-primary/10 text-primary borda-neon"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                          >
                            <span className={cn(estaAtivo && "text-primary")}>
                              {item.icone}
                            </span>
                            <span className="flex-1">{item.titulo}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          {contaAtiva ? (
            <div>
              <div
                ref={contasRef}
                style={{
                  height: contasAbertas ? 'auto' : 0,
                  opacity: contasAbertas ? 1 : 0,
                  transition: 'opacity 150ms ease-out',
                  overflow: 'hidden',
                }}
              >
                <div className="mb-1.5 rounded-xl bg-secondary/30 p-1.5">
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 shrink-0">
                      <Plus size={14} />
                    </div>
                    <span className="text-[13px]">Adicionar conta</span>
                  </button>

                  {outrasContas.length > 0 && (
                    <div className="space-y-0.5 mt-0.5">
                      {outrasContas.map((token) => (
                        <button
                          key={token.id}
                          onClick={() => trocarConta(token.id)}
                          onContextMenu={(e) => handleContextMenu(e, token.id)}
                          disabled={connecting || switchOnCooldown}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all hover:bg-secondary/80 disabled:opacity-50"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={token.avatarUrl} alt={token.label} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {token.label.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start flex-1 min-w-0">
                            <div className="flex items-center gap-1 w-full">
                              <span className="text-[13px] truncate text-left text-foreground/80">
                                {token.user?.global_name || token.user?.username || token.label}
                              </span>
                              {token.badges && token.badges.length > 0 && (
                                <div className="flex items-center gap-px shrink-0">
                                  {token.badges.map((badge) => (
                                    <Tooltip key={badge.name}>
                                      <TooltipTrigger asChild>
                                        <img src={badge.url} alt={badge.tooltip} className="h-3.5 w-3.5" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">{badge.tooltip}</TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              )}
                            </div>
                            {token.user?.username && token.user?.global_name && (
                              <span className="text-[10px] text-muted-foreground truncate w-full text-left">
                                {token.user.username}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setContasAbertas(!contasAbertas)}
                onContextMenu={(e) => handleContextMenu(e, contaAtiva.id)}
                className="group flex w-full items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-secondary/60"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                    <AvatarImage src={contaAtiva.avatarUrl} alt={contaAtiva.label} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {contaAtiva.label.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar",
                    contaAtiva.status === "valid" ? "bg-emerald-500" : contaAtiva.status === "checking" ? "bg-yellow-500" : "bg-red-500"
                  )} />
                </div>
                <div className="flex flex-1 flex-col items-start min-w-0">
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-sm font-semibold text-foreground truncate text-left">
                      {contaAtiva.user?.global_name || contaAtiva.user?.username || contaAtiva.label}
                    </span>
                    {contaAtiva.badges && contaAtiva.badges.length > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {contaAtiva.badges.map((badge) => (
                          <Tooltip key={badge.name}>
                            <TooltipTrigger asChild>
                              <img src={badge.url} alt={badge.tooltip} className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{badge.tooltip}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {connecting ? "Conectando..." : switchOnCooldown ? `Aguarde ${cooldownSeconds}s` : contaAtiva.status === "valid" ? "Conectada" : contaAtiva.status === "checking" ? "Verificando..." : "Inválida"}
                  </span>
                </div>
                <ChevronUp size={16} className={cn(
                  "text-muted-foreground shrink-0 transition-transform duration-200",
                  contasAbertas && "rotate-180"
                )} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border">
                <Plus size={14} />
              </div>
              <span className="text-sm">Adicionar conta</span>
            </button>
          )}
        </div>
      </aside>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleRemoverConta}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Remover conta
          </button>
        </div>
      )}

      <AddAccountModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={() => refetch()}
      />
    </>
  )
}
