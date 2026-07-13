import RPC from 'discord-rpc'
import https from 'https'
import { storage } from './storage.service'
import { taskManager } from './task-manager.service'
import { discord } from './discord.service'
import { logger } from '../core/logger'
import { config } from '../config'

let client: InstanceType<typeof RPC.Client> | null = null
let isActive = false
let appIconCache: string | null = null
let lastAppId: string | null = null
let startTimestamp: number | null = null

const DEFAULT_APP_ID = '1486120560617324644'
const DEFAULT_IMAGE = 'https://i.imgur.com/piwT2gz.jpeg'

/**
 * Busca o ícone da aplicação Discord pelo ID
 * @returns {Promise<string>} URL do ícone ou imagem padrão
 */
function fetchAppIcon(appId: string): Promise<string> {
  return new Promise((resolve) => {
    const url = `https://discord.com/api/v10/applications/${appId}/rpc`
    const req = https.get(url, { headers: { 'User-Agent': 'BrunnoClear-RPC/1.0' }, timeout: 3000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const appData = JSON.parse(data)
            if (appData.icon) {
              resolve(`https://cdn.discordapp.com/app-icons/${appId}/${appData.icon}.png`)
              return
            }
          }
        } catch {}
        resolve(DEFAULT_IMAGE)
      })
    })
    req.on('error', () => resolve(DEFAULT_IMAGE))
    req.on('timeout', () => { req.destroy(); resolve(DEFAULT_IMAGE) })
  })
}

export function fetchAppInfo(appId: string): Promise<{ name: string; icon: string | null }> {
  return new Promise((resolve) => {
    const url = `https://discord.com/api/v10/applications/${appId}/rpc`
    const req = https.get(url, { headers: { 'User-Agent': 'BrunnoClear-RPC/1.0' }, timeout: 5000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const appData = JSON.parse(data)
            resolve({
              name: appData.name || 'Unknown',
              icon: appData.icon ? `https://cdn.discordapp.com/app-icons/${appId}/${appData.icon}.png` : null,
            })
            return
          }
        } catch {}
        resolve({ name: 'Unknown', icon: null })
      })
    })
    req.on('error', () => resolve({ name: 'Unknown', icon: null }))
    req.on('timeout', () => { req.destroy(); resolve({ name: 'Unknown', icon: null }) })
  })
}

async function getTheme() {
  const settings = storage.getSettings()
  const rpc = settings.rpc
  const appId = rpc.applicationId || DEFAULT_APP_ID

  let largeImage = rpc.imagemUrl
  if (!largeImage || largeImage.trim() === '') {
    if (lastAppId !== appId) {
      appIconCache = null
      lastAppId = appId
    }
    if (appIconCache) {
      largeImage = appIconCache
    } else {
      appIconCache = await fetchAppIcon(appId)
      largeImage = appIconCache
    }
  }

  const replaceVars = (text: string) => text.replace(/\{\{versao\}\}/gi, config.app.version)

  return {
    nome: rpc.nome || 'BrunnoClear',
    estado: replaceVars(rpc.estado || ''),
    detalhes: replaceVars(rpc.detalhes || ''),
    imagemGrande: largeImage || DEFAULT_IMAGE,
    botoes: rpc.botoes || [],
  }
}

export async function initRPC(): Promise<boolean> {
  const settings = storage.getSettings()

  try {
    const appId = settings.rpc.applicationId || DEFAULT_APP_ID
    client = new RPC.Client({ transport: 'ipc' })
    RPC.register(appId)
    await client.login({ clientId: appId })
    appIconCache = null
    isActive = true
    startTimestamp = Date.now()
    logger.success('RPC', 'Rich Presence conectado')
    return true
  } catch (err: any) {
    logger.error('RPC', `Erro ao inicializar: ${err.message}`)
    isActive = false
    return false
  }
}

