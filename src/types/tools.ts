export type ToolStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'

export interface ToolTask {
  id: string
  tool: ToolType
  status: ToolStatus
  progress: number
  total: number
  phase?: 'fetching' | 'deleting' | 'completed' | 'backup'
  startedAt: string
  completedAt?: string
  error?: string
  config: Record<string, unknown>
  results: ToolResult[]
}

export interface ToolResult {
  timestamp: string
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export type ToolType =
  | 'limpar-dm'
  | 'backup'
  | 'limpar-package'
  | 'abrir-dms'
  | 'limpar-dms-abertas'
  | 'remover-amigos'
  | 'remover-servidores'
  | 'clonar-servidor'
  | 'scraper-icons'
  | 'fechar-dms'
  | 'limpar-dm-amigos'
  | 'call-utils'
  | 'prefix-commands'

export type ToolCategory = 'mensagens' | 'servidores' | 'social' | 'utilidades'

export interface ToolDefinition {
  id: ToolType
  name: string
  description: string
  icon: string
  category: ToolCategory
  dangerous: boolean
}

export interface LimparDmConfig {
  tokenId: string
  targetId: string
  delay: number
  aguardarFetch: boolean
  fazerBackup: boolean
  salvarMidiaLocal: boolean
}

export interface LimparPackageConfig {
  tokenId: string
  zipPath: string
  whitelist: string[]
  delay: number
  fazerBackup: boolean
  salvarMidiaLocal: boolean
  continuar: boolean
}

export interface AbrirDmsConfig {
  tokenId: string
  modo: 'especifico' | 'package'
  targetIds?: string[]
  zipPath?: string
  whitelist?: string[]
  delay: number
}

export interface LimparDmsAbertasConfig {
  tokenId: string
  delay: number
  fazerBackup: boolean
  salvarMidiaLocal: boolean
  fecharApos: boolean
}

export interface RemoverAmigosConfig {
  tokenId: string
  delay: number
}

export interface LimparDmAmigosConfig {
  tokenId: string
  delay: number
  fazerBackup: boolean
  salvarMidiaLocal: boolean
  fecharApos: boolean
}

export interface RemoverServidoresConfig {
  tokenId: string
  delay: number
}

export interface ClonarServidorConfig {
  tokenId: string
  sourceGuildId: string
  targetGuildId: string
}

export interface ScraperIconsConfig {
  tokenId: string
  sourceChannelId: string
  fileType: 'png/jpg' | 'gif' | 'todos'
  sendMethod: 'webhook' | 'channel'
  webhookUrl?: string
  targetChannelId?: string
  imagesPerMessage: number
  delay: number
}

export interface FecharDmsConfig {
  tokenId: string
  modo?: 'dms' | 'grupos' | 'ambos'
}

export interface TormentFlags {
  persistentMute?: boolean
  persistentDeaf?: boolean
  autoDisconnect?: boolean
  persistentNick?: boolean
  blacklistChat?: boolean
}

export interface CallUtilsConfig {
  tokenId: string
  action: 'disconnect-all' | 'move-members' | 'farm-hours' | 'mute-all' | 'unmute-all' | 'deafen-all' | 'undeafen-all' | 'list-members' | 'elevator' | 'leash' | 'protect' | 'torment'
  channelId?: string
  sourceChannelId?: string
  targetChannelId?: string
  guildId?: string
  userIds?: string[]
  categoryId?: string
  selfMute?: boolean
  selfDeaf?: boolean
  flags?: TormentFlags
  nickname?: string
}

export interface PrefixCommandsConfig {
  tokenId: string
  action: 'enable' | 'disable' | 'set-prefix' | 'status'
  prefix?: string
}
