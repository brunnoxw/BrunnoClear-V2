import type { ThemeColors, ThemeDefinition } from './themes'

export interface PonyCharacter {
  id: string
  nome: string
  descricao: string
  elemento: string
  grupo: 'Amizade' | 'Realeza' | 'Ponyville' | 'Aventureiras'
  imagem: string
  cores: [string, string, string]
  motivo: string
  efeito: string
  aparencia: 'claro' | 'escuro'
}

type CharacterSpec = Omit<PonyCharacter, 'imagem'> & {
  fundo: string
  tinta: string
  destaque: string
}

const characters: CharacterSpec[] = [
  {
    id: 'twilight-sparkle', nome: 'Twilight Sparkle', grupo: 'Amizade', elemento: 'Magia',
    descricao: 'Lavanda, uma crina de céu noturno e pequenas constelações. A magia está nos detalhes.',
    cores: ['#b9a0db', '#343065', '#ed64a6'], motivo: 'Estrela de seis pontas', efeito: 'stars',
    aparencia: 'escuro', fundo: '#17132e', tinta: '#f5efff', destaque: '#d0b2ff',
  },
  {
    id: 'rainbow-dash', nome: 'Rainbow Dash', grupo: 'Amizade', elemento: 'Lealdade',
    descricao: 'Azul do céu, nuvens leves e um arco-íris que atravessa o painel. Pronta para decolar.',
    cores: ['#82d4ef', '#ee5b69', '#ffc857'], motivo: 'Raio e arco-íris', efeito: 'rainbow',
    aparencia: 'claro', fundo: '#edf8fd', tinta: '#173447', destaque: '#086b98',
  },
  {
    id: 'pinkie-pie', nome: 'Pinkie Pie', grupo: 'Amizade', elemento: 'Alegria',
    descricao: 'Rosa de algodão-doce, balões e confetes. Todo dia merece uma pequena comemoração.',
    cores: ['#f3a6ce', '#e84696', '#70d5ed'], motivo: 'Balões de festa', efeito: 'confetti',
    aparencia: 'claro', fundo: '#fff0f7', tinta: '#5b2545', destaque: '#ad246b',
  },
  {
    id: 'fluttershy', nome: 'Fluttershy', grupo: 'Amizade', elemento: 'Bondade',
    descricao: 'Amarelo suave, rosa delicado e borboletas flutuando em um jardim tranquilo.',
    cores: ['#f5e8a6', '#edafce', '#78bea4'], motivo: 'Borboletas', efeito: 'butterflies',
    aparencia: 'claro', fundo: '#fffbed', tinta: '#51452d', destaque: '#93516f',
  },
  {
    id: 'rarity', nome: 'Rarity', grupo: 'Amizade', elemento: 'Generosidade',
    descricao: 'Porcelana, ametista e diamantes. Um ateliê de elegância com brilho na medida certa.',
    cores: ['#eeeaf7', '#8053b3', '#7bd2e8'], motivo: 'Diamantes', efeito: 'diamonds',
    aparencia: 'claro', fundo: '#f8f5ff', tinta: '#3b2d57', destaque: '#7542a2',
  },
  {
    id: 'applejack', nome: 'Applejack', grupo: 'Amizade', elemento: 'Honestidade',
    descricao: 'O dourado do pomar, maçãs vermelhas e o aconchego de Sweet Apple Acres.',
    cores: ['#f4b15f', '#f8df97', '#b94a45'], motivo: 'Maçãs do pomar', efeito: 'apples',
    aparencia: 'claro', fundo: '#fff7e8', tinta: '#513a24', destaque: '#9c5021',
  },
  {
    id: 'princess-celestia', nome: 'Princess Celestia', grupo: 'Realeza', elemento: 'Luz do dia',
    descricao: 'Marfim e ouro sob uma aurora de menta, azul e rosa. A serenidade de Canterlot.',
    cores: ['#fff6db', '#9edbcf', '#d3a548'], motivo: 'Sol real', efeito: 'sunlight',
    aparencia: 'claro', fundo: '#fffaf0', tinta: '#574425', destaque: '#8c6624',
  },
  {
    id: 'princess-luna', nome: 'Princess Luna', grupo: 'Realeza', elemento: 'Guardiã dos sonhos',
    descricao: 'Azul profundo, luas prateadas e estrelas serenas. Um pequeno reino depois do anoitecer.',
    cores: ['#39498c', '#91b8fb', '#c4a9ee'], motivo: 'Lua crescente', efeito: 'moonlight',
    aparencia: 'escuro', fundo: '#0e172e', tinta: '#edf3ff', destaque: '#a8c7ff',
  },
  {
    id: 'princess-cadance', nome: 'Princess Cadance', grupo: 'Realeza', elemento: 'Amor',
    descricao: 'Rosa cristalino, ouro e violeta. Corações luminosos inspirados no Império de Cristal.',
    cores: ['#efa3d2', '#a28bcd', '#f2cd82'], motivo: 'Coração de cristal', efeito: 'hearts',
    aparencia: 'claro', fundo: '#fff1f8', tinta: '#552b4b', destaque: '#a23779',
  },
  {
    id: 'starlight-glimmer', nome: 'Starlight Glimmer', grupo: 'Aventureiras', elemento: 'Novos começos',
    descricao: 'Lilás, turquesa e rastros de magia. Cada detalhe ganha uma nova possibilidade.',
    cores: ['#c6a2db', '#704d9e', '#7ce0d3'], motivo: 'Estrela e magia', efeito: 'magic',
    aparencia: 'escuro', fundo: '#20162f', tinta: '#f6efff', destaque: '#dbc0f4',
  },
  {
    id: 'sunset-shimmer', nome: 'Sunset Shimmer', grupo: 'Aventureiras', elemento: 'Empatia',
    descricao: 'Âmbar e vermelho de fim de tarde. Um pôr do sol intenso com pequenas faíscas douradas.',
    cores: ['#efb76c', '#d9564b', '#f5cf70'], motivo: 'Sol do entardecer', efeito: 'embers',
    aparencia: 'escuro', fundo: '#291923', tinta: '#fff2e5', destaque: '#ffcb83',
  },
  {
    id: 'trixie', nome: 'Trixie', grupo: 'Aventureiras', elemento: 'A grande e poderosa',
    descricao: 'Azul de veludo, estrelas e um toque de espetáculo. O palco é todo seu.',
    cores: ['#80b4e8', '#8296cd', '#dba8ee'], motivo: 'Varinha e estrelas', efeito: 'sparks',
    aparencia: 'escuro', fundo: '#17233d', tinta: '#edf4ff', destaque: '#a9cffa',
  },
  {
    id: 'derpy', nome: 'Derpy', grupo: 'Ponyville', elemento: 'Pequenas surpresas',
    descricao: 'Cinza de nuvem e amarelo de muffin, com bolhas leves e um charme distraído.',
    cores: ['#b4bcc8', '#efdc8d', '#a1cadf'], motivo: 'Bolhas', efeito: 'bubbles',
    aparencia: 'claro', fundo: '#f5f6f8', tinta: '#354052', destaque: '#50648b',
  },
  {
    id: 'vinyl-scratch', nome: 'Vinyl Scratch', grupo: 'Ponyville', elemento: 'Seu próprio ritmo',
    descricao: 'Azul elétrico, ciano e notas musicais em um palco escuro. Uma sessão particular de DJ Pon-3.',
    cores: ['#e9f4ef', '#409af0', '#7be4ef'], motivo: 'Notas e ondas sonoras', efeito: 'music',
    aparencia: 'escuro', fundo: '#111f30', tinta: '#eef8ff', destaque: '#75d4f2',
  },
  {
    id: 'octavia', nome: 'Octavia Melody', grupo: 'Ponyville', elemento: 'Harmonia',
    descricao: 'Ardósia, marfim e o rosa de sua gravata. A delicadeza de um concerto ao entardecer.',
    cores: ['#adb1bc', '#333848', '#ce8dbb'], motivo: 'Clave musical', efeito: 'notes',
    aparencia: 'escuro', fundo: '#22222c', tinta: '#f5f0f5', destaque: '#e0b1cf',
  },
  {
    id: 'lyra-heartstrings', nome: 'Lyra Heartstrings', grupo: 'Ponyville', elemento: 'Curiosidade',
    descricao: 'Menta fresca, fios dourados e pequenas melodias. Uma pausa à sombra de Ponyville.',
    cores: ['#9ee1ca', '#e2fff3', '#cba85b'], motivo: 'Lira dourada', efeito: 'strings',
    aparencia: 'claro', fundo: '#eefbf5', tinta: '#244b40', destaque: '#276c5c',
  },
  {
    id: 'bon-bon', nome: 'Bon Bon', grupo: 'Ponyville', elemento: 'Doce companhia',
    descricao: 'Creme de baunilha, azul-marinho e rosa. Docinhos e cores que fazem uma boa dupla.',
    cores: ['#f5ebcb', '#394777', '#e8a2c1'], motivo: 'Doces embrulhados', efeito: 'sweets',
    aparencia: 'claro', fundo: '#fff9ee', tinta: '#35405d', destaque: '#61528c',
  },
  {
    id: 'apple-bloom', nome: 'Apple Bloom', grupo: 'Aventureiras', elemento: 'Descobertas',
    descricao: 'Amarelo ensolarado e o vermelho do seu laço. Flores de macieira para novas aventuras.',
    cores: ['#f1dc91', '#cf5961', '#e49cab'], motivo: 'Flores de macieira', efeito: 'blossoms',
    aparencia: 'claro', fundo: '#fffae9', tinta: '#57422f', destaque: '#ab4551',
  },
  {
    id: 'sweetie-belle', nome: 'Sweetie Belle', grupo: 'Aventureiras', elemento: 'Uma voz especial',
    descricao: 'Pérola, rosa e lavanda. Pequenos brilhos acompanham a próxima grande descoberta.',
    cores: ['#f3eff8', '#c8b4e9', '#f0b4d0'], motivo: 'Brilhos e canções', efeito: 'glitter',
    aparencia: 'claro', fundo: '#fbf7ff', tinta: '#4a3559', destaque: '#88509a',
  },
  {
    id: 'scootaloo', nome: 'Scootaloo', grupo: 'Aventureiras', elemento: 'Coragem',
    descricao: 'Tangerina, magenta e asas abertas. Energia para seguir em frente, do seu jeito.',
    cores: ['#efad66', '#b75c9e', '#eac0e3'], motivo: 'Asas e movimento', efeito: 'feathers',
    aparencia: 'claro', fundo: '#fff3ec', tinta: '#573344', destaque: '#a64d80',
  },
  {
    id: 'shining-armor', nome: 'Shining Armor', grupo: 'Realeza', elemento: 'Proteção',
    descricao: 'Branco de armadura, azul real e escudos luminosos. Um refúgio digno da Guarda Real.',
    cores: ['#e9f1ff', '#4277bb', '#95c9f5'], motivo: 'Escudo real', efeito: 'shields',
    aparencia: 'claro', fundo: '#f0f6ff', tinta: '#283e60', destaque: '#355fa0',
  },
  {
    id: 'big-macintosh', nome: 'Big Macintosh', grupo: 'Ponyville', elemento: 'Confiança',
    descricao: 'Vermelho de maçã, ouro de colheita e verdes do pomar. Simples, firme e acolhedor.',
    cores: ['#bc5453', '#e8bc70', '#9fb77c'], motivo: 'Maçãs verdes', efeito: 'apples',
    aparencia: 'escuro', fundo: '#281c1f', tinta: '#fff2e6', destaque: '#f4b59e',
  },
  {
    id: 'maud-pie', nome: 'Maud Pie', grupo: 'Ponyville', elemento: 'Beleza tranquila',
    descricao: 'Pedra, violeta e azul mineral. Texturas discretas para quem vê beleza nas pequenas coisas.',
    cores: ['#a4a1b2', '#7f6d99', '#73a1b7'], motivo: 'Cristais minerais', efeito: 'diamonds',
    aparencia: 'escuro', fundo: '#20232e', tinta: '#f0edf8', destaque: '#c3b6dc',
  },
  {
    id: 'cheerilee', nome: 'Cheerilee', grupo: 'Ponyville', elemento: 'Aprender e florescer',
    descricao: 'Amora, rosa e flores sorridentes. Um cantinho inspirado na professora de Ponyville.',
    cores: ['#aa5b85', '#f0b5d0', '#e4d893'], motivo: 'Flores do jardim', efeito: 'blossoms',
    aparencia: 'claro', fundo: '#fff3f8', tinta: '#572a44', destaque: '#9c3d70',
  },
]

