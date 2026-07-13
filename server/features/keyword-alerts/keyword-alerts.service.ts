import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { discord } from '../../services/discord.service'
import { logger } from '../../core/logger'
import { config } from '../../config'
import type {
  KeywordAlertConfig,
  KeywordAlertMatch,
  KeywordAlertStatus,
} from '../../../src/types/keyword-alerts'

const MAX_HISTORY = 500

const DEFAULT_CONFIG: KeywordAlertConfig = {
  enabled: false,
  keywords: [],
  ignoreOwn: true,
  ignoreBots: false,
  caseSensitive: false,
  wholeWord: false,
  dmOnly: false,
}

let cfg: KeywordAlertConfig = { ...DEFAULT_CONFIG }
let history: KeywordAlertMatch[] = []
let attachedClient: any = null
let listener: ((message: any) => void) | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

const emitter = new EventEmitter()

function filePath(): string {
  return path.join(config.storage.dataPath, 'keyword-alerts.json')
}

function load(): void {
  try {
    const fp = filePath()
    if (fs.existsSync(fp)) {
      const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'))
      cfg = { ...DEFAULT_CONFIG, ...(raw.config || {}) }
      history = Array.isArray(raw.history) ? raw.history.slice(0, MAX_HISTORY) : []
    }
  } catch (err) {
    logger.warn('KeywordAlerts', `Erro ao carregar config: ${err}`)
  }
}

function save(): void {
  try {
    fs.writeFileSync(filePath(), JSON.stringify({ config: cfg, history }, null, 2), 'utf-8')
  } catch (err) {
    logger.warn('KeywordAlerts', `Erro ao salvar: ${err}`)
  }
}

function saveDebounced(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { save(); saveTimer = null }, 1000)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findKeyword(content: string): string | null {
  for (const kwRaw of cfg.keywords) {
    const kw = kwRaw.trim()
    if (!kw) continue

    if (cfg.wholeWord) {
      const re = new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegex(kw)}(?:$|[^\\p{L}\\p{N}_])`, cfg.caseSensitive ? 'u' : 'iu')
      if (re.test(content)) return kw
    } else {
      const hay = cfg.caseSensitive ? content : content.toLowerCase()
      const needle = cfg.caseSensitive ? kw : kw.toLowerCase()
      if (hay.includes(needle)) return kw
    }
  }
  return null
}

function buildAvatarUrl(author: any): string | null {
  try {
    return author.displayAvatarURL?.({ dynamic: true, size: 64 }) || null
  } catch {
    return null
  }
}

function onMessage(message: any): void {
  try {
    if (!cfg.enabled || cfg.keywords.length === 0) return
    if (!message?.author) return

    const isDM = !message.guild
    if (cfg.dmOnly && !isDM) return
    if (cfg.ignoreOwn && attachedClient && message.author.id === attachedClient.user?.id) return
    if (cfg.ignoreBots && message.author.bot) return

    const content = message.content || ''
    if (!content) return

    const keyword = findKeyword(content)
    if (!keyword) return

    const channelName = message.channel?.name
      || (isDM ? (message.channel?.recipient?.username ? `@${message.channel.recipient.username}` : 'DM') : 'Desconhecido')

    const match: KeywordAlertMatch = {
      id: `ka_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      keyword,
      content: content.length > 500 ? content.slice(0, 500) + '…' : content,
      authorId: message.author.id,
      authorUsername: message.author.globalName || message.author.username || message.author.id,
      authorAvatarUrl: buildAvatarUrl(message.author),
      channelId: message.channel?.id || '',
      channelName,
      guildId: message.guild?.id || null,
      guildName: message.guild?.name || 'Mensagem Direta',
      guildIcon: message.guild?.iconURL?.({ format: 'png', size: 64 }) || null,
      isDM,
      messageUrl: `https://discord.com/channels/${message.guild?.id || '@me'}/${message.channel?.id || ''}/${message.id}`,
      timestamp: message.createdAt?.toISOString?.() || new Date().toISOString(),
    }

    history.unshift(match)
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
    saveDebounced()

    emitter.emit('match', match)
    logger.info('KeywordAlerts', `Palavra "${keyword}" detectada de ${match.authorUsername} em ${match.guildName} / ${channelName}`)
  } catch (err) {
    logger.warn('KeywordAlerts', `Erro ao processar mensagem: ${err}`)
  }
}

function detach(): void {
  if (attachedClient && listener) {
    try { attachedClient.off('messageCreate', listener) } catch {}
  }
  attachedClient = null
}

function attach(client: any): void {
  if (!client) return
  if (attachedClient === client) return
  detach()
  if (!listener) listener = onMessage
  client.on('messageCreate', listener)
  attachedClient = client
  logger.info('KeywordAlerts', 'Listener de alertas anexado à conta ativa')
}

function evaluateAttachment(): void {
  if (cfg.enabled && cfg.keywords.length > 0) {
    let client: any = null
    try { client = discord.getActiveClient() } catch { client = null }
    if (client) attach(client)
  } else {
    detach()
  }
}

function handleClientChange(client: any | null): void {
  detach()
  if (client) evaluateAttachment()
}

export function init(): void {
  load()
  discord.onActiveClientChange(handleClientChange)
  evaluateAttachment()
  logger.info('KeywordAlerts', `Inicializado (${cfg.enabled ? 'ativo' : 'inativo'}, ${cfg.keywords.length} palavra(s))`)
}

export function getStatus(): KeywordAlertStatus {
  const connected = discord.isConnected()
  return {
    config: cfg,
    historyCount: history.length,
    connected,
    attached: attachedClient !== null,
  }
}

export function setConfig(patch: Partial<KeywordAlertConfig>): KeywordAlertStatus {
  if (Array.isArray(patch.keywords)) {
    patch.keywords = Array.from(
      new Set(patch.keywords.map((k) => k.trim()).filter(Boolean)),
    )
  }
  cfg = { ...cfg, ...patch }
  save()
  evaluateAttachment()
  return getStatus()
}

export function getHistory(): KeywordAlertMatch[] {
  return history
}

export function clearHistory(): void {
  history = []
  save()
}

export const keywordAlertsEmitter = emitter
