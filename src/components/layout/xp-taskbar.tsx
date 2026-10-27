import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function isXpTheme() {
  return document.documentElement.dataset.theme === 'windows-xp'
}

function Taskbar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <footer className="xp-taskbar" aria-label="Barra de tarefas">
      <button
        type="button"
        className="xp-start-button"
        aria-label="Iniciar: buscar páginas e ferramentas"
        aria-keyshortcuts="Control+k Meta+k"
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      >
        <img src="/themes/windows-xp/windows.png" width={28} height={20} alt="" draggable={false} />
        <span>iniciar</span>
      </button>
      <Link to="/" className="xp-taskbar-app" title="Abrir Visão Geral">
        <img src="/themes/windows-xp/computer.png" width={18} height={18} alt="" draggable={false} />
        <span>BrunnoClear</span>
      </Link>
      <div className="xp-tray">
        <Link to="/configuracoes" aria-label="Abrir configurações" title="Configurações">
          <img src="/themes/windows-xp/settings.png" width={16} height={16} alt="" draggable={false} />
        </Link>
        <time dateTime={now.toISOString()} title={now.toLocaleDateString('pt-BR', { dateStyle: 'full' })}>
          {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </footer>
  )
}

export function XpTaskbar() {
  const active = useSyncExternalStore(subscribeToTheme, isXpTheme, () => false)
  return active ? <Taskbar /> : null
}
