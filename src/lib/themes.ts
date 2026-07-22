export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  sidebar: string
  sidebarForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
  sidebarRing: string
}

export interface ThemeDefinition {
  id: string
  nome: string
  descricao: string
  previewColors: [string, string, string]
  cores: ThemeColors
  backgroundImage?: string
  backgroundOpacity?: number
  backgroundSize?: string
  backgroundRepeat?: string
  backgroundMask?: string
  scrollbarTrack?: string
  scrollbarThumb?: string
  scrollbarThumbHover?: string
}

const TEMA_PADRAO: ThemeDefinition = {
  id: 'padrao',
  nome: 'Padrão',
  descricao: 'Tema escuro clássico',
  previewColors: ['#000000', '#111111', '#ffffff'],
  cores: {
    background: '#000000',
    foreground: '#e5e5e5',
    card: '#0a0a0a',
    cardForeground: '#e5e5e5',
    popover: '#0a0a0a',
    popoverForeground: '#e5e5e5',
    primary: '#ffffff',
    primaryForeground: '#000000',
    secondary: '#111111',
    secondaryForeground: '#e5e5e5',
    muted: '#171717',
    mutedForeground: '#737373',
    accent: '#ffffff',
    accentForeground: '#000000',
    destructive: '#ff4444',
    destructiveForeground: '#ffffff',
    border: '#1a1a1a',
    input: '#1a1a1a',
    ring: '#ffffff',
    sidebar: '#050505',
    sidebarForeground: '#e5e5e5',
    sidebarPrimary: '#ffffff',
    sidebarPrimaryForeground: '#000000',
    sidebarAccent: '#111111',
    sidebarAccentForeground: '#e5e5e5',
    sidebarBorder: '#1a1a1a',
    sidebarRing: '#ffffff',
  },
}

const TEMA_HELLO_KITTY: ThemeDefinition = {
  id: 'hello-kitty',
  nome: 'Hello Kitty',
  descricao: 'Rosa fofo com decorações da Hello Kitty',
  previewColors: ['#1a0a10', '#ff6b9d', '#ffb3d1'],
  cores: {
    background: '#0d0608',
    foreground: '#f5e6ec',
    card: '#150a0f',
    cardForeground: '#f5e6ec',
    popover: '#150a0f',
    popoverForeground: '#f5e6ec',
    primary: '#ff6b9d',
    primaryForeground: '#1a0a10',
    secondary: '#1f0e15',
    secondaryForeground: '#f5e6ec',
    muted: '#1a0c12',
    mutedForeground: '#b87a94',
    accent: '#ff6b9d',
    accentForeground: '#1a0a10',
    destructive: '#ff4466',
    destructiveForeground: '#ffffff',
    border: '#2a1520',
    input: '#2a1520',
    ring: '#ff6b9d',
    sidebar: '#0a0507',
    sidebarForeground: '#f5e6ec',
    sidebarPrimary: '#ff6b9d',
    sidebarPrimaryForeground: '#1a0a10',
    sidebarAccent: '#1f0e15',
    sidebarAccentForeground: '#f5e6ec',
    sidebarBorder: '#2a1520',
    sidebarRing: '#ff6b9d',
  },
  backgroundImage: '/themes/hellokittybg.jpg',
  backgroundOpacity: 0.18,
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundMask: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 90%)',
  scrollbarTrack: '#150a0f',
  scrollbarThumb: '#2a1520',
  scrollbarThumbHover: '#3d1f30',
}

const TEMA_CYBERPUNK: ThemeDefinition = {
  id: 'cyberpunk',
  nome: 'Cyberpunk',
  descricao: 'Neon com visual futurista',
  previewColors: ['#0a0a14', '#00ffcc', '#ff0066'],
  cores: {
    background: '#05050d',
    foreground: '#e0f0ef',
    card: '#0a0a16',
    cardForeground: '#e0f0ef',
    popover: '#0a0a16',
    popoverForeground: '#e0f0ef',
    primary: '#00ffcc',
    primaryForeground: '#050d0b',
    secondary: '#0f0f1e',
    secondaryForeground: '#e0f0ef',
    muted: '#12122a',
    mutedForeground: '#6b8a85',
    accent: '#00ffcc',
    accentForeground: '#050d0b',
    destructive: '#ff0066',
    destructiveForeground: '#ffffff',
    border: '#1a1a35',
    input: '#1a1a35',
    ring: '#00ffcc',
    sidebar: '#040410',
    sidebarForeground: '#e0f0ef',
    sidebarPrimary: '#00ffcc',
    sidebarPrimaryForeground: '#050d0b',
    sidebarAccent: '#0f0f1e',
    sidebarAccentForeground: '#e0f0ef',
    sidebarBorder: '#1a1a35',
    sidebarRing: '#00ffcc',
  },
  scrollbarTrack: '#0a0a16',
  scrollbarThumb: '#1a1a35',
  scrollbarThumbHover: '#2a2a4a',
}

