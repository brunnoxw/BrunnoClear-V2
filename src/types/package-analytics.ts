/**
 * Tipos do resultado da análise completa de um pacote de dados do Discord.
 * Gerado pelo parser em streaming do servidor (feature package-analytics)
 * e consumido pela página /analise-package.
 */

export interface KV {
  key: string
  value: number
}

export interface EntryMetrics {
  chars: number
  links: number
  mentions: number
  emojis: number
  attachments: number
  curses: number
}

export interface EntryDetail {
  topWords: KV[]
  topEmojis: KV[]
  /** 24 posições (0-23h UTC) */
  byHour: number[]
  /** 7 posições (0=Dom … 6=Sáb) */
  byWeekday: number[]
  byMonth: MonthBucket[]
  longest: { length: number; preview: string } | null
  avgLength: number
  firstAt: string | null
  lastAt: string | null
}

export interface TopEntry {
  id: string
  name: string
  avatar?: string | null
  value: number
  /** contexto extra (ex.: caracteres, nome do servidor) */
  extra?: number
  sub?: string
  isBot?: boolean
  metrics?: EntryMetrics
  detail?: EntryDetail
}

/** um lugar (DM, grupo ou canal) onde uma palavra foi usada. */
export interface WordPlace {
  name: string
  value: number
  kind: 'dm' | 'group' | 'channel'
  avatar: string | null
  sub?: string
}

export interface CustomEmojiStat {
  id: string
  name: string
  animated: boolean
  value: number
}

export interface BadgeIcon {
  name: string
  url: string
}

export interface ActivityStat {
  label: string
  value: number
  icon: string
  /** ação em 3ª pessoa p/ montar frase: "{nome} {phrase} {valor} vezes" */
  phrase?: string
}

/** contagem de um tipo de evento (rótulo já traduzido, com frase opcional). */
export interface EventCount {
  key: string
  value: number
  phrase?: string
}

export interface BotApp {
  id: string
  name: string
  iconUrl: string | null
  public: boolean
  verified: boolean
}

export interface MonthBucket {
  month: string // YYYY-MM
  count: number
}

export interface PackageAccountStats {
  id: string
  username: string
  globalName: string | null
  displayName: string
  email: string | null
  phone: string | null
  ip: string | null
  verified: boolean
  avatarDataUri: string | null
  premiumUntil: string | null
  hasNitro: boolean
  createdAt: string | null
  accountAgeDays: number | null
  flags: string[]
  orbs: number
  dateOfBirth: string | null
  predictedAge: string | null
  relationshipsTotal: number
  friendsCount: number
  blockedCount: number
  pendingCount: number
  connectionsCount: number
  connections: { type: string; name: string; verified?: boolean }[]
  guildSettingsCount: number
  payments: { count: number; totalSpent: number; currency: string } | null
  badges: BadgeIcon[]
  avatarDecorationUrl: string | null
  supportTickets: number
}

export interface PackageMessageStats {
  totalMessages: number
  totalCharacters: number
  totalChannels: number
  totalDMs: number
  totalGroupDMs: number
  totalGuildChannels: number
  avgLength: number
  longestMessage: { length: number; preview: string } | null
  firstMessageAt: string | null
  lastMessageAt: string | null
  totalLinks: number
  totalAttachments: number
  totalMentions: number
  totalEmojisUsed: number
  totalWords: number
  topDMs: TopEntry[]
  topGuilds: TopEntry[]
  topChannels: TopEntry[]
  topWords: KV[]
  /** palavra → lugares onde foi usada (top ~500 palavras) */
  wordPlaces: Record<string, WordPlace[]>
  topCustomEmojis: CustomEmojiStat[]
  topEmojis: KV[]
  curseWords: number
  /** palavrões mais usados (palavra → nº de vezes) */
  topCurses: KV[]
  /** 24 posições (0-23h) */
  byHour: number[]
  /** 7 posições (0=Dom … 6=Sáb) */
  byWeekday: number[]
  byMonth: MonthBucket[]
}

export interface PackageActivityStats {
  hasData: boolean
  totalEvents: number
  eventTypes: EventCount[]
  messagesSent: number
  appOpens: number
  sessions: number
  voiceConnects: number
  voiceJoins: number
  reactionsAdded: number
  notifications: number
  slashCommands: number
  guildsViewed: number
  channelsOpened: number
  successfulLogins: number
  attemptedLogins: number
  firstEventAt: string | null
  lastEventAt: string | null
  /** grade de estatísticas com rótulos PT já prontos */
  stats: ActivityStat[]
  topGames: KV[]
  osBreakdown: KV[]
  browserBreakdown: KV[]
  topCities: KV[]
  topCountries: KV[]
  topISPs: KV[]
  locales: KV[]
  byMonth: MonthBucket[]
}

export interface PackageGameStat {
  name: string
  id: string
  iconUrl: string | null
  totalMinutes: number
  lastPlayed: string | null
}

export interface PackageStats {
  language: 'pt' | 'en' | 'unknown'
  generatedAt: string
  fileName: string
  account: PackageAccountStats
  messages: PackageMessageStats
  activity: PackageActivityStats
  servers: {
    total: number
    list: { id: string; name: string; messages: number; channels: number }[]
  }
  games: PackageGameStat[]
  bots: BotApp[]
  funFacts: string[]
  usersResolved: boolean
}

/** metadados de uma análise salva em disco (para listagem). */
export interface SavedAnalysisMeta {
  id: string
  name: string
  savedAt: string
  username: string
  displayName: string
  avatar: string | null
  totalMessages: number
  fileName: string
}

export interface PackageAnaliseProgress {
  phase: 'starting' | 'account' | 'servers' | 'messages' | 'activity' | 'finishing'
  message: string
  messagesParsed: number
  eventsParsed: number
}
