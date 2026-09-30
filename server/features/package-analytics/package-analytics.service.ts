import fs from 'fs'
import path from 'path'
import readline from 'readline'
import yauzl from 'yauzl'
import { taskManager } from '../../services/task-manager.service'
import { logger } from '../../core/logger'
import { decodeBadges } from '../../utils/badges'
import { config } from '../../config'
import {
  STOPWORDS,
  curseMatches,
  EVENT_LABELS,
  EVENT_PHRASES,
  ACTIVITY_STAT_DEFS,
} from './package-analytics.data'
import type {
  PackageStats,
  KV,
  TopEntry,
  WordPlace,
  EventCount,
  SavedAnalysisMeta,
  EntryMetrics,
  CustomEmojiStat,
  PackageGameStat,
  BadgeIcon,
  ActivityStat,
  BotApp,
} from '../../../src/types/package-analytics'

interface ResolvedUser { name: string; avatar: string | null; isBot: boolean }
interface ResolvedGame { name: string; iconUrl: string | null }

/** fetch com timeout, retornando JSON ou null. */
async function fetchJson(url: string, opts: RequestInit = {}, timeoutMs = 7000): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** roda tarefas assíncronas com concorrência limitada. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const cur = idx++
      out[cur] = await fn(items[cur], cur)
    }
  })
  await Promise.all(workers)
  return out
}

/** Resolve nome + ícone de aplicativos/jogos pelo endpoint público de RPC (sem auth). */
async function resolveGames(ids: string[]): Promise<Map<string, ResolvedGame>> {
  const map = new Map<string, ResolvedGame>()
  const unique = [...new Set(ids.filter((id) => /^\d+$/.test(id)))].slice(0, 25)
  await pool(unique, 5, async (id) => {
    const data = await fetchJson(`https://discord.com/api/v9/applications/${id}/rpc`)
    if (data && data.name) {
      const iconUrl = data.icon ? `https://cdn.discordapp.com/app-icons/${id}/${data.icon}.png?size=64` : null
      map.set(id, { name: data.name, iconUrl })
    }
  })
  return map
}

/** Resolve nome/avatar/bot dos usuários via token de BOT (opcional). */
async function resolveUsers(
  ids: string[],
  botToken: string,
  onProgress: (done: number, total: number) => void,
): Promise<Map<string, ResolvedUser>> {
  const map = new Map<string, ResolvedUser>()
  const unique = [...new Set(ids.filter((id) => /^\d+$/.test(id)))].slice(0, 100)
  let done = 0
  await pool(unique, 4, async (id) => {
    const data = await fetchJson(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    }, 8000)
    if (data && data.id) {
      let avatar: string | null = null
      if (data.avatar) {
        const ext = String(data.avatar).startsWith('a_') ? 'gif' : 'png'
        avatar = `https://cdn.discordapp.com/avatars/${id}/${data.avatar}.${ext}?size=64`
      }
      map.set(id, {
        name: data.global_name || data.username || id,
        avatar,
        isBot: !!data.bot,
      })
    }
    done++
    if (done % 5 === 0 || done === unique.length) onProgress(done, unique.length)
  })
  return map
}

/** Resultados prontos, indexados por taskId, aguardando o GET do frontend. */
const resultStore = new Map<string, PackageStats>()

export function getResultado(taskId: string): PackageStats | null {
  return resultStore.get(taskId) ?? null
}


const SAVED_DIR = path.join(config.storage.dataPath, 'package-analyses')
const VALID_ID = /^pa_[a-z0-9_]+$/i

function ensureSavedDir() {
  try { fs.mkdirSync(SAVED_DIR, { recursive: true }) } catch {}
}

