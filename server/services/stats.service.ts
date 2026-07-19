import fs from 'fs'
import path from 'path'
import { config } from '../config'
import { logger } from '../core/logger'
import { discord } from './discord.service'

export interface AccountRef {
  accountId?: string
  accountUsername?: string
  accountAvatar?: string | null
}

export type CleanupSource = 'dm' | 'package' | 'dms-abertas' | 'amigos'

export interface CleanupRecord extends AccountRef {
  id: string
  username: string
  userId: string
  avatarUrl: string | null
  messagesDeleted: number
  messagesScanned: number
  duration: number
  date: string
  backup?: boolean
  source?: CleanupSource
}

export type ToolActionType =
  | 'backup'
  | 'clonar-servidor'
  | 'fechar-dms'
  | 'remover-amigos'
  | 'limpar-dm-amigos'
  | 'remover-servidores'
  | 'scraper-icons'
  | 'call-utils'
  | 'prefix-commands'

export interface ToolActionRecord extends AccountRef {
  id: string
  type: ToolActionType
  date: string
  duration: number
  details: Record<string, number | string>
}

export interface AccountSummary {
  id: string
  username: string
  avatar: string | null
  cleanups: number
  actions: number
  messagesDeleted: number
}

export interface AnalyticsData {
  totalMessagesDeleted: number
  totalUsersCleanedUnique: number
  totalCleanups: number
  totalTimeSpent: number
  cleanups: CleanupRecord[]
  toolActions: ToolActionRecord[]
  accounts: AccountSummary[]
  scope: string
}

interface StoredData {
  cleanups: CleanupRecord[]
  toolActions: ToolActionRecord[]
}

class StatsService {
  private data: StoredData = { cleanups: [], toolActions: [] }

  // Resolvido dinamicamente: config.storage.dataPath só recebe o valor final
  // (userData do Electron) depois que initDataPath() roda, após este singleton
  // já ter sido construído.
  private get filePath(): string {
    return path.join(config.storage.dataPath, 'analytics.json')
  }

  load(): StoredData {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        this.data = {
          cleanups: Array.isArray(parsed.cleanups) ? parsed.cleanups : [],
          toolActions: Array.isArray(parsed.toolActions) ? parsed.toolActions : [],
        }
      } else {
        this.data = { cleanups: [], toolActions: [] }
      }
    } catch (err) {
      logger.error('Stats', `Erro ao carregar analytics: ${err}`)
    }
    return this.data
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      logger.error('Stats', `Erro ao salvar analytics: ${err}`)
    }
  }

  private currentAccount(): AccountRef {
    const acc = discord.getActiveAccount()
    if (!acc) return {}
    return { accountId: acc.id, accountUsername: acc.username, accountAvatar: acc.avatarUrl }
  }

  recordCleanup(record: Omit<CleanupRecord, 'id' | 'date' | keyof AccountRef>): void {
    this.data.cleanups.push({
      id: `cleanup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...this.currentAccount(),
      ...record,
      date: new Date().toISOString(),
    })
    this.save()
    logger.info('Stats', `Cleanup registrado: ${record.messagesDeleted} msgs de ${record.username}`)
  }

  recordAction(type: ToolActionType, duration: number, details: Record<string, number | string>): void {
    this.data.toolActions.push({
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...this.currentAccount(),
      type,
      date: new Date().toISOString(),
      duration,
      details,
    })
    this.save()
    logger.info('Stats', `Action registrada: ${type} (${duration}s)`)
  }

  getAnalytics(accountId?: string): AnalyticsData {
    const scope = accountId && accountId !== 'all' ? accountId : 'all'

    const cleanups = scope === 'all'
      ? this.data.cleanups
      : this.data.cleanups.filter((c) => c.accountId === scope)
    const toolActions = scope === 'all'
      ? this.data.toolActions
      : this.data.toolActions.filter((a) => a.accountId === scope)

    const uniqueUsers = new Set(
      cleanups.filter((c) => c.source !== 'package').map((c) => c.userId),
    )

    return {
      totalMessagesDeleted: cleanups.reduce((s, c) => s + (c.messagesDeleted || 0), 0),
      totalUsersCleanedUnique: uniqueUsers.size,
      totalCleanups: cleanups.length,
      totalTimeSpent: cleanups.reduce((s, c) => s + (c.duration || 0), 0),
      cleanups,
      toolActions,
      accounts: this.buildAccountSummaries(),
      scope,
    }
  }

  private buildAccountSummaries(): AccountSummary[] {
    const map = new Map<string, AccountSummary>()

    const ensure = (r: AccountRef): AccountSummary | null => {
      if (!r.accountId) return null
      let s = map.get(r.accountId)
      if (!s) {
        s = { id: r.accountId, username: r.accountUsername || 'Conta', avatar: r.accountAvatar ?? null, cleanups: 0, actions: 0, messagesDeleted: 0 }
        map.set(r.accountId, s)
      } else if (r.accountUsername) {
        s.username = r.accountUsername
        if (r.accountAvatar !== undefined) s.avatar = r.accountAvatar ?? s.avatar
      }
      return s
    }

    for (const c of this.data.cleanups) {
      const s = ensure(c)
      if (s) { s.cleanups++; s.messagesDeleted += c.messagesDeleted || 0 }
    }
    for (const a of this.data.toolActions) {
      const s = ensure(a)
      if (s) s.actions++
    }

    return [...map.values()].sort((a, b) => (b.cleanups + b.actions) - (a.cleanups + a.actions))
  }
}

export const stats = new StatsService()