export const PONEIS: PonyCharacter[] = characters.map(({ fundo: _fundo, tinta: _tinta, destaque: _destaque, ...pony }) => ({
  ...pony,
  imagem: `/themes/my-little-pony/${pony.id}.png`,
}))

export function getPony(id: string): PonyCharacter | undefined {
  return PONEIS.find((pony) => pony.id === id.replace(/^mlp-/, ''))
}

function mix(first: string, second: string, amount: number): string {
  const rgb = [0, 2, 4].map((offset) => {
    const a = Number.parseInt(first.slice(offset + 1, offset + 3), 16)
    const b = Number.parseInt(second.slice(offset + 1, offset + 3), 16)
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0')
  })
  return `#${rgb.join('')}`
}

// Small original silhouettes echo each character's motif without reproducing cutie-mark artwork.
const symbols: Record<string, string> = {
  stars: '<path d="m16 1 3.8 9.3L30 8l-6.2 8L30 24l-10.2-2.3L16 31l-3.8-9.3L2 24l6.2-8L2 8l10.2 2.3Z"/>',
  rainbow: '<path d="M16 2 5 18h9l-2 12 15-19H16Z"/>',
  confetti: '<ellipse cx="16" cy="12" rx="9" ry="11"/><path d="m14 23-1 4h6l-1-4Zm2 4v5"/>',
  butterflies: '<path d="M15 14C2-5-4 12 9 18-2 29 11 34 15 21c4 13 17 8 6-3C34 12 28-5 17 14v-3h-2Z"/>',
  diamonds: '<path d="m7 4-6 8 15 18 15-18-6-8Zm9 2 5 6-5 13-5-13Zm-8 0 4 6H4Zm16 0 4 6h-8Z" fill-rule="evenodd"/>',
  apples: '<path d="M16 10C5 1-2 14 4 25c3 7 8 6 12 4 4 2 9 3 12-4 6-11-1-24-12-15Z"/><path d="M16 10c-1-5 1-8 4-10v5c8-5 10-2 6 2-3 3-7 2-10 3Z"/>',
  sunlight: '<circle cx="16" cy="16" r="8"/><path d="m16 0 2 6h-4Zm16 16-6 2v-4ZM16 32l-2-6h4ZM0 16l6-2v4ZM5 5l6 3-3 3Zm22 0-3 6-3-3ZM27 27l-6-3 3-3ZM5 27l3-6 3 3Z"/>',
  moonlight: '<path d="M23 1C4-4-8 20 10 30c10 5 19-2 21-10C13 29 3 8 23 1Z"/>',
  hearts: '<path d="M16 29 3 16C-6 5 8-5 16 6c8-11 22-1 13 10Z"/>',
  magic: '<path d="m16 1 4 10 11 5-11 4-4 11-4-11L1 16l11-5Z"/>',
  embers: '<path d="M17 1C18 12 4 11 4 22a12 12 0 0 0 24 0c0-9-4-12-5-14 1 9-7 10-6-7Z"/>',
  sparks: '<path d="m16 0 3 12 13 4-13 3-3 13-4-13L0 16l12-4Z"/>',
  bubbles: '<circle cx="16" cy="16" r="12" fill="none" stroke="black" stroke-width="2"/><path d="M8 15a8 8 0 0 1 8-8" fill="none" stroke="black" stroke-width="2"/>',
  music: '<path d="M14 3v19c-9-5-16 7-7 9 5 1 10-3 10-8V9l10-3v13c-9-4-15 6-7 9 6 1 10-2 10-8V0Z"/>',
  notes: '<path d="M18 1v20C8 16 2 27 10 30c6 2 11-2 11-8V9c10 7 12-3-3-8Z"/>',
  strings: '<path d="M3 4h7v3H6c1 9 0 16 8 18V7h4v18c8-2 7-9 8-18h-4V4h7c1 17-2 24-11 25v2h-4v-2C5 28 2 21 3 4Z"/>',
  sweets: '<path d="m0 6 10 4-5 10-5 6Zm32 0-10 4 5 10 5 6Z"/><rect x="8" y="8" width="16" height="16" rx="7"/>',
  blossoms: '<path d="M16 10C5-5 0 6 7 14c-16 0-7 15 2 10-2 16 12 10 12 1 12 10 17-7 7-10C41 6 22-1 21 10Z"/><circle cx="17" cy="17" r="3" fill="white"/>',
  glitter: '<path d="m12 3 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm15-3 1 4 4 1-4 1-1 4-1-4-4-1 4-1Zm0 23 1 3 4 1-4 1-1 4-1-4-4-1 4-1Z"/>',
  feathers: '<path d="M30 1C12 0 4 9 7 24L1 30l2 2 9-9 13-1 4-6-10 2 11-6 1-5-9 5Z"/>',
  shields: '<path d="m16 0 13 5v12c0 7-8 12-13 15C11 29 3 24 3 17V5Zm0 6-7 3v8c0 3 3 6 7 9 4-3 7-6 7-9V9Z" fill-rule="evenodd"/>',
}

