import type { ApiResponse } from '@/types/api'

const API_BASE = 'http://127.0.0.1:3777/api'

/**
 * Cliente HTTP para a API REST local (porta 3777).
 * Wrapper tipado sobre fetch com métodos para cada endpoint
 */
class ApiClient {
  private baseUrl: string

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    return data as ApiResponse<T>
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  getTokens() { return this.get('/tokens') }
  addToken(label: string, token: string) { return this.post('/tokens', { label, token }) }
  removeToken(id: string) { return this.delete(`/tokens/${id}`) }
  checkToken(id: string) { return this.post(`/tokens/${id}/check`) }
  getTokenGuilds(id: string) { return this.get(`/tokens/${id}/guilds`) }
  getGuildChannels(tokenId: string, guildId: string) { return this.get(`/tokens/${tokenId}/guilds/${guildId}/channels`) }
  getTokenDms(id: string) { return this.get(`/tokens/${id}/dms`) }
  getTokenFriends(id: string) { return this.get(`/tokens/${id}/friends`) }
  hasAccounts() { return this.get<{ hasAccounts: boolean; count: number }>('/tokens/has-accounts') }
  scanTokens() { return this.post('/tokens/scan') }
  addScannedTokens(tokens: Array<{ token: string; username?: string }>) {
    return this.post('/tokens/scan/add', { tokens })
  }
  connectToken(id: string) { return this.post(`/tokens/${id}/connect`) }
  switchToken(id: string) { return this.post(`/tokens/${id}/switch`) }
  disconnectToken(id: string) { return this.post(`/tokens/${id}/disconnect`) }
  getActiveToken() { return this.get<{ connected: boolean; tokenId?: string }>('/tokens/active') }
  getProfile() { return this.get('/tokens/profile') }
  refreshProfile() { return this.post('/tokens/profile/refresh') }
  getAccountStatus() { return this.get<{ status: string; platform: string; connected: boolean }>('/tokens/account-status') }
  setAccountStatus(data: { status?: string; platform?: string }) { return this.patch('/tokens/account-status', data) }

  getTasks() { return this.get('/tools/tasks') }
  getRunningTasks() { return this.get('/tools/tasks/running') }
  cancelTask(id: string) { return this.post(`/tools/tasks/${id}/cancel`) }
  clearCompletedTasks() { return this.delete('/tools/tasks/completed') }

  runTool(tool: string, config: unknown) { return this.post(`/tools/${tool}`, config) }

  getBackups() { return this.get('/backups') }
  getBackupData(id: string) { return this.get(`/backups/${id}/data`) }
  deleteBackup(id: string) { return this.delete(`/backups/${id}`) }

  getSettings() { return this.get('/settings') }
  updateSettings(settings: unknown) { return this.patch('/settings', settings) }
  clearAllData() { return this.post('/settings/clear-all') }

  getRpcStatus() { return this.get('/rpc/status') }
  toggleRpc() { return this.post('/rpc/toggle') }
  restartRpc() { return this.post('/rpc/restart') }
  updateRpcConfig(config: unknown) { return this.patch('/rpc/config', config) }
  updateRpcPresence(data: { page?: string; details?: string; state?: string }) {
    return this.post('/rpc/presence', data)
  }
  getRpcAppInfo(appId: string) { return this.get(`/rpc/app-info/${appId}`) }

  getAnalytics(account?: string) {
    return this.get(account && account !== 'all' ? `/analytics?account=${encodeURIComponent(account)}` : '/analytics')
  }
  getMonitoringAggregate() { return this.get('/tools/monitoring/aggregate') }

  getMonitoringStatus() { return this.get('/tools/monitoring/status') }

  addMonitoringToken(token: string) { return this.post('/tools/monitoring/tokens', { token }) }
  removeMonitoringToken(id: string) { return this.delete(`/tools/monitoring/tokens/${id}`) }
  connectMonitoringToken(id: string) { return this.post(`/tools/monitoring/tokens/${id}/connect`) }
  disconnectMonitoringToken(id: string) { return this.post(`/tools/monitoring/tokens/${id}/disconnect`) }
  connectAllMonitoringTokens() { return this.post('/tools/monitoring/tokens/connect-all') }

  addMonitoredUser(userId: string) { return this.post('/tools/monitoring/users', { userId }) }
  removeMonitoredUser(id: string) { return this.delete(`/tools/monitoring/users/${id}`) }
  getMonitoredUsers() { return this.get('/tools/monitoring/users') }

  getActiveSessions() { return this.get('/tools/monitoring/sessions/active') }
  getUserSessions(userId: string, limit?: number) {
    return this.get(`/tools/monitoring/users/${userId}/sessions${limit ? `?limit=${limit}` : ''}`)
  }
  getSessionDetail(userId: string, sessionId: string) {
    return this.get(`/tools/monitoring/users/${userId}/sessions/${sessionId}`)
  }

  getUserMonitoringLogs(userId: string, date?: string) {
    return this.get(`/tools/monitoring/users/${userId}/logs${date ? `?date=${date}` : ''}`)
  }
  getUserLogDates(userId: string) {
    return this.get(`/tools/monitoring/users/${userId}/logs/dates`)
  }

  getUserMessages(userId: string, date?: string, limit?: number) {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (limit) params.set('limit', String(limit))
    const qs = params.toString()
    return this.get(`/tools/monitoring/users/${userId}/messages${qs ? `?${qs}` : ''}`)
  }
  getDeletedMessages(userId: string, limit?: number) {
    return this.get(`/tools/monitoring/users/${userId}/messages/deleted${limit ? `?limit=${limit}` : ''}`)
  }
  getMentions(userId: string, limit?: number) {
    return this.get(`/tools/monitoring/users/${userId}/messages/mentions${limit ? `?limit=${limit}` : ''}`)
  }
  getUserMessageDates(userId: string) {
    return this.get(`/tools/monitoring/users/${userId}/messages/dates`)
  }
  getUserMediaList(userId: string, type?: string, limit?: number) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (limit) params.set('limit', String(limit))
    const qs = params.toString()
    return this.get(`/tools/monitoring/users/${userId}/media${qs ? `?${qs}` : ''}`)
  }
  getMediaFileUrl(userId: string, filename: string) {
    return `${this.baseUrl}/tools/monitoring/users/${userId}/media/file/${encodeURIComponent(filename)}`
  }
  getUserMonitoringStats(userId: string) {
    return this.get(`/tools/monitoring/users/${userId}/stats`)
  }
  getDailyCallStats(userId: string, days?: number) {
    return this.get(`/tools/monitoring/users/${userId}/calls/daily${days ? `?days=${days}` : ''}`)
  }
  getUserInteractions(userId: string) {
    return this.get(`/tools/monitoring/users/${userId}/interactions`)
  }

  getKeywordAlerts() { return this.get('/tools/keyword-alerts') }
  updateKeywordAlerts(patch: unknown) { return this.patch('/tools/keyword-alerts/config', patch) }
  getKeywordAlertHistory() { return this.get('/tools/keyword-alerts/history') }
  clearKeywordAlertHistory() { return this.delete('/tools/keyword-alerts/history') }

  getStatus() { return this.get('/status') }
  getLogs(limit?: number) { return this.get(`/logs${limit ? `?limit=${limit}` : ''}`) }
  clearLogs() { return this.delete('/logs') }
}

export const api = new ApiClient()
