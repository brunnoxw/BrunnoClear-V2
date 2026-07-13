import type { ToolTask, ToolType } from './tools'
import type { TokenInfo } from './discord'

export type WSClientEvent =
  | 'tool:start'
  | 'tool:pause'
  | 'tool:resume'
  | 'tool:cancel'
  | 'token:add'
  | 'token:remove'
  | 'token:check'
  | 'subscribe:logs'
  | 'unsubscribe:logs'
  | 'audio:toggle-mute'
  | 'ping'

export type WSServerEvent =
  | 'tool:progress'
  | 'tool:completed'
  | 'tool:error'
  | 'tool:log'
  | 'token:status'
  | 'token:updated'
  | 'log:entry'
  | 'server:status'
  | 'audio:chunk'
  | 'audio:speaking'
  | 'audio:mode'
  | 'monitoring:voice_event'
  | 'monitoring:session_start'
  | 'monitoring:session_end'
  | 'monitoring:token_status'
  | 'monitoring:user_added'
  | 'monitoring:user_removed'
  | 'monitoring:message'
  | 'monitoring:message_delete'
  | 'monitoring:message_mention'
  | 'monitoring:media'
  | 'keyword-alert:match'
  | 'pong'
  | 'error'

export interface WSMessage<T = unknown> {
  event: WSClientEvent | WSServerEvent
  data: T
  id?: string
  timestamp: string
}

export interface WSToolProgress {
  taskId: string
  tool: ToolType
  progress: number
  total: number
  message: string
  phase?: 'fetching' | 'deleting' | 'completed' | 'backup' | 'backup-media' | 'backup-saving'
  currentUser?: {
    username: string
    avatarUrl: string | null
  }
  dmStatus?: 'searching' | 'deleting' | 'no-messages'
  dmProgress?: {
    deleted: number
    total: number
  }
}

export interface WSToolCompleted {
  taskId: string
  tool: ToolType
  results: ToolTask['results']
  duration: number
}

export interface WSToolError {
  taskId: string
  tool: ToolType
  error: string
}

export interface WSLogEntry {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'
  source: string
  message: string
  timestamp: string
  meta?: Record<string, unknown>
}

export interface WSTokenStatus {
  tokenId: string
  status: TokenInfo['status']
  user?: TokenInfo['user']
}