export async function updatePresence(presence: {
  details?: string
  state?: string
  largeImageKey?: string
  largeImageText?: string
  smallImageKey?: string
  smallImageText?: string
} = {}): Promise<void> {
  const settings = storage.getSettings()
  if (settings.rpc.desativado) return

  if (!client || !isActive) {
    const ok = await initRPC()
    if (!ok) return
  }

  try {
    const theme = await getTheme()

    let smallImage: string | undefined = presence.smallImageKey
    let smallText: string | undefined = presence.smallImageText
    if (!smallImage) {
      try {
        const me = discord.getMe()
        if (me.avatar && me.id) {
          const ext = me.avatar.startsWith('a_') ? 'gif' : 'png'
          smallImage = `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${ext}?size=128`
          smallText = smallText || me.username
        }
      } catch {
        const tokens = storage.getTokens()
        const active = tokens.find(t => t.status === 'valid' && t.user?.avatar)
        if (active?.user) {
          const { id, avatar, username } = active.user
          if (avatar) {
            const ext = avatar.startsWith('a_') ? 'gif' : 'png'
            smallImage = `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`
            smallText = smallText || username
          }
        }
      }
    }

    const activity: Record<string, unknown> = {
      state: presence.state || theme.estado || undefined,
      details: presence.details || theme.detalhes || undefined,
      largeImageKey: presence.largeImageKey || theme.imagemGrande,
      largeImageText: presence.largeImageText || theme.nome,
      smallImageKey: smallImage || undefined,
      smallImageText: smallText || undefined,
      startTimestamp: startTimestamp || undefined,
      buttons: theme.botoes.length > 0
        ? theme.botoes.slice(0, 2).filter(b => b.label && b.url)
        : undefined,
    }

    await client!.setActivity(activity)
  } catch {}
}

export async function destroyRPC(): Promise<void> {
  if (client && isActive) {
    try {
      await client.destroy()
      isActive = false
      startTimestamp = null
      logger.info('RPC', 'Rich Presence desconectado')
    } catch (err: any) {
      logger.error('RPC', `Erro ao desconectar: ${err.message}`)
    }
  }
  client = null
  isActive = false
}

export async function restartRPC(): Promise<boolean> {
  await destroyRPC()
  return initRPC()
}

export function isRPCActive(): boolean {
  return isActive
}

export function getStatus() {
  return {
    active: isActive,
    startedAt: startTimestamp ? new Date(startTimestamp).toISOString() : null,
  }
}

const PAGE_PRESENCE: Record<string, { details: string; state?: string }> = {
  '/': { details: 'Visão Geral', state: 'No dashboard' },
  '/analytics': { details: 'Analytics', state: 'Analisando estatísticas' },
  '/limpar-dm': { details: 'Limpar DM', state: 'Gerenciando mensagens' },
  '/limpar-dm-amigos': { details: 'Limpar DM Amigos', state: 'Limpeza de DMs de amigos' },
  '/limpar-dms': { details: 'Limpar DMs', state: 'Limpeza em massa' },
  '/backups': { details: 'Backups', state: 'Visualizando backups' },
  '/configuracoes': { details: 'Configurações', state: 'Ajustando configurações' },
  '/rpc': { details: 'Rich Presence', state: 'Configurando RPC' },
  '/perfil': { details: 'Perfil', state: 'Visualizando perfil' },
  '/fechar-dms': { details: 'Fechar DMs', state: 'Gerenciando DMs' },
  '/remover-amigos': { details: 'Remover Amigos', state: 'Lista de amigos' },
  '/sair-servidores': { details: 'Sair Servidores', state: 'Gerenciando servidores' },
  '/clonar-servidor': { details: 'Clonar Servidor', state: 'Clonagem de servidor' },
  '/scraper-icones': { details: 'Scraper Ícones', state: 'Coletando imagens' },
  '/limpar-package': { details: 'Limpar Package', state: 'Limpando dados exportados' },
  '/abrir-dms': { details: 'Abrir DMs', state: 'Abrindo conversas' },
  '/prefix-commands': { details: 'Comandos Prefix', state: 'Gerenciando comandos' },
  '/farm-call': { details: 'Farm Call', state: 'Preparando farm' },
  '/elevador': { details: 'Elevador', state: 'Ferramenta de call' },
  '/coleira': { details: 'Coleira', state: 'Ferramenta de call' },
  '/proteger-user': { details: 'Proteger User', state: 'Proteção anti-mute/deaf' },
  '/desconectar-call': { details: 'Desconectar Call', state: 'Ferramenta de call' },
  '/mutar-call': { details: 'Mutar Call', state: 'Ferramenta de call' },
  '/ensurdecer-call': { details: 'Ensurdecer Call', state: 'Ferramenta de call' },
  '/mover-call': { details: 'Mover Call', state: 'Ferramenta de call' },
  '/listar-call': { details: 'Listar Call', state: 'Visualizando membros' },
  '/tasks': { details: 'Gerenciador de Tasks', state: 'Monitorando tarefas' },
  '/monitoramento': { details: 'Monitoramento', state: 'Monitorando usuários' },
  '/monitoramento/config': { details: 'Config Monitoramento', state: 'Configurando tokens' },
}

