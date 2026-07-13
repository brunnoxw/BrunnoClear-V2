export interface KeywordAlertConfig {
  enabled: boolean
  keywords: string[]
  ignoreOwn: boolean
  ignoreBots: boolean
  caseSensitive: boolean
  wholeWord: boolean
  dmOnly: boolean
}

export interface KeywordAlertMatch {
  id: string
  keyword: string
  content: string
  authorId: string
  authorUsername: string
  authorAvatarUrl: string | null
  channelId: string
  channelName: string
  guildId: string | null
  guildName: string
  guildIcon: string | null
  isDM: boolean
  messageUrl: string
  timestamp: string
}

export interface KeywordAlertStatus {
  config: KeywordAlertConfig
  historyCount: number
  connected: boolean
  attached: boolean
}
