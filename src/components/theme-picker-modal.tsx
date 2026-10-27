import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Heart, Paintbrush, Palette, Search, Sparkles, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TEMAS, getTema, type ThemeDefinition } from '@/lib/themes'
import { PONEIS, getPony, getPonyTheme, type PonyCharacter } from '@/lib/pony-themes'
import { ColorPicker } from '@/components/ui/color-picker'

const COLOR_PRESETS = ['#ffffff', '#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#3b82f6', '#f43f5e']
const CHARACTER_THEMES = new Set(['hello-kitty', 'kuromi', 'spongebob', 'my-little-pony'])
const LIGHT_THEMES = new Set(['windows-xp', 'brunno', 'manga', 'neo-brutalism', 'spongebob'])
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

interface ThemePickerModalProps {
  tema: string
  corPainel: string
  onSelectTema: (temaId: string) => void
  onSelectCor: (cor: string) => void
}

function Swatches({ colors }: { colors: string[] }) {
  return <span className="gallery-swatches" aria-hidden="true">{colors.map((color, index) => <i key={index} style={{ background: color }} />)}</span>
}

function MiniPreview({ theme, cor }: { theme?: ThemeDefinition; cor?: string }) {
  const pony = theme?.character ? getPony(theme.character) : undefined
  const isXp = theme?.id === 'windows-xp'
  const primary = cor ?? theme?.cores.primary ?? '#c9a7ff'
  const background = theme?.cores.background ?? '#101014'
  const card = theme?.cores.card ?? '#1e1c28'
  const style = {
    '--preview-bg': background,
    '--preview-card': card,
    '--preview-sidebar': theme?.cores.sidebar ?? '#19171e',
    '--preview-primary': primary,
    '--preview-border': theme?.cores.border ?? '#33303e',
    '--preview-text': theme?.cores.foreground ?? '#eee8ff',
    ...(isXp ? { backgroundImage: "url('/themes/windows-xp/bliss.jpg')" } : {}),
  } as CSSProperties
  return (
    <div className={`gallery-mini-preview ${isXp ? 'is-xp' : ''} ${pony ? 'is-pony' : ''}`} style={style} aria-hidden="true">
      <div className="preview-shell">
        <div className="preview-nav"><span /><i /><i /><i /><i /></div>
        <div className="preview-workspace">
          <div className="preview-top"><i /><span /><b /></div>
          <div className="preview-heading" />
          <div className="preview-panels"><div><i /><b /></div><div><i /><b /></div></div>
          <div className="preview-line" /><div className="preview-line short" />
        </div>
      </div>
      {pony && <img className="preview-character" src={pony.imagem} alt="" draggable={false} />}
      {isXp && <div className="preview-taskbar"><span /></div>}
    </div>
  )
}

function PonyPortrait({ pony, className = '' }: { pony: PonyCharacter; className?: string }) {
  return <img className={className} src={pony.imagem} alt="" draggable={false} />
}