const MONITORING_USER_PAGES: Record<string, { details: string; state: string }> = {
  '': { details: 'Monitoramento', state: 'Visão geral do usuário' },
  '/calls': { details: 'Monitoramento', state: 'Histórico de calls' },
  '/mensagens': { details: 'Monitoramento', state: 'Mensagens do usuário' },
  '/deletadas': { details: 'Monitoramento', state: 'Mensagens deletadas' },
  '/mencoes': { details: 'Monitoramento', state: 'Menções do usuário' },
  '/midia': { details: 'Monitoramento', state: 'Mídia do usuário' },
  '/interacoes': { details: 'Monitoramento', state: 'Interações do usuário' },
}

export async function updatePagePresence(page: string): Promise<void> {
  let mapped = PAGE_PRESENCE[page]

  if (!mapped && page.startsWith('/monitoramento/u/')) {
    const subPath = page.replace(/^\/monitoramento\/u\/[^/]+/, '')
    mapped = MONITORING_USER_PAGES[subPath] || { details: 'Monitoramento', state: 'Monitorando usuário' }
  }

  mapped = mapped || { details: 'Navegando Pelo Menu', state: undefined }
  lastPagePresence = mapped
  await updatePresence({ details: mapped.details, state: mapped.state })
}

let lastPagePresence: { details: string; state?: string } | null = null

export function getLastPagePresence() {
  return lastPagePresence
}

