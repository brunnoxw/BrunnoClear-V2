import { config } from '../config'
import { logger } from '../core/logger'
import type { DiscordUser, DiscordGuild, DiscordChannel, DiscordMessage } from '../../src/types/discord'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require('discord.js-selfbot-v13')

const DISCORD_API = 'https://discord.com/api/v10'

const PLATFORM_PROPERTIES: Record<string, { $os: string; $browser: string; $device: string }> = {
  desktop: { $os: 'Windows 10', $browser: 'Discord Client', $device: '' },
  web:     { $os: 'Windows 10', $browser: 'Chrome',         $device: '' },
  mobile:  { $os: 'iOS',        $browser: 'Discord iOS',    $device: 'iPhone' },
}

/**
 * Serviço principal de comunicação com o Discord.
 * Gerencia conexão via selfbot, chamadas à API REST e operações de conta
 */
class DiscordService {
  private defaultDelay: number = config.discord.defaultDelay
  private activeClient: any = null
  private activeToken: string | null = null
  private selectedTokenId: string | null = null
  private currentPlatform: string = 'desktop'
  private clientChangeListeners: Array<(client: any | null) => void> = []

  /**
   * Registra um callback chamado sempre que o client ativo muda
   * (nova conexão ou desconexão). Útil para listeners persistentes que
   * precisam se reanexar ao trocar de conta.
   */
  onActiveClientChange(cb: (client: any | null) => void): void {
    this.clientChangeListeners.push(cb)
  }

  private emitClientChange(client: any | null): void {
    for (const cb of this.clientChangeListeners) {
      try { cb(client) } catch (err) { logger.warn('Discord', `Erro em listener de client change: ${err}`) }
    }
  }