const TEMA_DRACULA: ThemeDefinition = {
  id: 'dracula',
  nome: 'Dracula',
  descricao: 'Tema escuro roxo clássico',
  previewColors: ['#282a36', '#bd93f9', '#ff79c6'],
  cores: {
    background: '#1a1b26',
    foreground: '#f8f8f2',
    card: '#21222e',
    cardForeground: '#f8f8f2',
    popover: '#21222e',
    popoverForeground: '#f8f8f2',
    primary: '#bd93f9',
    primaryForeground: '#1a1b26',
    secondary: '#282a36',
    secondaryForeground: '#f8f8f2',
    muted: '#2a2c3a',
    mutedForeground: '#6272a4',
    accent: '#bd93f9',
    accentForeground: '#1a1b26',
    destructive: '#ff5555',
    destructiveForeground: '#f8f8f2',
    border: '#343746',
    input: '#343746',
    ring: '#bd93f9',
    sidebar: '#171822',
    sidebarForeground: '#f8f8f2',
    sidebarPrimary: '#bd93f9',
    sidebarPrimaryForeground: '#1a1b26',
    sidebarAccent: '#282a36',
    sidebarAccentForeground: '#f8f8f2',
    sidebarBorder: '#343746',
    sidebarRing: '#bd93f9',
  },
  scrollbarTrack: '#21222e',
  scrollbarThumb: '#343746',
  scrollbarThumbHover: '#44475a',
}

const TEMA_KUROMI: ThemeDefinition = {
  id: 'kuromi',
  nome: 'Kuromi',
  descricao: 'Roxo escuro com estilo punk fofo',
  previewColors: ['#110b18', '#9b59b6', '#c084fc'],
  cores: {
    background: '#0a0710',
    foreground: '#ede6f5',
    card: '#110b18',
    cardForeground: '#ede6f5',
    popover: '#110b18',
    popoverForeground: '#ede6f5',
    primary: '#b476d4',
    primaryForeground: '#0e0816',
    secondary: '#170e22',
    secondaryForeground: '#ede6f5',
    muted: '#1a1025',
    mutedForeground: '#9680aa',
    accent: '#b476d4',
    accentForeground: '#0e0816',
    destructive: '#ff4477',
    destructiveForeground: '#ffffff',
    border: '#261838',
    input: '#261838',
    ring: '#b476d4',
    sidebar: '#080510',
    sidebarForeground: '#ede6f5',
    sidebarPrimary: '#b476d4',
    sidebarPrimaryForeground: '#0e0816',
    sidebarAccent: '#170e22',
    sidebarAccentForeground: '#ede6f5',
    sidebarBorder: '#261838',
    sidebarRing: '#b476d4',
  },
  backgroundImage: '/themes/kuromi.jpg',
  backgroundOpacity: 0.15,
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundMask: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 90%)',
  scrollbarTrack: '#110b18',
  scrollbarThumb: '#261838',
  scrollbarThumbHover: '#3a2550',
}

const TEMA_MANGA: ThemeDefinition = {
  id: 'manga',
  nome: 'Manga',
  descricao: 'Papel branco com tinta preta, painéis recortados e impacto',
  previewColors: ['#f5f1e8', '#000000', '#c91919'],
  cores: {
    background: '#f5f1e8',
    foreground: '#0a0a0a',
    card: '#ffffff',
    cardForeground: '#0a0a0a',
    popover: '#ffffff',
    popoverForeground: '#0a0a0a',
    primary: '#000000',
    primaryForeground: '#ffffff',
    secondary: '#ece5d3',
    secondaryForeground: '#0a0a0a',
    muted: '#eae3d0',
    mutedForeground: '#4a4a4a',
    accent: '#000000',
    accentForeground: '#ffffff',
    destructive: '#c91919',
    destructiveForeground: '#ffffff',
    border: '#0a0a0a',
    input: '#0a0a0a',
    ring: '#000000',
    sidebar: '#ebe3cf',
    sidebarForeground: '#0a0a0a',
    sidebarPrimary: '#000000',
    sidebarPrimaryForeground: '#ffffff',
    sidebarAccent: '#ded4bb',
    sidebarAccentForeground: '#0a0a0a',
    sidebarBorder: '#0a0a0a',
    sidebarRing: '#000000',
  },
  backgroundImage: '/themes/manga-pattern.svg',
  backgroundOpacity: 0.08,
  backgroundSize: '300px',
  backgroundRepeat: 'repeat',
  backgroundMask: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 30%, transparent 100%)',
  scrollbarTrack: '#ece5d3',
  scrollbarThumb: '#0a0a0a',
  scrollbarThumbHover: '#333333',
}