export function ThemePickerModal({ tema, corPainel, onSelectTema, onSelectCor }: ThemePickerModalProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState<'themes' | 'ponies'>('themes')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [ponyQuery, setPonyQuery] = useState('')
  const [ponyGroup, setPonyGroup] = useState('Todos')
  const [draftPony, setDraftPony] = useState(PONEIS[0].id)
  const [hexDraft, setHexDraft] = useState(corPainel)
  const searchRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const activeTheme = getTema(tema)
  const activePony = getPony(tema)
  const selectedPony = getPony(draftPony) ?? PONEIS[0]
  const selectedTheme = getPonyTheme(selectedPony.id)!
  const currentLabel = activePony ? `My Little Pony · ${activePony.nome}` : tema === 'custom' ? 'Sua cor' : activeTheme?.nome ?? 'Padrão'

  useEffect(() => setHexDraft(corPainel), [corPainel])
  useEffect(() => { if (open) searchRef.current?.focus() }, [page, open])
  useEffect(() => {
    if (searchParams.get('personalizar') !== 'ponei') return
    setDraftPony(getPony(tema)?.id ?? PONEIS[0].id)
    setPonyQuery('')
    setPonyGroup('Todos')
    setPage('ponies')
    setOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('personalizar')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, tema])

  function showPonies() {
    setDraftPony(activePony?.id ?? PONEIS[0].id)
    setPonyQuery('')
    setPonyGroup('Todos')
    setPage('ponies')
  }

  const visibleThemes = TEMAS.filter(theme => {
    const matchesFilter = filter === 'Todos' || (filter === 'Personagens' && CHARACTER_THEMES.has(theme.id)) || (filter === 'Claros' && LIGHT_THEMES.has(theme.id)) || (filter === 'Escuros' && !LIGHT_THEMES.has(theme.id) && theme.id !== 'my-little-pony')
    return matchesFilter && normalize(`${theme.nome} ${theme.descricao}`).includes(normalize(query))
  })
  const visiblePonies = PONEIS.filter(pony => (ponyGroup === 'Todos' || pony.grupo === ponyGroup) && normalize(`${pony.nome} ${pony.elemento} ${pony.motivo}`).includes(normalize(ponyQuery)))
  const showCustom = filter === 'Todos' && (!query || normalize('sua cor custom personalizado').includes(normalize(query)))
  const ponyStyle = {
    '--chosen-bg': selectedTheme.cores.background,
    '--chosen-card': selectedTheme.cores.card,
    '--chosen-text': selectedTheme.cores.foreground,
    '--chosen-muted': selectedTheme.cores.mutedForeground,
    '--chosen-accent': selectedTheme.cores.primary,
    '--chosen-on-accent': selectedTheme.cores.primaryForeground,
    '--chosen-border': selectedTheme.cores.border,
    '--chosen-aura': selectedPony.cores[0],
    '--chosen-symbol': selectedTheme.cssVars?.['--pony-symbol'],
  } as CSSProperties

  return (
    <>
      <button ref={triggerRef} type="button" className="theme-gallery-trigger" aria-label={`Escolher tema, atual: ${currentLabel}`} onClick={() => { setPage('themes'); setQuery(''); setFilter('Todos'); setOpen(true) }}>
        <span className="theme-trigger-preview"><MiniPreview theme={activeTheme} cor={tema === 'custom' ? corPainel : undefined} /></span>
        <span className="theme-trigger-copy"><small>SEU ESTILO, SEU PAINEL</small><strong>{currentLabel}</strong><span>{activePony ? `${activePony.elemento} · Troque de personagem quando quiser` : activeTheme?.descricao ?? 'Uma paleta criada por você'}</span></span>
        <span className="theme-trigger-action"><Palette size={16} /><span>Explorar temas</span><ChevronRight size={15} /></span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={`theme-gallery-dialog ${page === 'ponies' ? 'pony-picker-window' : 'theme-picker-window'}`}
          onOpenAutoFocus={event => { event.preventDefault(); searchRef.current?.focus() }}
          onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }}
        >
          <div className="gallery-header">
            <div className="gallery-heading">
              {page === 'ponies' ? <button type="button" className="gallery-back" data-pony-back aria-label="Voltar aos temas" onClick={() => setPage('themes')}><ArrowLeft size={18} /></button> : <span className="gallery-heading-icon"><Palette size={20} /></span>}
              <div><span className="gallery-eyebrow">{page === 'ponies' ? 'MY LITTLE PONY · FRIENDSHIP IS MAGIC' : 'PERSONALIZAÇÃO'}</span><DialogTitle>{page === 'ponies' ? 'Encontre a sua magia.' : 'Um painel com a sua cara.'}</DialogTitle><DialogDescription>{page === 'ponies' ? `${PONEIS.length} personagens. Cores, detalhes e um universo para cada um.` : 'Explore as coleções e encontre o seu próximo visual favorito.'}</DialogDescription></div>
            </div>
            <button type="button" className="gallery-close" data-window-action="close" aria-label="Fechar seletor de temas" onClick={() => setOpen(false)}><X size={20} /></button>
          </div>

          {page === 'themes' ? <>
            <div className="gallery-toolbar">
              <label className="gallery-search"><Search size={16} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar um tema..." aria-label="Buscar temas" /></label>
              <div className="gallery-filters" aria-label="Filtrar temas">{['Todos', 'Personagens', 'Escuros', 'Claros'].map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
            </div>
            <div className="gallery-scroll">
              {visibleThemes.some(theme => theme.id === 'my-little-pony') && <button type="button" className="pony-collection-card" data-theme-option="my-little-pony" onClick={showPonies}>
                <span className="collection-copy"><span className="collection-tag"><Sparkles size={12} /> UMA COLEÇÃO, {PONEIS.length} UNIVERSOS</span><strong>My Little Pony</strong><span>A amizade transforma tudo.<br />Até o seu painel.</span><b>Escolher meu pônei <ArrowUpRight size={17} /></b></span>
                <span className="collection-art" aria-hidden="true"><i /><PonyPortrait pony={PONEIS[1]} className="collection-rainbow" /><PonyPortrait pony={PONEIS[2]} className="collection-pinkie" /><PonyPortrait pony={PONEIS[0]} className="collection-twilight" /><Sparkles className="collection-star" /></span>
              </button>}
              <div className="gallery-section-label"><span>{query ? 'Resultados da busca' : 'Explore os temas'}</span><span>{visibleThemes.filter(t => t.id !== 'my-little-pony').length + Number(showCustom)} opções</span></div>
              <div className="theme-gallery-grid">
                {visibleThemes.filter(theme => theme.id !== 'my-little-pony').map(theme => <button key={theme.id} type="button" className="gallery-theme-card" data-theme-option={theme.id} aria-pressed={tema === theme.id} onClick={() => onSelectTema(theme.id)}>
                  <div className="gallery-theme-preview"><MiniPreview theme={theme} />{tema === theme.id && <span className="gallery-selected"><Check size={11} /> Em uso</span>}</div>
                  <div className="gallery-theme-description"><span><strong>{theme.nome}</strong><Swatches colors={theme.previewColors} /></span><p>{theme.descricao}</p></div>
                </button>)}
                {showCustom && <button type="button" className="gallery-theme-card custom-theme-card" data-theme-option="custom" aria-pressed={tema === 'custom'} onClick={() => onSelectTema('custom')}>
                  <div className="custom-theme-preview"><span style={{ background: corPainel }} /><Paintbrush size={26} />{tema === 'custom' && <span className="gallery-selected"><Check size={11} /> Em uso</span>}</div>
                  <div className="gallery-theme-description"><span><strong>Sua cor</strong><Swatches colors={[corPainel]} /></span><p>Uma assinatura só sua. Escolha a cor dos destaques.</p></div>
                </button>}
              </div>
              {!visibleThemes.length && !showCustom && <div className="gallery-empty"><Search size={24} /><strong>Nenhum tema por aqui</strong><span>Tente outro nome ou outra coleção.</span></div>}
              {tema === 'custom' && <div className="gallery-color-editor"><div><span className="gallery-eyebrow">DO SEU JEITO</span><h3>A cor que combina com você.</h3><p>Escolha no espectro ou use um dos nossos tons.</p><div className="gallery-color-presets">{COLOR_PRESETS.map(color => <button key={color} type="button" style={{ background: color }} aria-label={`Usar cor ${color}`} aria-pressed={corPainel.toLowerCase() === color} onClick={() => onSelectCor(color)} />)}</div><label className="gallery-hex">HEX <input aria-label="Cor hexadecimal" value={hexDraft} maxLength={7} onChange={event => { const value = event.target.value; setHexDraft(value); if (/^#[0-9a-f]{6}$/i.test(value)) onSelectCor(value) }} onBlur={() => setHexDraft(corPainel)} /></label></div><ColorPicker value={corPainel} onChange={onSelectCor} onChangeEnd={onSelectCor} /></div>}
            </div>
            <div className="gallery-footer"><span><Check size={14} /> Prévia ao vivo · Salve nas configurações para manter.</span><button type="button" className="gallery-done" onClick={() => setOpen(false)}>Concluir <ChevronRight size={15} /></button></div>
          </> : <div className="pony-picker-body">
            <div className="pony-library">
              <label className="gallery-search"><Search size={16} /><input ref={searchRef} value={ponyQuery} onChange={event => setPonyQuery(event.target.value)} placeholder="Quem é seu pônei favorito?" aria-label="Buscar pôneis" /></label>
              <div className="gallery-filters pony-groups" aria-label="Grupos de pôneis">{['Todos', 'Amizade', 'Realeza', 'Ponyville', 'Aventureiras'].map(group => <button key={group} type="button" aria-pressed={ponyGroup === group} onClick={() => setPonyGroup(group)}>{group}</button>)}</div>
              <div className="pony-library-scroll"><div className="pony-character-grid">{visiblePonies.map(pony => <button key={pony.id} type="button" className="pony-character-card" data-pony-option={pony.id} aria-pressed={draftPony === pony.id} onClick={() => setDraftPony(pony.id)} style={{ '--portrait-aura': pony.cores[0] } as CSSProperties}>
                <span className="pony-portrait"><PonyPortrait pony={pony} />{draftPony === pony.id && <i><Check size={12} /></i>}</span><strong>{pony.nome}</strong><span className="pony-card-element">{pony.elemento}</span><Swatches colors={pony.cores} />
              </button>)}</div>{!visiblePonies.length && <div className="gallery-empty"><Search size={24} /><strong>Esse pônei não apareceu</strong><span>Experimente outro nome ou remova o filtro.</span></div>}</div>
              <span className="pony-library-count">{visiblePonies.length} de {PONEIS.length} personagens · Friendship is Magic</span>
            </div>
            <aside className="pony-detail" style={ponyStyle} aria-label={`Prévia de ${selectedPony.nome}`}>
              <div className="pony-detail-art"><div className="pony-detail-orbit" /><span className="pony-detail-symbol" /><PonyPortrait key={selectedPony.id} pony={selectedPony} /><span className="pony-detail-badge"><Heart size={12} /> {selectedPony.elemento}</span></div>
              <div className="pony-detail-copy" aria-live="polite"><span className="pony-detail-overline">SEU PRÓXIMO UNIVERSO</span><h2>{selectedPony.nome}</h2><p>{selectedPony.descricao}</p><div className="pony-detail-palette"><Swatches colors={selectedPony.cores} /><span>{selectedPony.aparencia === 'claro' ? 'Paleta clara' : 'Paleta escura'}</span></div><div className="pony-detail-mini"><MiniPreview theme={selectedTheme} /></div><span className="pony-detail-effect"><Sparkles size={13} /> {selectedPony.motivo}</span></div>
              <div className="pony-detail-action"><button type="button" data-pony-confirm onClick={() => { onSelectTema(`mlp-${selectedPony.id}`); setOpen(false) }}><Heart size={16} /> Usar {selectedPony.nome}<ChevronRight size={16} /></button><span>Cores, detalhes e efeitos personalizados.</span></div>
            </aside>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  )
}