  async fetchUserInfo(token: string): Promise<DiscordUser | null> {
    try {
      const res = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: token },
      })
      if (!res.ok) return null
      return await res.json() as DiscordUser
    } catch {
      return null
    }
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: DiscordUser }> {
    const user = await this.fetchUserInfo(token)
    if (user) return { valid: true, user }
    return { valid: false }
  }

  /**
   * Faz requisição autenticada à API REST do Discord
   * @returns {Promise<T>} Resposta parseada como JSON
   */
  async request<T = unknown>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
    const url = `${DISCORD_API}${endpoint}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Discord API ${res.status}: ${err}`)
    }
    return await res.json() as T
  }

  async fetchUserProfile(userId: string, token: string): Promise<{
    badges: Array<{ id: string; description: string; icon: string; link?: string }>
    premium_type: number
    premium_since: string | null
    premium_guild_since: string | null
    connected_accounts?: Array<{ type: string; name: string; id: string }>
    user?: { bio?: string; banner?: string; accent_color?: number }
  } | null> {
    try {
      const res = await fetch(`${DISCORD_API}/users/${userId}/profile`, {
        headers: { Authorization: token },
      })
      if (!res.ok) {
        logger.debug('Discord', `fetchUserProfile userId=${userId} status=${res.status}`)
        return null
      }
      const data = await res.json() as any
      logger.debug('Discord', `fetchUserProfile userId=${userId} badges=${(data.badges || []).length} premium_type=${data.premium_type}`)
      return {
        badges: (data.badges || []).map((b: any) => ({
          id: b.id,
          description: b.description,
          icon: b.icon,
          link: b.link || null,
        })),
        premium_type: data.premium_type || 0,
        premium_since: data.premium_since || null,
        premium_guild_since: data.premium_guild_since || null,
        connected_accounts: (data.connected_accounts || []).map((a: any) => ({
          type: a.type,
          name: a.name,
          id: a.id,
        })),
        user: data.user_profile ? {
          bio: data.user_profile.bio || undefined,
          banner: data.user?.banner || undefined,
          accent_color: data.user?.accent_color || undefined,
        } : undefined,
      }
    } catch {
      return null
    }
  }

  /**
   * Conecta ao Discord via selfbot com o token fornecido
   * @returns {Promise<DiscordUser>} Dados do usuário autenticado
   */
  async connect(token: string): Promise<DiscordUser> {
    if (this.activeClient?.isReady() && this.activeToken === token) {
      const u = this.activeClient.user
      return {
        id: u.id,
        username: u.username,
        discriminator: u.discriminator,
        avatar: u.avatar,
        premium_type: u.premiumType,
        public_flags: u.publicFlags?.bitfield,
      }
    }

    await this.disconnect()

    const wsProps = PLATFORM_PROPERTIES[this.currentPlatform] || PLATFORM_PROPERTIES.desktop
    const client = new Client({ checkUpdate: false, ws: { properties: wsProps } })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { client.destroy() } catch {}
        reject(new Error('Timeout ao conectar'))
      }, 20000)

      client.once('ready', () => {
        clearTimeout(timeout)
        resolve()
      })

      client.login(token).catch((err: Error) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    this.activeClient = client
    this.activeToken = token
    logger.info('Discord', `Client conectado: ${client.user.username}`)
    this.emitClientChange(client)

    const u = client.user
    return {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator,
      avatar: u.avatar,
      premium_type: u.premiumType,
      public_flags: u.publicFlags?.bitfield,
    }
  }

  async disconnect(): Promise<void> {
    if (this.activeClient) {
      const username = this.activeClient.user?.username || '?'
      try { this.activeClient.destroy() } catch {}
      this.activeClient = null
      this.activeToken = null
      logger.info('Discord', `Client desconectado: ${username}`)
      this.emitClientChange(null)
    }
  }

  isConnected(): boolean {
    return this.activeClient?.isReady() === true
  }

  getActiveToken(): string | null {
    return this.activeToken
  }

  getActiveAccount(): { id: string; username: string; avatarUrl: string | null } | null {
    const u = this.activeClient?.user
    if (!u || this.activeClient?.isReady?.() !== true) return null
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
      : null
    return { id: u.id, username: u.username, avatarUrl }
  }

  setSelectedTokenId(id: string | null): void {
    this.selectedTokenId = id
  }

  getSelectedTokenId(): string | null {
    return this.selectedTokenId
  }

  getAccountStatus(): { status: string; platform: string } {
    const status = this.activeClient?.isReady()
      ? (this.activeClient.user?.presence?.status || 'online')
      : 'offline'
    return { status, platform: this.currentPlatform }
  }

  async setStatus(status: 'online' | 'idle' | 'dnd' | 'invisible'): Promise<void> {
    const client = this.getClient()
    client.user.setStatus(status)
    logger.info('Discord', `Status alterado para: ${status}`)
  }

  async setPlatform(platform: 'desktop' | 'web' | 'mobile'): Promise<DiscordUser> {
    if (!this.activeToken) {
      throw new Error('Nenhuma conta conectada')
    }
    this.currentPlatform = platform
    const token = this.activeToken
    await this.disconnect()
    const user = await this.connect(token)
    logger.info('Discord', `Plataforma alterada para: ${platform}`)
    return user
  }

  private getClient(): any {
    if (!this.activeClient || !this.activeClient.isReady()) {
      throw new Error('Nenhuma conta conectada. Selecione uma conta primeiro.')
    }
    return this.activeClient
  }

  async fetchUser(userId: string): Promise<any | null> {
    if (!this.activeClient?.isReady()) return null
    try {
      return await this.activeClient.users.fetch(userId)
    } catch {
      return null
    }
  }

  getMe(): DiscordUser {
    const u = this.getClient().user
    return {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator,
      avatar: u.avatar,
      email: u.email,
      phone: u.phone,
      verified: u.verified,
      mfa_enabled: u.mfaEnabled,
      premium_type: u.premiumType,
      flags: u.flags?.bitfield,
      public_flags: u.publicFlags?.bitfield,
      banner: u.banner,
      accent_color: u.accentColor,
    }
  }

  getGuilds(): DiscordGuild[] {
    const client = this.getClient()
    return client.guilds.cache.map((g: any) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.ownerId === client.user.id,
      permissions: g.members?.me?.permissions?.bitfield?.toString() || '0',
      member_count: g.memberCount,
      features: g.features || [],
    }))
  }

  async getGuild(guildId: string): Promise<DiscordGuild> {
    const client = this.getClient()
    const g = await client.guilds.fetch(guildId)
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.ownerId === client.user.id,
      permissions: g.members?.me?.permissions?.bitfield?.toString() || '0',
      member_count: g.memberCount,
      features: g.features || [],
    }
  }

  async leaveGuild(guildId: string): Promise<void> {
    const client = this.getClient()
    const guild = await client.guilds.fetch(guildId)
    await guild.leave()
  }

  async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    const client = this.getClient()
    const guild = await client.guilds.fetch(guildId)
    const channels = await guild.channels.fetch()
    const typeMap: Record<string, number> = {
      GUILD_TEXT: 0, DM: 1, GUILD_VOICE: 2, GROUP_DM: 3,
      GUILD_CATEGORY: 4, GUILD_NEWS: 5, GUILD_STORE: 6,
      GUILD_NEWS_THREAD: 10, GUILD_PUBLIC_THREAD: 11,
      GUILD_PRIVATE_THREAD: 12, GUILD_STAGE_VOICE: 13,
      GUILD_FORUM: 15,
    }
    return channels
      .filter((c: any) => c !== null)
      .map((c: any) => ({
        id: c.id,
        type: typeof c.type === 'string' ? (typeMap[c.type] ?? -1) : c.type,
        guild_id: c.guildId,
        name: c.name,
        topic: c.topic || null,
        position: c.position,
        parent_id: c.parentId || null,
      }))
  }

  async getGuildRoles(guildId: string) {
    const client = this.getClient()
    const guild = await client.guilds.fetch(guildId)
    return guild.roles.cache.map((r: any) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      position: r.position,
      permissions: r.permissions?.bitfield?.toString(),
    }))
  }

  async getGuildEmojis(guildId: string) {
    const client = this.getClient()
    const guild = await client.guilds.fetch(guildId)
    return guild.emojis.cache.map((e: any) => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      url: e.url,
    }))
  }

  async getMessages(channelId: string, limit = 100, before?: string): Promise<DiscordMessage[]> {
    const client = this.getClient()
    const channel = await client.channels.fetch(channelId)
    const options: any = { limit }
    if (before) options.before = before

    const messages = await channel.messages.fetch(options)
    return Array.from(messages.values()).map((m: any) => ({
      id: m.id,
      channel_id: m.channelId,
      content: m.content,
      author: {
        id: m.author.id,
        username: m.author.username,
        discriminator: m.author.discriminator,
        avatar: m.author.avatar,
      },
      timestamp: m.createdAt.toISOString(),
      edited_timestamp: m.editedAt?.toISOString() || null,
    }))
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    const client = this.getClient()
    const channel = await client.channels.fetch(channelId)
    const message = await channel.messages.fetch(messageId)
    await message.delete()
  }

  async createDm(recipientId: string): Promise<DiscordChannel> {
    const client = this.getClient()
    const user = await client.users.fetch(recipientId)
    const dm = await user.createDM()
    return {
      id: dm.id,
      type: 1,
      name: user.username,
    }
  }

  async getGuildMembers(guildId: string, limit = 1000): Promise<unknown[]> {
    const client = this.getClient()
    const guild = await client.guilds.fetch(guildId)
    const members = await guild.members.fetch({ limit })
    return members.map((m: any) => ({
      id: m.id,
      username: m.user.username,
      discriminator: m.user.discriminator,
      avatar: m.user.avatar,
      nickname: m.nickname,
      joined_at: m.joinedAt?.toISOString(),
    }))
  }

  async getUserProfile(userId: string): Promise<unknown> {
    const client = this.getClient()
    const user = await client.users.fetch(userId)
    return {
      id: user.id,
      username: user.username,
      globalName: user.globalName,
      discriminator: user.discriminator,
      avatar: user.displayAvatarURL({ dynamic: true, size: 1024 }),
      banner: user.banner,
      accent_color: user.accentColor,
      bot: user.bot,
      created_at: user.createdAt?.toISOString(),
    }
  }

  async getUser(userId: string): Promise<DiscordUser> {
    const client = this.getClient()
    const u = await client.users.fetch(userId)
    return {
      id: u.id,
      username: u.username,
      discriminator: u.discriminator,
      avatar: u.avatar,
    }
  }

  getDelay(): number {
    return this.defaultDelay
  }

  setDelay(ms: number): void {
    this.defaultDelay = ms
  }

  getActiveClient(): any {
    return this.getClient()
  }

  listFriends(): string[] {
    const client = this.getClient()
    return client.relationships.cache
      .filter((v: any) => v === 1)
      .map((_v: any, k: string) => k)
  }

  async removeFriend(userId: string): Promise<void> {
    const client = this.getClient()
    await client.api.users['@me'].relationships[userId].delete({
      DiscordContext: { location: 'ContextMenu' },
    })
  }

  listOpenDMs(): any[] {
    const client = this.getClient()
    return client.channels.cache
      .filter((c: any) => c.type === 'DM')
      .map((c: any) => c)
  }

  listGroupDMs(): any[] {
    const client = this.getClient()
    return client.channels.cache
      .filter((c: any) => c.type === 'GROUP_DM')
      .map((c: any) => c)
  }

  async closeDM(channelId: string): Promise<void> {
    const client = this.getClient()
    const channel = await client.channels.fetch(channelId)
    await channel.delete()
  }

  async joinVoiceChannel(channelId: string, options?: { selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean }): Promise<any> {
    const client = this.getClient()
    const channel = client.channels.cache.get(channelId)
    if (!channel || channel.type !== 'GUILD_VOICE') throw new Error('Canal de voz não encontrado')
    return await client.voice.joinChannel(channel, {
      selfMute: options?.selfMute ?? false,
      selfDeaf: options?.selfDeaf ?? false,
      selfVideo: options?.selfVideo ?? false,
    })
  }

  async destroyAll(): Promise<void> {
    await this.disconnect()
  }
}

export const discord = new DiscordService()