function symbolUrl(effect: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${symbols[effect] ?? symbols.stars}</svg>`)}")`
}

function colorsFor(pony: CharacterSpec): ThemeColors {
  const light = pony.aparencia === 'claro'
  const background = pony.fundo
  const foreground = pony.tinta
  const card = light ? mix(background, '#ffffff', 0.78) : mix(background, pony.cores[0], 0.07)
  const secondary = mix(background, pony.cores[0], light ? 0.3 : 0.13)
  const border = mix(background, pony.destaque, light ? 0.26 : 0.23)
  const accent = mix(background, pony.destaque, light ? 0.13 : 0.18)
  return {
    background, foreground, card, cardForeground: foreground,
    popover: card, popoverForeground: foreground,
    primary: pony.destaque, primaryForeground: light ? '#ffffff' : background,
    secondary, secondaryForeground: foreground, muted: secondary,
    mutedForeground: mix(foreground, background, light ? 0.24 : 0.32),
    accent, accentForeground: foreground,
    destructive: light ? '#b42c4b' : '#ff8fa5', destructiveForeground: light ? '#ffffff' : '#40101b',
    border, input: border, ring: pony.destaque,
    sidebar: light ? mix(background, pony.cores[0], 0.18) : mix(background, '#000000', 0.12),
    sidebarForeground: foreground, sidebarPrimary: pony.destaque,
    sidebarPrimaryForeground: light ? '#ffffff' : background,
    sidebarAccent: accent, sidebarAccentForeground: foreground, sidebarBorder: border, sidebarRing: pony.destaque,
  }
}

export function getPonyTheme(id: string): ThemeDefinition | undefined {
  const pony = characters.find((character) => character.id === id.replace(/^mlp-/, ''))
  if (!pony) return undefined
  const cores = colorsFor(pony)
  return {
    id: `mlp-${pony.id}`,
    nome: pony.nome,
    descricao: pony.descricao,
    previewColors: pony.cores,
    family: 'my-little-pony',
    character: pony.id,
    effect: pony.efeito,
    cores,
    scrollbarTrack: cores.background,
    scrollbarThumb: cores.border,
    scrollbarThumbHover: mix(cores.background, pony.destaque, 0.48),
    cssVars: {
      '--pony-aura': pony.cores[0],
      '--pony-secondary': pony.cores[1],
      '--pony-tertiary': pony.cores[2],
      '--pony-image': `url("/themes/my-little-pony/${pony.id}.png")`,
      '--pony-symbol': symbolUrl(pony.efeito),
      '--pony-color-scheme': pony.aparencia === 'claro' ? 'light' : 'dark',
      '--pony-shadow': pony.aparencia === 'claro' ? '#58415f12' : '#05020d35',
      '--pony-particle-opacity': pony.aparencia === 'claro' ? '0.2' : '0.3',
    },
  }
}