function setupTaskListeners() {
  taskManager.on('task:progress', async (data: { taskId: string; progress: number; total: number; message?: string; tool: string; phase?: string }) => {
    if (!client || !isActive) return
    const settings = storage.getSettings()
    if (settings.rpc.desativado) return

    const { tool, phase, progress, total, message } = data
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0

    let details: string | undefined
    let state: string | undefined
    let largeImageKey: string | undefined
    let largeImageText: string | undefined
    let smallImageKey: string | undefined
    let smallImageText: string | undefined

    if (tool === 'limpar-dm') {
      if (phase === 'fetching') {
        details = `Buscando mensagens: ${progress}`
      } else if (phase === 'deleting') {
        details = `Apagando mensagens: ${progress}/${total}`
        state = `${pct}%`
      }
    } else if (tool === 'backup') {
      if (phase === 'backup') {
        details = `Buscando mensagens: ${progress}`
      } else if (phase === 'backup-media') {
        details = `Processando anexos: ${progress}/${total}`
      } else if (phase === 'backup-saving') {
        details = `Backup criado: ${progress} mensagens`
      }
    } else if (tool === 'fechar-dms') {
      details = `Fechando DMs ${progress}/${total} [${pct}%]`
    } else if (tool === 'remover-amigos') {
      details = `Removendo amigos ${progress}/${total} [${pct}%]`
    } else if (tool === 'limpar-dm-amigos') {
      const extra = (data as any).extra
      const friendName = extra?.currentDm || ''
      if (phase === 'backup' || phase === 'backup-media' || phase === 'backup-saving') {
        details = `Backup DM: ${friendName}`
        state = `Amigo ${(extra?.dmIndex ?? 0) + 1}/${extra?.totalDms ?? '?'}`
      } else if (phase === 'fetching') {
        details = `Buscando msgs: ${friendName}`
        state = `Amigo ${(extra?.dmIndex ?? 0) + 1}/${extra?.totalDms ?? '?'}`
      } else if (phase === 'deleting') {
        details = `Apagando: ${friendName} ${progress}/${total}`
        state = `${pct}% — Amigo ${(extra?.dmIndex ?? 0) + 1}/${extra?.totalDms ?? '?'}`
      }
    } else if (tool === 'remover-servidores') {
      details = `Removendo servidores ${progress}/${total} [${pct}%]`
    } else if (tool === 'clonar-servidor') {
      const task = taskManager.getTask(data.taskId)
      const sourceGuildIcon = (task?.config as any)?.sourceGuildIcon
      const sourceGuildName = (task?.config as any)?.sourceGuildName
      details = 'Clonando servidor'
      state = message || 'Preparando...'
      if (sourceGuildIcon) {
        smallImageKey = sourceGuildIcon
        smallImageText = sourceGuildName
      }
    } else if (tool === 'scraper-icons') {
      details = 'Scraper de Icons'
      if (phase === 'collecting') {
        state = `${progress} imagens coletadas`
      } else if (phase === 'sending') {
        state = `${progress}/${total} enviadas`
      } else {
        state = message || 'Coletando imagens...'
      }
    } else if (tool === 'limpar-dms-abertas') {
      details = `Apagando ${progress}/${total} [${pct}%]`
      state = `${progress}/${total}`
    } else if (tool === 'call-utils') {
      const task = taskManager.getTask(data.taskId)
      const subAction = (task?.config as any)?.subAction
      if (subAction === 'farm-hours') {
        const channelName = (task?.config as any)?.channelName || 'call'
        const guildName = (task?.config as any)?.guildName || 'servidor'
        const guildIcon = (task?.config as any)?.guildIcon
        details = `Farmando em: ${channelName}`
        state = guildName
        if (guildIcon) {
          largeImageKey = guildIcon
          largeImageText = guildName
        }
      } else if (subAction === 'elevator') {
        const username = (task?.config as any)?.username || 'user'
        details = `Elevador: ${progress} movimentos`
        state = `Movendo ${username}`
      } else if (subAction === 'leash') {
        const usernames = (task?.config as any)?.usernames || []
        const guildIcon = (task?.config as any)?.guildIcon
        const guildName = (task?.config as any)?.guildName
        details = `Coleira: ${progress} puxadas`
        state = `${usernames.length} usuário(s) na coleira`
        if (guildIcon) {
          smallImageKey = guildIcon
          smallImageText = guildName
        }
      } else if (subAction === 'protect') {
        const usernames = (task?.config as any)?.usernames || []
        const guildIcon = (task?.config as any)?.guildIcon
        const guildName = (task?.config as any)?.guildName
        details = `Proteções: ${progress}`
        state = `Protegendo ${usernames.length} usuário(s)`
        if (guildIcon) {
          smallImageKey = guildIcon
          smallImageText = guildName
        }
      } else {
        details = 'Call Utils'
        state = message || undefined
      }
    } else if (tool === 'prefix-commands') {
      details = message || 'Comandos Prefix'
      state = 'Comando executado'
    } else if (tool === 'limpar-package') {
      details = `Package - ${pct}%`
      state = `${progress}/${total} DMs processadas`
    } else if (tool === 'abrir-dms') {
      details = `Abrir DMs - ${pct}%`
      state = `${progress}/${total} DMs abertas`
    }

    if (details) {
      await updatePresence({ details, state, largeImageKey, largeImageText, smallImageKey, smallImageText })
    }
  })

  const restorePresence = async () => {
    if (!client || !isActive) return
    setTimeout(async () => {
      const running = taskManager.getRunningTasks()
      if (running.length === 0) {
        await updatePresence({ details: 'No menu principal' })
      }
    }, 1500)
  }

  taskManager.on('task:completed', restorePresence)
  taskManager.on('task:error', restorePresence)
  taskManager.on('task:cancelled', restorePresence)
}

setupTaskListeners()
