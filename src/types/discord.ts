export interface DiscordUser {
  id: string
  username: string
  global_name?: string | null
  discriminator: string
  avatar: string | null
  email?: string
  phone?: string
  verified?: boolean
  mfa_enabled?: boolean
  premium_type?: number
  flags?: number
  public_flags?: number
  banner?: string | null
  accent_color?: number | null
  locale?: string
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  member_count?: number
  features: string[]
}

export interface DiscordMember {
  id: string
  username: string
  global_name?: string | null
  discriminator: string
  avatar: string | null
  avatarUrl?: string | null
  nickname?: string | null
  bot?: boolean
  joined_at?: string
}

export interface MiniProfile {
  id: string
  username: string
  globalName?: string | null
  avatarUrl: string | null
  bot: boolean
  createdAt: string
  badges: Badge[]
  premiumType: number
  mutualGuilds: number
}

export interface DiscordChannel {
  id: string
  type: number
  guild_id?: string
  name?: string
  topic?: string | null
  position?: number
  parent_id?: string | null
}

export interface DiscordMessage {
  id: string
  channel_id: string
  content: string
  author: DiscordUser
  timestamp: string
  edited_timestamp: string | null
}

export interface DiscordWebhook {
  id: string
  type: number
  guild_id?: string
  channel_id: string
  name: string | null
  avatar: string | null
  token?: string
  url?: string
}

export interface Badge {
  name: string
  url: string
  tooltip: string
}

export interface CachedProfile {
  badges: Badge[]
  premiumType: number
  premiumSince: string | null
  premiumGuildSince: string | null
  createdAt: string
  cachedAt: string
  nitroMonths?: number
  connectedAccounts?: Array<{ type: string; name: string; id: string }>
}

export interface TokenInfo {
  id: string
  token: string
  label: string
  user?: DiscordUser
  status: 'valid' | 'invalid' | 'checking' | 'rate-limited'
  addedAt: string
  lastCheckedAt?: string
  avatarUrl?: string
  badges?: Badge[]
  profileData?: CachedProfile
}

export interface TokenCheckResult {
  token: string
  valid: boolean
  user?: DiscordUser
  error?: string
  nitro?: string
  billing?: boolean
}

export enum ChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_ANNOUNCEMENT = 5,
  GUILD_STORE = 6,
  GUILD_STAGE_VOICE = 13,
  GUILD_FORUM = 15,
}
