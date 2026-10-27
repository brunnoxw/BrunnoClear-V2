

import { Link, useLocation } from "react-router-dom"
import { ChevronRight, Command, Home, Minus, Square, X } from "lucide-react"
import { ThemedIcon } from "@/components/themed-icon"

interface ItemBreadcrumb {
  titulo: string
  href: string
}

const mapaRotas: Record<string, string> = {
  "": "Visão Geral",
  "perfil": "Perfil",
  "tokens": "Tokens",
  "logs": "Logs",
  "limpar-dm": "Limpar DM",
  "limpar-dm-amigos": "Limpar DM dos Amigos",
  "limpar-dms": "Limpar DMs Abertas",
  "limpar-package": "Limpar Package",
  "analise-package": "Análise de Package",
  "remover-amigos": "Remover Amigos",
  "sair-servidores": "Sair de Servidores",
  "fechar-dms": "Fechar DMs",
  "abrir-dms": "Abrir DMs",
  "desconectar-call": "Desconectar Call",
  "mover-call": "Mover Call",
  "farm-call": "Farm Call",
  "mutar-call": "Mutar Call",
  "ensurdecer-call": "Ensurdecer Call",
  "listar-call": "Listar Call",
  "elevador": "Elevador",
  "coleira": "Coleira",
  "proteger-user": "Proteger User",
  "tormentar": "Tormentar",
  "silenciar-call": "Silenciar Call",
  "clonar-servidor": "Clonar Servidor",
  "server-info": "Server Info",
  "user-info": "User Info",
  "scraper-icones": "Scraper Ícones",
  "rich-presence": "Rich Presence",
  "rpc": "Rich Presence",
  "zaralho-nickname": "Zaralho Nickname",
  "analytics": "Analytics",
  "backups": "Backups",
  "monitoramento": "Monitoramento",
  "alertas": "Alertas",
  "config": "Configuração",
  "sessao": "Sessão",
  "calls": "Calls",
  "deletadas": "Mensagens Deletadas",
  "interacoes": "Interações",
  "mencoes": "Menções",
  "mensagens": "Mensagens",
  "midia": "Mídia",
  "tasks": "Tasks",
  "prefix-commands": "Prefix Commands",
  "configuracoes": "Configurações",
}

export function NavegacaoSuperior() {
  const caminhoAtual = useLocation().pathname
  const segmentos = caminhoAtual.split("/").filter(Boolean)

  const gerarBreadcrumbs = (): ItemBreadcrumb[] => {
    const breadcrumbs: ItemBreadcrumb[] = [
      { titulo: "Visão Geral", href: "/" }
    ]

    let caminhoAcumulado = ""
    segmentos.forEach((segmento, indice) => {
      caminhoAcumulado += `/${segmento}`
      // "u" é apenas parte da URL; o perfil é o ancestral navegável.
      if (segmentos[0] === "monitoramento" && indice === 1 && segmento === "u") return
      const titulo = segmentos[0] === "monitoramento" && segmentos[1] === "u" && indice === 2
        ? "Usuário"
        : mapaRotas[segmento] || segmento
      breadcrumbs.push({ titulo, href: caminhoAcumulado })
    })

    return breadcrumbs
  }

  const breadcrumbs = gerarBreadcrumbs()
  const paginaAtual = breadcrumbs[breadcrumbs.length - 1]?.titulo || "Visão Geral"

  return (
    <header
      className="app-header sticky top-0 z-30 grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:gap-6 lg:px-6"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/25 via-primary/5 to-transparent" />

      <nav aria-label="Navegação estrutural" className="app-breadcrumb min-w-0">
        <ol className="flex min-w-0 items-center gap-3">
          <li className="shrink-0">
            <Link
              to="/"
              aria-label="Ir para a visão geral"
              title="Visão Geral"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors hover:border-primary/30 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <ThemedIcon name="computer"><Home size={15} strokeWidth={1.8} /></ThemedIcon>
            </Link>
          </li>
          {breadcrumbs.slice(1, -1).map((item) => (
            <li key={item.href} className="hidden min-w-0 items-center gap-3 xl:flex">
              <ChevronRight size={12} className="shrink-0 text-muted-foreground/50" aria-hidden="true" />
              <Link
                to={item.href}
                title={item.titulo}
                className="truncate rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {item.titulo}
              </Link>
            </li>
          ))}
          <li className="flex min-w-0 items-center gap-3" aria-current="page">
            <ChevronRight size={12} className="shrink-0 text-muted-foreground/50" aria-hidden="true" />
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground lg:text-base" title={paginaAtual}>
              {paginaAtual}
            </h1>
          </li>
        </ol>
      </nav>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
        className="app-command-trigger flex h-8 items-center justify-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/20 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-48 lg:justify-start xl:w-64"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        aria-label="Buscar páginas e ações"
        aria-keyshortcuts="Control+k Meta+k"
        title="Buscar (Ctrl+K)"
      >
        <ThemedIcon name="run"><Command size={14} /></ThemedIcon>
        <span className="hidden lg:inline">Buscar no painel</span>
        <kbd aria-hidden="true" className="ml-auto hidden h-5 items-center rounded border border-border bg-background/80 px-1.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">Ctrl K</kbd>
      </button>

      <div className="flex items-center justify-self-end gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="app-connection-status flex h-7 items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-2.5" aria-label="Status: online">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary ring-[3px] ring-primary/10" aria-hidden="true" />
          <span className="hidden text-[11px] font-medium text-foreground/80 sm:inline">Online</span>
        </div>

        {typeof window !== 'undefined' && window.electronAPI && (
          <div className="app-window-controls flex items-center gap-1 border-l border-border pl-3" role="group" aria-label="Controles da janela">
            <button
              type="button"
              onClick={() => window.electronAPI?.window.minimize()}
              aria-label="Minimizar janela"
              data-window-action="minimize"
              title="Minimizar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => window.electronAPI?.window.maximize()}
              aria-label="Maximizar ou restaurar janela"
              data-window-action="maximize"
              title="Maximizar ou restaurar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Square size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => window.electronAPI?.window.close()}
              aria-label="Fechar janela"
              data-window-action="close"
              title="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
