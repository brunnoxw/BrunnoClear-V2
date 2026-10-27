'use client'

import { useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import type { AppSettings } from '@/types/api'
import { getTema, type ThemeDefinition } from '@/lib/themes'

const COR_PADRAO = '#ffffff'

function limparDetalhesTema() {
  const root = document.documentElement
  root.removeAttribute('data-theme-family')
  root.removeAttribute('data-pony')
  root.removeAttribute('data-pony-effect')
  for (const property of Array.from(root.style)) {
    if (property.startsWith('--pony-')) root.style.removeProperty(property)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function gerarVariantes(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  const { r, g, b } = rgb
  const suave = `#${Math.round(r * 0.7).toString(16).padStart(2, '0')}${Math.round(g * 0.7).toString(16).padStart(2, '0')}${Math.round(b * 0.7).toString(16).padStart(2, '0')}`
  const escuro = `#${Math.round(r * 0.27).toString(16).padStart(2, '0')}${Math.round(g * 0.27).toString(16).padStart(2, '0')}${Math.round(b * 0.27).toString(16).padStart(2, '0')}`
  return { principal: hex, suave, escuro }
}

export function aplicarCorPainel(cor: string) {
  const variantes = gerarVariantes(cor)
  if (!variantes) return

  const root = document.documentElement
  root.style.setProperty('--primary', variantes.principal)
  root.style.setProperty('--accent', variantes.principal)
  root.style.setProperty('--ring', variantes.principal)
  root.style.setProperty('--sidebar-primary', variantes.principal)
  root.style.setProperty('--sidebar-ring', variantes.principal)
  root.style.setProperty('--neon-verde', variantes.principal)
  root.style.setProperty('--neon-verde-suave', variantes.suave)
  root.style.setProperty('--neon-verde-escuro', variantes.escuro)
  root.style.setProperty('--chart-1', variantes.principal)
  root.style.setProperty('--chart-2', variantes.suave)
  root.style.setProperty('--chart-3', variantes.escuro)
}

export function aplicarTema(tema: ThemeDefinition) {
  const root = document.documentElement
  const c = tema.cores
  limparDetalhesTema()

  root.style.setProperty('--background', c.background)
  root.style.setProperty('--foreground', c.foreground)
  root.style.setProperty('--card', c.card)
  root.style.setProperty('--card-foreground', c.cardForeground)
  root.style.setProperty('--popover', c.popover)
  root.style.setProperty('--popover-foreground', c.popoverForeground)
  root.style.setProperty('--primary', c.primary)
  root.style.setProperty('--primary-foreground', c.primaryForeground)
  root.style.setProperty('--secondary', c.secondary)
  root.style.setProperty('--secondary-foreground', c.secondaryForeground)
  root.style.setProperty('--muted', c.muted)
  root.style.setProperty('--muted-foreground', c.mutedForeground)
  root.style.setProperty('--accent', c.accent)
  root.style.setProperty('--accent-foreground', c.accentForeground)
  root.style.setProperty('--destructive', c.destructive)
  root.style.setProperty('--destructive-foreground', c.destructiveForeground)
  root.style.setProperty('--border', c.border)
  root.style.setProperty('--input', c.input)
  root.style.setProperty('--ring', c.ring)

  root.style.setProperty('--sidebar', c.sidebar)
  root.style.setProperty('--sidebar-foreground', c.sidebarForeground)
  root.style.setProperty('--sidebar-primary', c.sidebarPrimary)
  root.style.setProperty('--sidebar-primary-foreground', c.sidebarPrimaryForeground)
  root.style.setProperty('--sidebar-accent', c.sidebarAccent)
  root.style.setProperty('--sidebar-accent-foreground', c.sidebarAccentForeground)
  root.style.setProperty('--sidebar-border', c.sidebarBorder)
  root.style.setProperty('--sidebar-ring', c.sidebarRing)

  const variantes = gerarVariantes(c.primary)
  if (variantes) {
    root.style.setProperty('--neon-verde', variantes.principal)
    root.style.setProperty('--neon-verde-suave', variantes.suave)
    root.style.setProperty('--neon-verde-escuro', variantes.escuro)
    root.style.setProperty('--chart-1', variantes.principal)
    root.style.setProperty('--chart-2', variantes.suave)
    root.style.setProperty('--chart-3', variantes.escuro)
  }

  if (tema.scrollbarTrack) {
    root.style.setProperty('--scrollbar-track', tema.scrollbarTrack)
    root.style.setProperty('--scrollbar-thumb', tema.scrollbarThumb ?? c.border)
    root.style.setProperty('--scrollbar-thumb-hover', tema.scrollbarThumbHover ?? c.muted)
  } else {
    root.style.removeProperty('--scrollbar-track')
    root.style.removeProperty('--scrollbar-thumb')
    root.style.removeProperty('--scrollbar-thumb-hover')
  }

  root.setAttribute('data-theme', tema.id)
  if (tema.family) root.setAttribute('data-theme-family', tema.family)
  if (tema.character) root.setAttribute('data-pony', tema.character)
  if (tema.effect) root.setAttribute('data-pony-effect', tema.effect)
  for (const [property, value] of Object.entries(tema.cssVars ?? {})) {
    if (property.startsWith('--pony-')) root.style.setProperty(property, value)
  }
  if (tema.backgroundImage) {
    root.style.setProperty('--theme-bg-image', `url(${tema.backgroundImage})`)
    root.style.setProperty('--theme-bg-opacity', String(tema.backgroundOpacity ?? 0.03))
    root.style.setProperty('--theme-bg-size', tema.backgroundSize ?? '200px')
    root.style.setProperty('--theme-bg-repeat', tema.backgroundRepeat ?? 'repeat')
    if (tema.backgroundMask) {
      root.style.setProperty('--theme-bg-mask', tema.backgroundMask)
    } else {
      root.style.removeProperty('--theme-bg-mask')
    }
  } else {
    root.style.removeProperty('--theme-bg-image')
    root.style.removeProperty('--theme-bg-size')
    root.style.removeProperty('--theme-bg-repeat')
    root.style.removeProperty('--theme-bg-mask')
    root.style.setProperty('--theme-bg-opacity', '0')
  }
}

export function resetarTema() {
  const root = document.documentElement
  limparDetalhesTema()
  root.setAttribute('data-theme', 'padrao')
  const props = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring',
    '--sidebar', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
    '--neon-verde', '--neon-verde-suave', '--neon-verde-escuro',
    '--chart-1', '--chart-2', '--chart-3',
    '--scrollbar-track', '--scrollbar-thumb', '--scrollbar-thumb-hover',
    '--theme-bg-image', '--theme-bg-size', '--theme-bg-repeat', '--theme-bg-mask',
  ]
  for (const p of props) root.style.removeProperty(p)
  root.style.setProperty('--theme-bg-opacity', '0')
}

const BLOOM_MAP: Record<string, string> = {
  desligado: '0',
  sutil: '0.06',
  normal: '0.12',
  intenso: '0.22',
}

const FONTE_MAP: Record<string, string> = {
  pequeno: '14px',
  normal: '16px',
  grande: '18px',
}

export function aplicarAparencia(aparencia: AppSettings['aparencia']) {
  const root = document.documentElement
  root.style.setProperty('--bloom-opacity', BLOOM_MAP[aparencia.bloomIntensidade] ?? '0.12')
  root.style.setProperty('--base-font-size', FONTE_MAP[aparencia.tamanhoFonte] ?? '16px')
  root.style.fontSize = FONTE_MAP[aparencia.tamanhoFonte] ?? '16px'
  root.setAttribute('data-card-style', aparencia.estiloCards)
  root.setAttribute('data-show-grid', aparencia.mostrarGrade ? 'true' : 'false')
}

export function useCorPainel() {
  const carregar = useCallback(async () => {
    try {
      const res = await api.getSettings()
      const settings = res.data as AppSettings
      const temaId = settings.tema || 'custom'

      if (temaId === 'custom' || temaId === 'padrao') {
        resetarTema()
        if (temaId === 'custom') {
          aplicarCorPainel(settings.corPainel || COR_PADRAO)
        }
      } else {
        const tema = getTema(temaId)
        if (tema) {
          aplicarTema(tema)
        } else {
          resetarTema()
          aplicarCorPainel(settings.corPainel || COR_PADRAO)
        }
      }

      if (settings.aparencia) {
        aplicarAparencia(settings.aparencia)
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])
}