const TEMA_NEO_BRUTALISM: ThemeDefinition = {
  id: 'neo-brutalism',
  nome: 'Neo-Brutalism Soft',
  descricao: 'Pastel cremoso com bordas grossas e sombras sólidas',
  previewColors: ['#fff4e6', '#ff8fa3', '#1a1a1a'],
  cores: {
    background: '#fff4e6',
    foreground: '#1a1a1a',
    card: '#ffffff',
    cardForeground: '#1a1a1a',
    popover: '#ffffff',
    popoverForeground: '#1a1a1a',
    primary: '#ff8fa3',
    primaryForeground: '#1a1a1a',
    secondary: '#ffe5c2',
    secondaryForeground: '#1a1a1a',
    muted: '#f5e6d3',
    mutedForeground: '#6b6b6b',
    accent: '#ff8fa3',
    accentForeground: '#1a1a1a',
    destructive: '#ff4d4d',
    destructiveForeground: '#ffffff',
    border: '#1a1a1a',
    input: '#1a1a1a',
    ring: '#ff8fa3',
    sidebar: '#ffe5c2',
    sidebarForeground: '#1a1a1a',
    sidebarPrimary: '#ff8fa3',
    sidebarPrimaryForeground: '#1a1a1a',
    sidebarAccent: '#fff0da',
    sidebarAccentForeground: '#1a1a1a',
    sidebarBorder: '#1a1a1a',
    sidebarRing: '#ff8fa3',
  },
  backgroundImage: '/themes/neobrutalism-pattern.svg',
  backgroundOpacity: 0.06,
  backgroundSize: '120px',
  backgroundRepeat: 'repeat',
  backgroundMask: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)',
  scrollbarTrack: '#ffe5c2',
  scrollbarThumb: '#1a1a1a',
  scrollbarThumbHover: '#3a3a3a',
}

const TEMA_SPONGEBOB: ThemeDefinition = {
  id: 'spongebob',
  nome: 'Bob Esponja',
  descricao: 'Fundo do Mar — amarelo esponja, contornos de desenho e bolhas subindo',
  previewColors: ['#fdf3c4', '#ffd21a', '#22a7e0'],
  cores: {
    background: '#fdf3c4',
    foreground: '#211d0c',
    card: '#fffdf3',
    cardForeground: '#211d0c',
    popover: '#fffdf3',
    popoverForeground: '#211d0c',
    primary: '#ffd21a',
    primaryForeground: '#211d0c',
    secondary: '#c2e9f0',
    secondaryForeground: '#123b42',
    muted: '#f4ead0',
    mutedForeground: '#7a7047',
    accent: '#ffe081',
    accentForeground: '#211d0c',
    destructive: '#ef4b3a',
    destructiveForeground: '#ffffff',
    border: '#e6d492',
    input: '#e6d492',
    ring: '#22a7e0',
    sidebar: '#fff0a6',
    sidebarForeground: '#211d0c',
    sidebarPrimary: '#ffd21a',
    sidebarPrimaryForeground: '#211d0c',
    sidebarAccent: '#ffe081',
    sidebarAccentForeground: '#211d0c',
    sidebarBorder: '#ecd888',
    sidebarRing: '#22a7e0',
  },
  backgroundImage: '/themes/spongebob.jpg',
  backgroundOpacity: 0.16,
  backgroundSize: '460px',
  backgroundRepeat: 'no-repeat',
  backgroundMask: 'radial-gradient(ellipse 60% 60% at 82% 22%, black 0%, transparent 72%)',
  scrollbarTrack: '#c2e9f0',
  scrollbarThumb: '#ffd21a',
  scrollbarThumbHover: '#f0b800',
}

export const TEMAS: ThemeDefinition[] = [
  TEMA_PADRAO,
  TEMA_SPONGEBOB,
  TEMA_HELLO_KITTY,
  TEMA_KUROMI,
  TEMA_MANGA,
  TEMA_NEO_BRUTALISM,
  TEMA_CYBERPUNK,
  TEMA_DRACULA,
]

export function getTema(id: string): ThemeDefinition | undefined {
  return TEMAS.find((t) => t.id === id)
}
