import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { usePonyTheme } from '@/hooks/use-pony-theme'

export function PonyAtmosphere() {
  const pony = usePonyTheme()
  if (!pony) return null

  return (
    <div className="pony-atmosphere" aria-hidden="true">
      <div className="pony-aura" />
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} className="pony-particle" style={{ '--i': index } as CSSProperties} />
      ))}
    </div>
  )
}

export function PonyCompanion() {
  const pony = usePonyTheme()
  if (!pony) return null

  return (
    <figure className="pony-companion" aria-label={`Tema de ${pony.nome}`}>
      <img src={pony.imagem} alt="" draggable={false} />
      <figcaption>
        <span className="pony-companion-caption">Seu universo</span>
        <strong className="pony-companion-name">{pony.nome}</strong>
        <Link to="/configuracoes?personalizar=ponei" className="pony-companion-change">Trocar pônei</Link>
      </figcaption>
    </figure>
  )
}