/** Salva em disco o resultado de um taskId, retornando os metadados. */
export function saveResultado(taskId: string, name?: string): SavedAnalysisMeta | null {
  const stats = resultStore.get(taskId)
  if (!stats) return null
  ensureSavedDir()
  const id = `pa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const meta: SavedAnalysisMeta = {
    id,
    name: (name || '').trim() || stats.account.displayName || 'Análise',
    savedAt: new Date().toISOString(),
    username: stats.account.username,
    displayName: stats.account.displayName,
    avatar: stats.account.avatarDataUri,
    totalMessages: stats.messages.totalMessages,
    fileName: stats.fileName,
  }
  try {
    fs.writeFileSync(path.join(SAVED_DIR, `${id}.json`), JSON.stringify({ meta, stats }))
    logger.success('Package', `Análise salva: ${meta.name} (${id})`)
    return meta
  } catch (err: any) {
    logger.error('Package', `Falha ao salvar análise: ${err.message}`)
    return null
  }
}

export function listSavedAnalyses(): SavedAnalysisMeta[] {
  ensureSavedDir()
  const out: SavedAnalysisMeta[] = []
  try {
    for (const f of fs.readdirSync(SAVED_DIR)) {
      if (!f.endsWith('.json')) continue
      try {
        const j = JSON.parse(fs.readFileSync(path.join(SAVED_DIR, f), 'utf8'))
        if (j?.meta) out.push(j.meta as SavedAnalysisMeta)
      } catch {}
    }
  } catch {}
  return out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
}

export function getSavedAnalysis(id: string): PackageStats | null {
  if (!VALID_ID.test(id)) return null
  try {
    const j = JSON.parse(fs.readFileSync(path.join(SAVED_DIR, `${id}.json`), 'utf8'))
    return (j?.stats as PackageStats) ?? null
  } catch {
    return null
  }
}

export function deleteSavedAnalysis(id: string): boolean {
  if (!VALID_ID.test(id)) return false
  try { fs.unlinkSync(path.join(SAVED_DIR, `${id}.json`)); return true } catch { return false }
}


const DISCORD_EPOCH = 1420070400000n

function snowflakeToDate(id: string): Date | null {
  try {
    if (!/^\d+$/.test(id)) return null
    const ms = (BigInt(id) >> 22n) + DISCORD_EPOCH
    const d = new Date(Number(ms))
    if (isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) || 0) + by)
}

/** Evita explosão de memória em vocabulários grandes. */
function prune(map: Map<string, number>, max: number, keep: number) {
  if (map.size <= max) return
  const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, keep)
  map.clear()
  for (const [k, v] of top) map.set(k, v)
}

function topN(map: Map<string, number>, n: number): KV[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, value]) => ({ key, value }))
}

/** todos os pares, ordenados desc (sem limite) — usuário quer ver tudo. */
function allKV(map: Map<string, number>): KV[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, value }))
}

function monthBuckets(map: Map<string, number>) {
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, count]) => ({ month, count }))
}

const RE_URL = /https?:\/\/[^\s]+/gi
const RE_MENTION = /<@!?&?\d+>/g
const RE_CUSTOM_EMOJI = /<(a)?:(\w+):(\d+)>/g
const RE_UNICODE_EMOJI = /\p{Extended_Pictographic}/gu
const RE_WORD = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu

interface ChannelMeta {
  type: string
  name?: string
  guildId?: string
  guildName?: string
  otherId?: string
}

interface Aggregator {
  ownerId: string
  language: 'pt' | 'en' | 'unknown'
  relationships: Map<string, { name: string; avatar: string | null }>

  totalMessages: number
  totalCharacters: number
  totalWords: number
  totalLinks: number
  totalAttachments: number
  totalMentions: number
  totalEmojisUsed: number
  curseWords: number
  curseMap: Map<string, number>
  longest: { length: number; preview: string } | null
  firstMsg: number | null
  lastMsg: number | null
  byHour: number[]
  byWeekday: number[]
  byMonthMsg: Map<string, number>
  words: Map<string, number>
  customEmojis: Map<string, { name: string; animated: boolean; count: number }>
  emojis: Map<string, number>
  channelCount: Map<string, number>
  channelChars: Map<string, number>
  channelLinks: Map<string, number>
  channelMentions: Map<string, number>
  channelEmojis: Map<string, number>
  channelAttachments: Map<string, number>
  channelCurses: Map<string, number>
  channelWords: Map<string, Map<string, number>>
  channelEmojiMap: Map<string, Map<string, number>>
  channelHour: Map<string, number[]>
  channelWeekday: Map<string, number[]>
  channelMonth: Map<string, Map<string, number>>
  channelLongest: Map<string, { length: number; preview: string }>
  channelFirst: Map<string, number>
  channelLast: Map<string, number>
  channelMeta: Map<string, ChannelMeta>
  channelNames: Map<string, string>
  apps: { id: string; name: string; iconUrl: string | null; public: boolean; verified: boolean }[]
  supportTickets: number
  paymentsData: { count: number; totalSpent: number; currency: string } | null

  activityHasData: boolean
  totalEvents: number
  eventTypes: Map<string, number>
  games: Map<string, number>
  os: Map<string, number>
  browser: Map<string, number>
  cities: Map<string, number>
  countries: Map<string, number>
  isps: Map<string, number>
  locales: Map<string, number>
  byMonthEvent: Map<string, number>
  firstEvent: number | null
  lastEvent: number | null
}

function newAggregator(): Aggregator {
  return {
    ownerId: '',
    language: 'unknown',
    relationships: new Map(),
    totalMessages: 0,
    totalCharacters: 0,
    totalWords: 0,
    totalLinks: 0,
    totalAttachments: 0,
    totalMentions: 0,
    totalEmojisUsed: 0,
    curseWords: 0,
    curseMap: new Map(),
    longest: null,
    firstMsg: null,
    lastMsg: null,
    byHour: new Array(24).fill(0),
    byWeekday: new Array(7).fill(0),
    byMonthMsg: new Map(),
    words: new Map(),
    customEmojis: new Map(),
    emojis: new Map(),
    channelCount: new Map(),
    channelChars: new Map(),
    channelLinks: new Map(),
    channelMentions: new Map(),
    channelEmojis: new Map(),
    channelAttachments: new Map(),
    channelCurses: new Map(),
    channelWords: new Map(),
    channelEmojiMap: new Map(),
    channelHour: new Map(),
    channelWeekday: new Map(),
    channelMonth: new Map(),
    channelLongest: new Map(),
    channelFirst: new Map(),
    channelLast: new Map(),
    channelMeta: new Map(),
    channelNames: new Map(),
    apps: [],
    supportTickets: 0,
    paymentsData: null,
    activityHasData: false,
    totalEvents: 0,
    eventTypes: new Map(),
    games: new Map(),
    os: new Map(),
    browser: new Map(),
    cities: new Map(),
    countries: new Map(),
    isps: new Map(),
    locales: new Map(),
    byMonthEvent: new Map(),
    firstEvent: null,
    lastEvent: null,
  }
}


const isUserJson = (f: string) => /(?:^|\/)(?:account|conta)\/user\.json$/i.test(f)
const isAvatar = (f: string) => /(?:^|\/)(?:account|conta)\/avatar\.(png|jpe?g|gif|webp)$/i.test(f)
const isServersIndex = (f: string) => /(?:^|\/)(?:servers|servidores)\/index\.json$/i.test(f)
const isMessagesIndex = (f: string) => /(?:^|\/)(?:messages|mensagens)\/index\.json$/i.test(f)
const isApplicationJson = (f: string) => /(?:^|\/)(?:account|conta)\/applications\/[0-9]+\/application\.json$/i.test(f)
const isChannelJson = (f: string) => /(?:^|\/)(?:messages|mensagens)\/c?[0-9]+\/(?:channel|canal)\.json$/i.test(f)
const isMessagesJson = (f: string) => /(?:^|\/)(?:messages|mensagens)\/c?[0-9]+\/messages\.json$/i.test(f)
const isActivityEvents = (f: string) => /(?:^|\/)(?:activity|atividade)\/[^/]+\/events[^/]*\.json$/i.test(f)
const isTicketsJson = (f: string) => /(?:^|\/)(?:support_tickets|t[íi]quete[_ ]?suporte)\/tickets\.json$/i.test(f)
const isPaymentsJson = (f: string) => /discord_billing\/payments\.json$/i.test(f)

/**
 * Parseia discord_billing/payments.json → { count, totalSpent, currency }.
 * Formato: { records: [ { amount, amount_refunded, currency, status, payment_gateway, ... } ] }.
 * amount em centavos. status Discord: 1=pendente, 2=pago, 3=falhou, 4=reembolsado,
 * 5=parcialmente reembolsado, 6=cancelado. Conta só o que virou dinheiro (2 e 5),
 * ignora moeda virtual (orbs) e soma o líquido (amount - reembolsado) por moeda,
 * retornando a moeda com maior gasto.
 */
function parsePayments(raw: string): { count: number; totalSpent: number; currency: string } | null {
  let j: any
  try { j = JSON.parse(raw) } catch { return null }
  const records: any[] = Array.isArray(j) ? j : (j?.records || j?.payments || [])
  if (!Array.isArray(records) || records.length === 0) return null
  const COUNTED = new Set([2, 5])
  const byCurrency = new Map<string, { total: number; count: number }>()
  for (const p of records) {
    const status = Number(p?.status)
    if (!isNaN(status) && !COUNTED.has(status)) continue
    const cur = String(p?.currency || 'usd').toLowerCase()
    if (cur === 'discord_orb' || Number(p?.payment_gateway) === 8) continue
    const amount = Number(p?.amount || 0)
    if (isNaN(amount) || amount <= 0) continue
    const refunded = Number(p?.amount_refunded || 0)
    const net = Math.max(0, amount - (isNaN(refunded) ? 0 : refunded))
    if (net <= 0) continue
    const entry = byCurrency.get(cur) || { total: 0, count: 0 }
    entry.total += net
    entry.count++
    byCurrency.set(cur, entry)
  }
  if (byCurrency.size === 0) return null
  const [cur, agg] = [...byCurrency.entries()].sort((a, b) => b[1].total - a[1].total)[0]
  return { count: agg.count, totalSpent: agg.total / 100, currency: cur.toUpperCase() }
}

/** extrai username de "Direct Message with X" / "Mensagem direta com X". */
function dmNameFromIndex(raw: string): string | null {
  const m = raw.match(/^(?:Direct Message with|Mensagem direta com)\s+(.+)$/i)
  if (!m) return null
  const n = m[1].trim()
  return /^unknown participant$/i.test(n) ? 'Usuário desconhecido' : n
}

/** nomes-placeholder do index que não agregam valor. */
function cleanIndexName(raw: string | null): string | null {
  if (!raw) return null
  if (/^(unknown channel|canal desconhecido)$/i.test(raw.trim())) return null
  return raw
}

function channelIdFromPath(f: string): string | null {
  const m = f.match(/(?:messages|mensagens)\/c?([0-9]+)\//i)
  return m ? m[1] : null
}

function detectLanguage(f: string): 'pt' | 'en' | null {
  if (/(?:^|\/)(?:conta|atividade|mensagens|servidores)\//i.test(f)) return 'pt'
  if (/(?:^|\/)(?:account|activity|messages|servers)\//i.test(f)) return 'en'
  return null
}


function readEntryToString(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<string> {
  return new Promise((resolve) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return resolve('')
      const chunks: Buffer[] = []
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      stream.on('error', () => resolve(''))
    })
  })
}

function readEntryToBuffer(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer | null> {
  return new Promise((resolve) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return resolve(null)
      const chunks: Buffer[] = []
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', () => resolve(null))
    })
  })
}

function eachLine(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry,
  onLine: (line: string) => void,
  onBytes?: (n: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return resolve()
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
      rl.on('line', (line) => {
        if (onBytes) onBytes(Buffer.byteLength(line) + 1)
        onLine(line)
      })
      rl.on('close', () => resolve())
      stream.on('error', () => { rl.close(); resolve() })
    })
  })
}


function ingestMessageLine(agg: Aggregator, raw: string) {
  const line = raw.trim()
  if (line.length < 2 || line[0] !== '{') return
  const clean = line.endsWith(',') ? line.slice(0, -1) : line
  let msg: { ID?: unknown; Timestamp?: string; Contents?: string; Attachments?: string }
  try {
    msg = JSON.parse(clean)
  } catch {
    return
  }
  if (!msg || (msg.Contents === undefined && msg.Attachments === undefined && msg.Timestamp === undefined)) return

  agg.totalMessages++
  const chanId = (agg as any)._currentChannel as string | undefined
  if (chanId) inc(agg.channelCount, chanId)

  if (msg.Timestamp) {
    const t = Date.parse(msg.Timestamp.replace(' ', 'T') + 'Z')
    if (!isNaN(t)) {
      if (agg.firstMsg === null || t < agg.firstMsg) agg.firstMsg = t
      if (agg.lastMsg === null || t > agg.lastMsg) agg.lastMsg = t
      const d = new Date(t)
      const hr = d.getUTCHours()
      agg.byHour[hr]++
      agg.byWeekday[d.getUTCDay()]++
      inc(agg.byMonthMsg, `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
      if (chanId) {
        let ch = agg.channelHour.get(chanId)
        if (!ch) { ch = new Array(24).fill(0); agg.channelHour.set(chanId, ch) }
        ch[hr]++
        let cw = agg.channelWeekday.get(chanId)
        if (!cw) { cw = new Array(7).fill(0); agg.channelWeekday.set(chanId, cw) }
        cw[d.getUTCDay()]++
        let cm = agg.channelMonth.get(chanId)
        if (!cm) { cm = new Map(); agg.channelMonth.set(chanId, cm) }
        inc(cm, `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
        if (!agg.channelFirst.has(chanId) || t < (agg.channelFirst.get(chanId) as number)) agg.channelFirst.set(chanId, t)
        if (!agg.channelLast.has(chanId) || t > (agg.channelLast.get(chanId) as number)) agg.channelLast.set(chanId, t)
      }
    }
  }

  const content = typeof msg.Contents === 'string' ? msg.Contents : ''
  if (content) {
    agg.totalCharacters += content.length
    if (chanId) inc(agg.channelChars, chanId, content.length)
    if (!agg.longest || content.length > agg.longest.length) {
      agg.longest = { length: content.length, preview: content.slice(0, 280) }
    }
    if (chanId) {
      const cl = agg.channelLongest.get(chanId)
      if (!cl || content.length > cl.length) agg.channelLongest.set(chanId, { length: content.length, preview: content.slice(0, 280) })
    }

    const links = content.match(RE_URL)
    if (links) { agg.totalLinks += links.length; if (chanId) inc(agg.channelLinks, chanId, links.length) }
    const mentions = content.match(RE_MENTION)
    if (mentions) { agg.totalMentions += mentions.length; if (chanId) inc(agg.channelMentions, chanId, mentions.length) }

    let emojiCount = 0
    let em: RegExpExecArray | null
    RE_CUSTOM_EMOJI.lastIndex = 0
    while ((em = RE_CUSTOM_EMOJI.exec(content)) !== null) {
      const id = em[3]
      const prev = agg.customEmojis.get(id)
      if (prev) prev.count++
      else agg.customEmojis.set(id, { name: em[2], animated: !!em[1], count: 1 })
      emojiCount++
    }
    const uni = content.match(RE_UNICODE_EMOJI)
    if (uni) {
      let chEmo: Map<string, number> | undefined
      if (chanId) { chEmo = agg.channelEmojiMap.get(chanId); if (!chEmo) { chEmo = new Map(); agg.channelEmojiMap.set(chanId, chEmo) } }
      for (const e of uni) { inc(agg.emojis, e); if (chEmo) inc(chEmo, e) }
      emojiCount += uni.length
    }
    if (emojiCount) { agg.totalEmojisUsed += emojiCount; if (chanId) inc(agg.channelEmojis, chanId, emojiCount) }

    const lower = content.toLowerCase()
    const curseHits = curseMatches(lower)
    if (curseHits.length) {
      agg.curseWords += curseHits.length
      if (chanId) inc(agg.channelCurses, chanId, curseHits.length)
      for (const c of curseHits) inc(agg.curseMap, c)
    }

    const cleaned = lower
      .replace(RE_CUSTOM_EMOJI, ' ')
      .replace(RE_MENTION, ' ')
      .replace(RE_URL, ' ')
    const words = cleaned.match(RE_WORD)
    if (words) {
      let chWords: Map<string, number> | undefined
      if (chanId) { chWords = agg.channelWords.get(chanId); if (!chWords) { chWords = new Map(); agg.channelWords.set(chanId, chWords) } }
      for (const w of words) {
        if (w.length < 3 || w.length > 40) continue
        if (/^\d+$/.test(w)) continue
        if (STOPWORDS.has(w)) continue
        inc(agg.words, w)
        agg.totalWords++
        if (chWords) inc(chWords, w)
      }
      prune(agg.words, 80000, 8000)
      if (chWords) prune(chWords, 600, 120)
    }
  }

  if (typeof msg.Attachments === 'string' && msg.Attachments.trim()) {
    const parts = msg.Attachments.trim().split(/\s+/).filter(Boolean)
    const n = parts.length || 1
    agg.totalAttachments += n
    if (chanId) inc(agg.channelAttachments, chanId, n)
  }
}

function ingestEventLine(agg: Aggregator, raw: string) {
  const line = raw.trim()
  if (line.length < 2 || line[0] !== '{') return
  let ev: any
  try {
    ev = JSON.parse(line)
  } catch {
    return
  }
  if (!ev || !ev.event_type) return

  agg.activityHasData = true
  agg.totalEvents++
  inc(agg.eventTypes, ev.event_type)

  if (ev.os) inc(agg.os, String(ev.os))
  if (ev.browser) inc(agg.browser, String(ev.browser))
  if (ev.city) inc(agg.cities, String(ev.city))
  if (ev.country_code) inc(agg.countries, String(ev.country_code))
  if (ev.isp) inc(agg.isps, String(ev.isp))
  if (ev.chosen_locale) inc(agg.locales, String(ev.chosen_locale))

  if (ev.event_type === 'launch_game' || ev.event_type === 'running_game_heartbeat') {
    const g = ev.application_name || ev.game_name
    if (g) inc(agg.games, String(g))
  }

  const day: string | undefined = ev._day_utc || ev._day_pt
  if (typeof day === 'string' && day.length >= 7) {
    inc(agg.byMonthEvent, day.slice(0, 7))
    const t = Date.parse(day)
    if (!isNaN(t)) {
      if (agg.firstEvent === null || t < agg.firstEvent) agg.firstEvent = t
      if (agg.lastEvent === null || t > agg.lastEvent) agg.lastEvent = t
    }
  }

  if (agg.totalEvents % 200000 === 0) {
    prune(agg.cities, 20000, 3000)
    prune(agg.isps, 20000, 3000)
  }
}


function parseUser(agg: Aggregator, raw: string): Partial<PackageStats['account']> & { games?: PackageGameStat[] } {
  let u: any
  try {
    u = JSON.parse(raw)
  } catch {
    return {}
  }

  agg.ownerId = String(u.id || '')

  let friends = 0
  let blocked = 0
  let pending = 0
  if (Array.isArray(u.relationships)) {
    for (const r of u.relationships) {
      const usr = r.user || {}
      const uid = String(r.id || usr.id || '')
      if (uid) {
        const name = usr.global_name || usr.username || uid
        let avatar: string | null = null
        if (usr.avatar && /^\d+$/.test(uid)) {
          const ext = String(usr.avatar).startsWith('a_') ? 'gif' : 'png'
          avatar = `https://cdn.discordapp.com/avatars/${uid}/${usr.avatar}.${ext}?size=64`
        }
        agg.relationships.set(uid, { name, avatar })
      }
      if (r.type === 'FRIEND') friends++
      else if (r.type === 'BLOCKED') blocked++
      else if (r.type === 'PENDING_INCOMING' || r.type === 'PENDING_OUTGOING') pending++
    }
  }

  const connections = Array.isArray(u.connections)
    ? u.connections.map((c: any) => ({ type: String(c.type || ''), name: String(c.name || ''), verified: !!c.verified }))
    : []

  const badges: string[] = []
  const owned = u.user_profile_metadata?.owned_badges
  if (Array.isArray(owned)) for (const b of owned) badges.push(typeof b === 'string' ? b : b?.id || b?.name || '')

  let payments: PackageStats['account']['payments'] = null
  if (Array.isArray(u.payments) && u.payments.length > 0) {
    let total = 0
    let currency = 'USD'
    for (const p of u.payments) {
      const amt = Number(p.amount || 0)
      if (!isNaN(amt)) total += amt
      if (p.currency) currency = String(p.currency).toUpperCase()
    }
    payments = { count: u.payments.length, totalSpent: total / 100, currency }
  }

  let games: PackageGameStat[] = []
  if (Array.isArray(u.user_activity_application_statistics)) {
    games = u.user_activity_application_statistics
      .map((s: any) => ({
        name: String(s.application_id || ''),
        id: String(s.application_id || ''),
        iconUrl: null,
        totalMinutes: Math.round(Number(s.total_duration || 0) / 60),
        lastPlayed: s.last_played_at || null,
      }))
      .filter((g: PackageGameStat) => g.totalMinutes > 0)
      .sort((a: PackageGameStat, b: PackageGameStat) => b.totalMinutes - a.totalMinutes)
      .slice(0, 30)
  }

  const created = agg.ownerId ? snowflakeToDate(agg.ownerId) : null
  const premiumUntil = u.premium_until || null
  const hasNitro = !!premiumUntil || (Array.isArray(u.flags) && u.flags.some((f: string) => /PREMIUM|NITRO/i.test(f)))

  const badgeIcons: BadgeIcon[] = decodeBadges(Number(u.public_flags || u.flags_bitfield || 0), hasNitro ? 2 : 0)
    .map((b) => ({ name: b.name, url: b.url }))
  void badges // owned_badges cru não é usado para ícones

  let avatarDecorationUrl: string | null = null
  const deco = u.avatar_decoration_data?.asset || u.user_profile_metadata?.avatar_decoration_data?.asset
  if (deco) avatarDecorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${deco}.png?size=96`

  return {
    id: agg.ownerId,
    username: String(u.username || ''),
    globalName: u.global_name || null,
    displayName: u.global_name || u.username || agg.ownerId,
    email: u.email || null,
    phone: u.phone || null,
    ip: u.ip || null,
    verified: !!u.verified,
    premiumUntil,
    hasNitro,
    createdAt: created ? created.toISOString() : null,
    accountAgeDays: created ? Math.floor((Date.now() - created.getTime()) / 86400000) : null,
    flags: Array.isArray(u.flags) ? u.flags.map(String) : [],
    badges: badgeIcons,
    avatarDecorationUrl,
    orbs: Number(u.current_orbs_balance || 0),
    dateOfBirth: u.date_of_birth || null,
    predictedAge: u.predicted_age ? String(u.predicted_age) : null,
    relationshipsTotal: Array.isArray(u.relationships) ? u.relationships.length : 0,
    friendsCount: friends,
    blockedCount: blocked,
    pendingCount: pending,
    connectionsCount: connections.length,
    connections: connections.slice(0, 40),
    guildSettingsCount: Array.isArray(u.guild_settings) ? u.guild_settings.length : 0,
    payments,
    games,
  }
}


function computeTotalBytes(zipPath: string): Promise<number> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return resolve(0)
      let total = 0
      zipfile.readEntry()
      zipfile.on('entry', (entry: yauzl.Entry) => {
        total += entry.uncompressedSize || 0
        zipfile.readEntry()
      })
      zipfile.on('end', () => resolve(total))
      zipfile.on('error', () => resolve(total))
    })
  })
}


export async function iniciarAnalise(zipPath: string, botToken?: string): Promise<{ taskId: string }> {
  if (!fs.existsSync(zipPath)) {
    throw Object.assign(new Error('Arquivo ZIP não encontrado'), { statusCode: 400 })
  }
  const task = taskManager.createTask('package-analytics', { zipPath })
  const controller = taskManager.startTask(task.id)
  if (!controller) throw new Error('Falha ao iniciar análise')

  executarAnalise(task.id, zipPath, botToken).catch((err) => {
    logger.error('PackageAnalytics', `Erro fatal: ${err}`)
    taskManager.failTask(task.id, String(err?.message || err))
  })

  return { taskId: task.id }
}

async function executarAnalise(taskId: string, zipPath: string, botToken?: string) {
  const startTime = Date.now()
  const agg = newAggregator()
  const fileName = path.basename(zipPath)
  let accountData: any = {}
  let avatarDataUri: string | null = null
  const serverList: { id: string; name: string }[] = []

  taskManager.updateProgress(taskId, 0, 100, 'Preparando análise...', 'starting')

  const totalBytes = (await computeTotalBytes(zipPath)) || 1
  let processedBytes = 0
  let lastEmit = 0

  const emit = (phase: string, message: string, force = false) => {
    const now = Date.now()
    if (!force && now - lastEmit < 350) return
    lastEmit = now
    const pct = Math.min(99, Math.round((processedBytes / totalBytes) * 100))
    taskManager.updateProgress(taskId, pct, 100, message, phase, {
      messagesParsed: agg.totalMessages,
      eventsParsed: agg.totalEvents,
    })
  }

  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err || new Error('Não foi possível abrir o ZIP'))

      zipfile.readEntry()
      zipfile.on('entry', (entry: yauzl.Entry) => {
        const run = async () => {
          if (taskManager.isAborted(taskId)) {
            zipfile.close()
            return reject(new Error('Análise cancelada'))
          }

          const f = entry.fileName
          const lang = detectLanguage(f)
          if (lang && agg.language === 'unknown') agg.language = lang

          try {
            if (isUserJson(f)) {
              emit('account', 'Lendo dados da conta...', true)
              accountData = parseUser(agg, await readEntryToString(zipfile, entry))
              processedBytes += entry.uncompressedSize || 0
            } else if (isAvatar(f)) {
              if ((entry.uncompressedSize || 0) < 3_000_000) {
                const buf = await readEntryToBuffer(zipfile, entry)
                if (buf) {
                  const ext = f.toLowerCase().endsWith('.png') ? 'png'
                    : f.toLowerCase().endsWith('.gif') ? 'gif'
                    : f.toLowerCase().endsWith('.webp') ? 'webp' : 'jpeg'
                  avatarDataUri = `data:image/${ext};base64,${buf.toString('base64')}`
                }
              }
              processedBytes += entry.uncompressedSize || 0
            } else if (isServersIndex(f)) {
              const raw = await readEntryToString(zipfile, entry)
              try {
                const idx = JSON.parse(raw)
                for (const [id, name] of Object.entries(idx)) {
                  serverList.push({ id, name: String(name) })
                }
              } catch { /* ignore */ }
              processedBytes += entry.uncompressedSize || 0
            } else if (isMessagesIndex(f)) {
              const raw = await readEntryToString(zipfile, entry)
              try {
                const idx = JSON.parse(raw)
                for (const [id, name] of Object.entries(idx)) {
                  agg.channelNames.set(id, String(name))
                }
              } catch { /* ignore */ }
              processedBytes += entry.uncompressedSize || 0
            } else if (isTicketsJson(f)) {
              const raw = await readEntryToString(zipfile, entry)
              try { agg.supportTickets = Object.keys(JSON.parse(raw)).length } catch { /* ignore */ }
              processedBytes += entry.uncompressedSize || 0
            } else if (isPaymentsJson(f)) {
              const raw = await readEntryToString(zipfile, entry)
              agg.paymentsData = parsePayments(raw)
              processedBytes += entry.uncompressedSize || 0
            } else if (isApplicationJson(f)) {
              const raw = await readEntryToString(zipfile, entry)
              try {
                const app = JSON.parse(raw)
                if (app.id && app.name) {
                  agg.apps.push({
                    id: String(app.id),
                    name: String(app.name),
                    iconUrl: app.icon ? `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png?size=64` : null,
                    public: !!app.bot_public,
                    verified: !!app.is_verified,
                  })
                }
              } catch { /* ignore */ }
              processedBytes += entry.uncompressedSize || 0
            } else if (isChannelJson(f)) {
              const raw = await readEntryToString(zipfile, entry)
              try {
                const ch = JSON.parse(raw)
                const id = String(ch.id || channelIdFromPath(f) || '')
                if (id) {
                  let otherId: string | undefined
                  if (Array.isArray(ch.recipients)) {
                    otherId = ch.recipients.find((r: string) => r !== agg.ownerId && /^\d+$/.test(r))
                  }
                  agg.channelMeta.set(id, {
                    type: String(ch.type || ''),
                    name: ch.name,
                    guildId: ch.guild?.id,
                    guildName: ch.guild?.name,
                    otherId,
                  })
                }
              } catch { /* ignore */ }
              processedBytes += entry.uncompressedSize || 0
            } else if (isMessagesJson(f)) {
              const chanId = channelIdFromPath(f)
              ;(agg as any)._currentChannel = chanId
              await eachLine(zipfile, entry, (line) => ingestMessageLine(agg, line), (n) => {
                processedBytes += n
              })
              ;(agg as any)._currentChannel = undefined
              emit('messages', `Analisando mensagens... ${agg.totalMessages.toLocaleString('pt-BR')} mensagens`)
            } else if (isActivityEvents(f)) {
              await eachLine(zipfile, entry, (line) => ingestEventLine(agg, line), (n) => {
                processedBytes += n
                if (agg.totalEvents % 50000 === 0) {
                  emit('activity', `Analisando atividade... ${agg.totalEvents.toLocaleString('pt-BR')} eventos`)
                }
              })
              emit('activity', `Analisando atividade... ${agg.totalEvents.toLocaleString('pt-BR')} eventos`, true)
            } else {
              processedBytes += entry.uncompressedSize || 0
            }
          } catch (e) {
            logger.warn('PackageAnalytics', `Erro no arquivo ${f}: ${e}`)
          }

          emit((agg.totalEvents > 0 ? 'activity' : 'messages'), agg.totalEvents > 0
            ? `Analisando... ${agg.totalMessages.toLocaleString('pt-BR')} msgs, ${agg.totalEvents.toLocaleString('pt-BR')} eventos`
            : `Analisando mensagens... ${agg.totalMessages.toLocaleString('pt-BR')} mensagens`)

          zipfile.readEntry()
        }
        run().catch(reject)
      })

      zipfile.on('end', () => resolve())
      zipfile.on('error', reject)
    })
  })

  taskManager.updateProgress(taskId, 99, 100, 'Buscando nomes de jogos...', 'finishing', {
    messagesParsed: agg.totalMessages, eventsParsed: agg.totalEvents,
  })
  const gameIds = (accountData.games || []).slice(0, 20).map((g: PackageGameStat) => g.id)
  const resolvedGames = await resolveGames(gameIds).catch(() => new Map<string, ResolvedGame>())

  let resolvedUsers = new Map<string, ResolvedUser>()
  let usersResolved = false
  if (botToken && botToken.trim()) {
    const dmIds: string[] = []
    for (const [chanId, count] of [...agg.channelCount.entries()].sort((a, b) => b[1] - a[1])) {
      const meta = agg.channelMeta.get(chanId)
      if (meta?.type === 'DM' && meta.otherId) dmIds.push(meta.otherId)
      if (dmIds.length >= 100) break
      void count
    }
    try {
      resolvedUsers = await resolveUsers(dmIds, botToken.trim(), (done, total) => {
        taskManager.updateProgress(taskId, 99, 100, `Buscando usuários... ${done}/${total}`, 'finishing', {
          messagesParsed: agg.totalMessages, eventsParsed: agg.totalEvents,
        })
      })
      usersResolved = true
    } catch (e) {
      logger.warn('PackageAnalytics', `Falha ao resolver usuários: ${e}`)
    }
  }

  taskManager.updateProgress(taskId, 99, 100, 'Montando relatório...', 'finishing', {
    messagesParsed: agg.totalMessages,
    eventsParsed: agg.totalEvents,
  })

  const stats = montarStats(agg, accountData, avatarDataUri, serverList, fileName, {
    resolvedGames, resolvedUsers, usersResolved,
  })
  resultStore.set(taskId, stats)

  if (resultStore.size > 5) {
    const firstKey = resultStore.keys().next().value
    if (firstKey) resultStore.delete(firstKey)
  }

  taskManager.completeTask(taskId)
  logger.success(
    'PackageAnalytics',
    `Concluído em ${Math.round((Date.now() - startTime) / 1000)}s: ${agg.totalMessages} msgs, ${agg.totalEvents} eventos`,
  )
}


function montarStats(
  agg: Aggregator,
  account: any,
  avatarDataUri: string | null,
  serverList: { id: string; name: string }[],
  fileName: string,
  resolved: {
    resolvedGames: Map<string, ResolvedGame>
    resolvedUsers: Map<string, ResolvedUser>
    usersResolved: boolean
  },
): PackageStats {
  const { resolvedGames, resolvedUsers, usersResolved } = resolved

  const metricsFor = (id: string): EntryMetrics => ({
    chars: agg.channelChars.get(id) || 0,
    links: agg.channelLinks.get(id) || 0,
    mentions: agg.channelMentions.get(id) || 0,
    emojis: agg.channelEmojis.get(id) || 0,
    attachments: agg.channelAttachments.get(id) || 0,
    curses: agg.channelCurses.get(id) || 0,
  })

  const detailFor = (id: string) => {
    const wm = agg.channelWords.get(id)
    const em = agg.channelEmojiMap.get(id)
    const f = agg.channelFirst.get(id)
    const l = agg.channelLast.get(id)
    const cm = agg.channelMonth.get(id)
    const count = agg.channelCount.get(id) || 0
    const chars = agg.channelChars.get(id) || 0
    return {
      topWords: wm ? allKV(wm) : [],
      topEmojis: em ? allKV(em) : [],
      byHour: agg.channelHour.get(id) || new Array(24).fill(0),
      byWeekday: agg.channelWeekday.get(id) || new Array(7).fill(0),
      byMonth: cm ? monthBuckets(cm) : [],
      longest: agg.channelLongest.get(id) || null,
      avgLength: count > 0 ? Math.round(chars / count) : 0,
      firstAt: f ? new Date(f).toISOString() : null,
      lastAt: l ? new Date(l).toISOString() : null,
    }
  }

  const dmEntries: TopEntry[] = []
  const guildAgg = new Map<string, { name: string; count: number; channels: number }>()
  const channelEntries: TopEntry[] = []
  const chanInfo = new Map<string, { name: string; avatar: string | null; kind: 'dm' | 'group' | 'channel'; sub?: string }>()

  for (const [chanId, count] of agg.channelCount.entries()) {
    const meta = agg.channelMeta.get(chanId)
    const chars = agg.channelChars.get(chanId) || 0
    const metrics = metricsFor(chanId)
    const indexName = cleanIndexName(agg.channelNames.get(chanId) || null)
    const detail = detailFor(chanId)
    if (!meta) {
      const nm = indexName ? (dmNameFromIndex(indexName) || indexName) : `Canal ${chanId.slice(-4)}`
      channelEntries.push({ id: chanId, name: nm, value: count, extra: chars, metrics, detail })
      chanInfo.set(chanId, { name: nm, avatar: null, kind: 'channel' })
      continue
    }
    if (meta.type === 'DM') {
      const other = meta.otherId
      const ru = other ? resolvedUsers.get(other) : undefined
      const rel = other ? agg.relationships.get(other) : undefined
      const nameFromIndex = indexName ? dmNameFromIndex(indexName) : null
      const nm = ru?.name || nameFromIndex || rel?.name || (other ? `Usuário ${other.slice(-4)}` : 'Desconhecido')
      const av = ru?.avatar || rel?.avatar || null
      dmEntries.push({
        id: other || chanId,
        name: nm,
        avatar: av,
        value: count,
        extra: chars,
        isBot: ru?.isBot || undefined,
        metrics,
        detail,
      })
      chanInfo.set(chanId, { name: nm, avatar: av, kind: 'dm' })
    } else if (meta.type === 'GROUP_DM') {
      const nm = indexName || meta.name || 'Grupo'
      dmEntries.push({ id: chanId, name: nm, value: count, extra: chars, sub: 'grupo', metrics, detail })
      chanInfo.set(chanId, { name: nm, avatar: null, kind: 'group' })
    } else {
      let cName = meta.name
      let gName = meta.guildName
      if ((!cName || !gName) && indexName && indexName.includes(',')) {
        const [c, g] = indexName.split(',').map((s) => s.trim())
        cName = cName || c
        gName = gName || g
      }
      const gid = meta.guildId || gName || 'unknown'
      const gname = gName || 'Servidor desconhecido'
      const g = guildAgg.get(gid) || { name: gname, count: 0, channels: 0 }
      g.count += count
      g.channels += 1
      guildAgg.set(gid, g)
      const nm = cName || indexName || `Canal ${chanId.slice(-4)}`
      channelEntries.push({
        id: chanId,
        name: nm,
        value: count,
        extra: chars,
        sub: gname,
        metrics,
        detail,
      })
      chanInfo.set(chanId, { name: nm, avatar: null, kind: 'channel', sub: gname })
    }
  }

  dmEntries.sort((a, b) => b.value - a.value)
  channelEntries.sort((a, b) => b.value - a.value)
  const topGuilds: TopEntry[] = [...guildAgg.entries()]
    .map(([id, g]) => ({ id, name: g.name, value: g.count, extra: g.channels }))
    .sort((a, b) => b.value - a.value)

  const totalDMs = [...agg.channelMeta.values()].filter((m) => m.type === 'DM').length
  const totalGroupDMs = [...agg.channelMeta.values()].filter((m) => m.type === 'GROUP_DM').length
  const totalGuildChannels = [...agg.channelMeta.values()].filter((m) => m.type !== 'DM' && m.type !== 'GROUP_DM').length

  const et = (name: string) => agg.eventTypes.get(name) || 0
  const activityMessagesSent = et('send_message')
  const appOpens = et('app_opened')
  const sessions = et('session_start')
  const voiceConnects = et('voice_connection_success')
  const voiceJoins = et('join_voice_channel')
  const reactionsAdded = et('add_reaction')
  const notifications = et('notification_clicked') + et('notification_received')
  const slashCommands = et('application_command_used') + et('slash_command_used')
  const guildsViewed = et('guild_viewed')
  const channelsOpened = et('channel_opened')
  const successfulLogins = et('login_successful')
  const attemptedLogins = et('login_attempted')

  const activityStatsGrid: ActivityStat[] = ACTIVITY_STAT_DEFS
    .map((d) => ({ label: d.label, icon: d.icon, phrase: d.phrase, value: d.types.reduce((s, t) => s + et(t), 0) }))
    .filter((s) => s.value > 0)

  const eventTypesFull: EventCount[] = allKV(agg.eventTypes)
    .filter((kv) => !!EVENT_LABELS[kv.key])
    .map((kv) => ({ key: EVENT_LABELS[kv.key], value: kv.value, phrase: EVENT_PHRASES[kv.key] }))

  const allWords = allKV(agg.words)
  const TRACK_WORDS = 500, PLACES_PER_WORD = 50
  const trackedWords = new Set(allWords.slice(0, TRACK_WORDS).map((w) => w.key))
  const wordPlacesMap = new Map<string, WordPlace[]>()
  for (const [chanId, wmap] of agg.channelWords.entries()) {
    const info = chanInfo.get(chanId)
    if (!info) continue
    for (const [word, cnt] of wmap.entries()) {
      if (!trackedWords.has(word)) continue
      let arr = wordPlacesMap.get(word)
      if (!arr) { arr = []; wordPlacesMap.set(word, arr) }
      arr.push({ name: info.name, value: cnt, kind: info.kind, avatar: info.avatar ?? null, sub: info.sub })
    }
  }
  const wordPlaces: Record<string, WordPlace[]> = {}
  for (const [word, arr] of wordPlacesMap.entries()) {
    arr.sort((a, b) => b.value - a.value)
    wordPlaces[word] = arr.slice(0, PLACES_PER_WORD)
  }

  const games: PackageGameStat[] = (account.games || []).map((g: PackageGameStat) => {
    const r = resolvedGames.get(g.id)
    return { ...g, name: r?.name || g.name, iconUrl: r?.iconUrl || null }
  })

  const bots: BotApp[] = agg.apps

  const topCustomEmojis: CustomEmojiStat[] = [...agg.customEmojis.entries()]
    .map(([id, v]) => ({ id, name: v.name, animated: v.animated, value: v.count }))
    .sort((a, b) => b.value - a.value)

  const serverStats = serverList
    .map((s) => {
      const g = guildAgg.get(s.id)
      return { id: s.id, name: s.name, messages: g?.count || 0, channels: g?.channels || 0 }
    })
    .sort((a, b) => b.messages - a.messages)

  const funFacts = gerarCuriosidades(agg, {
    totalDMs,
    dmTop: dmEntries.find((d) => d.sub !== 'grupo') || dmEntries[0],
    appOpens,
    activityMessagesSent,
  })

  return {
    language: agg.language,
    generatedAt: new Date().toISOString(),
    fileName,
    account: {
      id: account.id || agg.ownerId || '',
      username: account.username || '',
      globalName: account.globalName ?? null,
      displayName: account.displayName || account.username || 'Usuário',
      email: account.email ?? null,
      phone: account.phone ?? null,
      ip: account.ip ?? null,
      verified: !!account.verified,
      avatarDataUri,
      premiumUntil: account.premiumUntil ?? null,
      hasNitro: !!account.hasNitro,
      createdAt: account.createdAt ?? null,
      accountAgeDays: account.accountAgeDays ?? null,
      flags: account.flags || [],
      orbs: account.orbs || 0,
      dateOfBirth: account.dateOfBirth ?? null,
      predictedAge: account.predictedAge ?? null,
      relationshipsTotal: account.relationshipsTotal || 0,
      friendsCount: account.friendsCount || 0,
      blockedCount: account.blockedCount || 0,
      pendingCount: account.pendingCount || 0,
      connectionsCount: account.connectionsCount || 0,
      connections: account.connections || [],
      guildSettingsCount: account.guildSettingsCount || 0,
      payments: agg.paymentsData ?? account.payments ?? null,
      badges: account.badges || [],
      avatarDecorationUrl: account.avatarDecorationUrl ?? null,
      supportTickets: agg.supportTickets,
    },
    messages: {
      totalMessages: agg.totalMessages,
      totalCharacters: agg.totalCharacters,
      totalChannels: agg.channelCount.size,
      totalDMs,
      totalGroupDMs,
      totalGuildChannels,
      avgLength: agg.totalMessages > 0 ? Math.round(agg.totalCharacters / agg.totalMessages) : 0,
      longestMessage: agg.longest,
      firstMessageAt: agg.firstMsg ? new Date(agg.firstMsg).toISOString() : null,
      lastMessageAt: agg.lastMsg ? new Date(agg.lastMsg).toISOString() : null,
      totalLinks: agg.totalLinks,
      totalAttachments: agg.totalAttachments,
      totalMentions: agg.totalMentions,
      totalEmojisUsed: agg.totalEmojisUsed,
      totalWords: agg.totalWords,
      topDMs: dmEntries,
      topGuilds,
      topChannels: channelEntries,
      topWords: allWords,
      wordPlaces,
      topCustomEmojis,
      topEmojis: allKV(agg.emojis),
      curseWords: agg.curseWords,
      topCurses: allKV(agg.curseMap),
      byHour: agg.byHour,
      byWeekday: agg.byWeekday,
      byMonth: monthBuckets(agg.byMonthMsg),
    },
    activity: {
      hasData: agg.activityHasData,
      totalEvents: agg.totalEvents,
      eventTypes: eventTypesFull,
      messagesSent: activityMessagesSent,
      appOpens,
      sessions,
      voiceConnects,
      voiceJoins,
      reactionsAdded,
      notifications,
      slashCommands,
      guildsViewed,
      channelsOpened,
      successfulLogins,
      attemptedLogins,
      stats: activityStatsGrid,
      firstEventAt: agg.firstEvent ? new Date(agg.firstEvent).toISOString() : null,
      lastEventAt: agg.lastEvent ? new Date(agg.lastEvent).toISOString() : null,
      topGames: allKV(agg.games),
      osBreakdown: allKV(agg.os),
      browserBreakdown: allKV(agg.browser),
      topCities: allKV(agg.cities),
      topCountries: allKV(agg.countries),
      topISPs: allKV(agg.isps),
      locales: allKV(agg.locales),
      byMonth: monthBuckets(agg.byMonthEvent),
    },
    servers: {
      total: serverList.length,
      list: serverStats,
    },
    games,
    bots,
    funFacts,
    usersResolved,
  }
}

function gerarCuriosidades(
  agg: Aggregator,
  ctx: { totalDMs: number; dmTop?: TopEntry; appOpens: number; activityMessagesSent: number },
): string[] {
  const facts: string[] = []
  if (agg.totalMessages > 0) {
    facts.push(`Você enviou ${agg.totalMessages.toLocaleString('pt-BR')} mensagens no total.`)
  }
  if (agg.totalCharacters > 0) {
    facts.push(`Foram ${agg.totalCharacters.toLocaleString('pt-BR')} caracteres digitados — cerca de ${Math.round(agg.totalCharacters / 5000).toLocaleString('pt-BR')} páginas de texto.`)
  }
  const peakHour = agg.byHour.indexOf(Math.max(...agg.byHour))
  if (Math.max(...agg.byHour) > 0) {
    facts.push(`Seu horário mais ativo é por volta das ${peakHour}h (UTC).`)
  }
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const peakDay = agg.byWeekday.indexOf(Math.max(...agg.byWeekday))
  if (Math.max(...agg.byWeekday) > 0) {
    facts.push(`Você conversa mais na ${dias[peakDay]}-feira.`.replace('domingo-feira', 'domingo').replace('sábado-feira', 'sábado'))
  }
  if (ctx.dmTop) {
    facts.push(`Sua DM mais movimentada é com ${ctx.dmTop.name} (${ctx.dmTop.value.toLocaleString('pt-BR')} mensagens).`)
  }
  const topWord = topN(agg.words, 1)[0]
  if (topWord) {
    facts.push(`Sua palavra favorita é "${topWord.key}" (${topWord.value.toLocaleString('pt-BR')}x).`)
  }
  const topEmoji = topN(agg.emojis, 1)[0]
  if (topEmoji) {
    facts.push(`Seu emoji mais usado é ${topEmoji.key} (${topEmoji.value.toLocaleString('pt-BR')}x).`)
  }
  if (ctx.appOpens > 0) {
    facts.push(`Você abriu o Discord ${ctx.appOpens.toLocaleString('pt-BR')} vezes (segundo a telemetria).`)
  }
  if (agg.curseWords > 0) {
    facts.push(`Detectamos ${agg.curseWords.toLocaleString('pt-BR')} palavrões nas suas mensagens. 🤬`)
  }
  return facts
}
