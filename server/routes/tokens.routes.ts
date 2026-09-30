/**
 * Rotas de gerenciamento de tokens Discord
 * @returns {Router} CRUD de tokens, validação, perfil, scan e conexão
 */
import { Router } from 'express'
import { storage } from '../services/storage.service'
import { discord } from '../services/discord.service'
import { scanForTokens, validateDiscoveredToken } from '../services/token-scanner.service'
import { cacheAvatar, getCachedAvatarPath, refreshAllAvatars } from '../services/avatar-cache.service'
import { updatePresence, isRPCActive, getLastPagePresence } from '../services/rpc.service'
import { config } from '../config'
import { decodeBadges, processProfileBadges } from '../utils/badges'
import { logger } from '../core/logger'
import { z } from 'zod'
import { validate } from '../middleware/validation.middleware'

const router = Router()

function getAvatarUrl(userId?: string, avatarHash?: string | null): string | undefined {
  if (!userId) return undefined
  const cached = getCachedAvatarPath(userId)
  if (cached) {
    const filename = cached.split(/[\\/]/).pop()
    return `http://${config.server.host}:${config.server.port}/avatars/${filename}`
  }
  if (avatarHash) {
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=128`
  }
  return undefined
}

const addTokenSchema = z.object({
  label: z.string().min(1).max(50),
  token: z.string().min(10),
})

/**
 * Retorna todas as tokens cadastradas
 * @returns {Object} Lista de tokens com badges e avatar
 */
router.get('/', (_req, res) => {
  const tokens = storage.getTokens().map((t) => {
    const badges = (t as any).profileData?.badges || (t as any).badges || []
    logger.debug('Tokens', `GET / token=${t.id} userId=${t.user?.id} badges=${badges.length}`)
    return {
      ...t,
      token: `${t.token.slice(0, 6)}...${t.token.slice(-4)}`,
      avatarUrl: getAvatarUrl(t.user?.id, t.user?.avatar),
      badges,
    }
  })
  res.json({ success: true, data: tokens, timestamp: new Date().toISOString() })
})

/**
 * Adiciona uma nova token Discord
 * @returns {Object} Token criada com dados do usuário
 */
router.post('/', validate(addTokenSchema), async (req, res) => {
  const { label, token: tokenValue } = req.body
  
  const result = await discord.validateToken(tokenValue)

  if (!result.valid || !result.user) {
    res.status(401).json({
      success: false,
      error: 'Token inválida ou expirada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  const newToken = storage.addToken({
    label,
    token: tokenValue,
    user: result.user,
  })

  let badges: any[] = []
  let profileData: any = null

  const profile = await discord.fetchUserProfile(result.user.id, tokenValue)
  if (profile) {
    badges = processProfileBadges(profile.badges, profile.premium_since, profile.premium_guild_since)
    const createdTimestamp = Number(BigInt(result.user.id) >> BigInt(22)) + 1420070400000
    const nitroMonths = profile.premium_since
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.premium_since).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
      : 0
    profileData = {
      badges,
      premiumType: profile.premium_type,
      premiumSince: profile.premium_since,
      premiumGuildSince: profile.premium_guild_since,
      createdAt: new Date(createdTimestamp).toISOString(),
      cachedAt: new Date().toISOString(),
      nitroMonths,
      connectedAccounts: profile.connected_accounts || [],
    }
    logger.info('Tokens', `POST / userId=${result.user.id} ${badges.length} badges via /profile (cacheado)`)
  } else {
    logger.warn('Tokens', `POST / userId=${result.user.id} /profile falhou, badges ficarão vazias até refresh`)
  }

  storage.updateToken(newToken.id, { status: 'valid', user: result.user, badges, profileData } as any)
  cacheAvatar(result.user.id, result.user.avatar ?? null).catch(() => {})
  if (!discord.isConnected()) {
    discord.connect(tokenValue).catch(() => {})
  }

  discord.setSelectedTokenId(newToken.id)

  const responseToken = {
    ...storage.getTokenById(newToken.id),
    token: `${tokenValue.slice(0, 6)}...${tokenValue.slice(-4)}`,
  }

  res.status(201).json({
    success: true,
    data: responseToken,
    timestamp: new Date().toISOString(),
  })
})

/**
 * Verifica se existem contas cadastradas
 * @returns {Object} Flag hasAccounts e contagem
 */
router.get('/has-accounts', (_req, res) => {
  const tokens = storage.getTokens()
  res.json({
    success: true,
    data: { hasAccounts: tokens.length > 0, count: tokens.length },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Revalida todas as tokens cadastradas contra a API do Discord.
 * Tokens definitivamente inválidas (401/403) são REMOVIDAS automaticamente.
 * Falhas transitórias (rede, rate-limit) são preservadas para não apagar
 * contas por queda de internet.
 * @returns {Object} Contas removidas e total restante
 */
router.post('/validate-all', async (_req, res) => {
  const tokens = [...storage.getTokens()]
  const removed: Array<{ id: string; label: string; userId?: string }> = []

  for (const token of tokens) {
    const result = await discord.validateToken(token.token)

    if (result.valid && result.user) {
      storage.updateToken(token.id, {
        status: 'valid',
        user: result.user,
        lastCheckedAt: new Date().toISOString(),
      })
      continue
    }

    if (result.reason === 'unauthorized') {
      if (discord.getActiveToken() === token.token) {
        await discord.disconnect()
      }
      if (discord.getSelectedTokenId() === token.id) {
        discord.setSelectedTokenId(null)
      }
      storage.removeToken(token.id)
      removed.push({ id: token.id, label: token.label, userId: token.user?.id })
      logger.info('Tokens', `validate-all: token ${token.id} (${token.label}) removida — inválida (401/403)`)
      continue
    }

    storage.updateToken(token.id, {
      status: result.reason === 'rate-limited' ? 'rate-limited' : 'invalid',
      lastCheckedAt: new Date().toISOString(),
    })
    logger.warn('Tokens', `validate-all: token ${token.id} não validada (${result.reason}) — mantida`)
  }

  res.json({
    success: true,
    data: { removed, remaining: storage.getTokens().length },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Retorna a token ativa/selecionada no momento
 * @returns {Object} Dados da conta conectada ou status desconectado
 */
router.get('/active', async (_req, res) => {
  const selectedId = discord.getSelectedTokenId()
  const activeToken = discord.getActiveToken()

  if (selectedId) {
    const token = storage.getTokenById(selectedId)
    if (token?.user) {
      const badges = (token as any).profileData?.badges || (token as any).badges || []
      const clientConnected = activeToken === token.token && discord.isConnected()
      logger.debug('Tokens', `GET /active (selected) userId=${token.user.id} clientConnected=${clientConnected}`)
      res.json({
        success: true,
        data: {
          connected: true,
          clientConnected,
          tokenId: token.id,
          user: token.user,
          avatarUrl: getAvatarUrl(token.user.id, token.user.avatar),
          badges,
        },
        timestamp: new Date().toISOString(),
      })
      return
    }
  }

  if (!activeToken || !discord.isConnected()) {
    res.json({
      success: true,
      data: { connected: false },
      timestamp: new Date().toISOString(),
    })
    return
  }

  const tokens = storage.getTokens()
  const token = tokens.find((t) => t.token === activeToken)
  if (!token) {
    res.json({
      success: true,
      data: { connected: false },
      timestamp: new Date().toISOString(),
    })
    return
  }

  const badges = (token as any).profileData?.badges || (token as any).badges || []
  logger.debug('Tokens', `GET /active userId=${token.user?.id} badges=${badges.length}`)

  res.json({
    success: true,
    data: {
      connected: true,
      clientConnected: true,
      tokenId: token.id,
      user: token.user,
      avatarUrl: getAvatarUrl(token.user?.id, token.user?.avatar),
      badges,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Atualiza o cache de avatares de todas as contas
 * @returns {Object} Confirmação de atualização
 */
router.post('/refresh-avatars', async (_req, res) => {
  await refreshAllAvatars()
  res.json({
    success: true,
    message: 'Avatares atualizados',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Retorna o perfil completo da conta selecionada
 * @returns {Object} Usuário, badges, profileData e avatar
 */
router.get('/profile', async (_req, res) => {
  const selectedId = discord.getSelectedTokenId()
  const activeToken = discord.getActiveToken()

  let token = selectedId ? storage.getTokenById(selectedId) : null
  if (!token && activeToken) {
    token = storage.getTokens().find((t) => t.token === activeToken) || null
  }

  if (!token?.user) {
    res.status(400).json({
      success: false,
      error: 'Nenhuma conta selecionada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  const profileData = (token as any).profileData || null
  const badges = profileData?.badges || (token as any).badges || []

  res.json({
    success: true,
    data: {
      user: token.user,
      avatarUrl: getAvatarUrl(token.user.id, token.user.avatar),
      badges,
      profileData,
      tokenId: token.id,
      label: token.label,
      addedAt: token.addedAt,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Atualiza o perfil da conta selecionada via API do Discord
 * @returns {Object} Perfil atualizado com badges e dados novos
 */
router.post('/profile/refresh', async (_req, res) => {
  const selectedId = discord.getSelectedTokenId()
  const activeToken = discord.getActiveToken()

  let token = selectedId ? storage.getTokenById(selectedId) : null
  if (!token && activeToken) {
    token = storage.getTokens().find((t) => t.token === activeToken) || null
  }

  if (!token?.user) {
    res.status(400).json({ success: false, error: 'Nenhuma conta selecionada', timestamp: new Date().toISOString() })
    return
  }

  const profile = await discord.fetchUserProfile(token.user.id, token.token)
  let badges = (token as any).profileData?.badges || (token as any).badges || []
  let profileData: any = (token as any).profileData || null

  if (profile) {
    badges = processProfileBadges(profile.badges, profile.premium_since, profile.premium_guild_since)
    const createdTimestamp = Number(BigInt(token.user.id) >> BigInt(22)) + 1420070400000
    const nitroMonths = profile.premium_since
      ? Math.max(0, Math.floor((Date.now() - new Date(profile.premium_since).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
      : 0
    profileData = {
      badges,
      premiumType: profile.premium_type,
      premiumSince: profile.premium_since,
      premiumGuildSince: profile.premium_guild_since,
      createdAt: new Date(createdTimestamp).toISOString(),
      cachedAt: new Date().toISOString(),
      nitroMonths,
      connectedAccounts: profile.connected_accounts || [],
    }
    logger.info('Tokens', `POST /profile/refresh userId=${token.user.id} ${badges.length} badges atualizadas`)
  } else {
    logger.warn('Tokens', `POST /profile/refresh userId=${token.user.id} /profile falhou, mantendo cache anterior`)
  }

  storage.updateToken(token.id, { badges, profileData } as any)

  res.json({
    success: true,
    data: {
      user: token.user,
      avatarUrl: getAvatarUrl(token.user.id, token.user.avatar),
      badges,
      profileData,
      tokenId: token.id,
      label: token.label,
      addedAt: token.addedAt,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Retorna o status atual da conta (online, idle, dnd, etc)
 * @returns {Object} Status, plataforma e estado de conexão
 */
router.get('/account-status', (_req, res) => {
  const { status, platform } = discord.getAccountStatus()
  res.json({
    success: true,
    data: { status, platform, connected: discord.isConnected() },
    timestamp: new Date().toISOString(),
  })
})

const accountStatusSchema = z.object({
  status: z.enum(['online', 'idle', 'dnd', 'invisible']).optional(),
  platform: z.enum(['desktop', 'web', 'mobile']).optional(),
})

/**
 * Altera o status ou plataforma da conta conectada
 * @returns {Object} Status atualizado da conta
 */
router.patch('/account-status', validate(accountStatusSchema), async (req, res) => {
  const { status, platform } = req.body

  if (!discord.isConnected()) {
    res.status(400).json({
      success: false,
      error: 'Nenhuma conta conectada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  try {
    if (platform) {
      await discord.setPlatform(platform)
    }
    if (status) {
      await discord.setStatus(status)
    }
    const current = discord.getAccountStatus()
    res.json({
      success: true,
      data: current,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao alterar status',
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * Escaneia o sistema em busca de tokens Discord
 * @returns {Object} Lista de tokens descobertas e validadas
 */
router.post('/scan', async (_req, res) => {
  const discovered = await scanForTokens()

  const validated = await Promise.all(
    discovered.map(async (d) => {
      const result = await validateDiscoveredToken(d.token)
      return {
        ...d,
        ...result,
        token: `${d.token.slice(0, 6)}...${d.token.slice(-4)}`,
        fullToken: d.token,
      }
    })
  )

  const validTokens = validated.filter((t) => t.valid)

  const seenUserIds = new Set<string>()
  const uniqueTokens = validTokens.filter((t) => {
    if (!t.id) return true
    if (seenUserIds.has(t.id)) return false
    seenUserIds.add(t.id)
    return true
  })

  const existingTokens = storage.getTokens()
  const newTokens = uniqueTokens.filter(
    (t) => !existingTokens.some((et) => et.token === t.fullToken || (t.id && et.user?.id === t.id))
  )

  const enriched = newTokens.map((t) => {
    const avatarUrl = t.id && t.avatar
      ? `https://cdn.discordapp.com/avatars/${t.id}/${t.avatar}.${t.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : null
    const badges = decodeBadges(t.public_flags, t.premium_type)
    return { ...t, avatarUrl, badges }
  })

  res.json({
    success: true,
    data: enriched.map(({ fullToken, ...rest }) => rest),
    _internal: enriched.map((t) => ({ token: t.fullToken, source: t.source })),
    timestamp: new Date().toISOString(),
  })
})

/**
 * Adiciona tokens descobertas pelo scan ao sistema
 * @returns {Object} Tokens adicionadas com dados validados
 */
router.post('/scan/add', async (req, res) => {
  const { tokens: tokenList } = req.body as { tokens: Array<{ token: string; username?: string }> }

  if (!Array.isArray(tokenList) || tokenList.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Lista de tokens vazia',
      timestamp: new Date().toISOString(),
    })
    return
  }

  const added = []
  const addedUserIds = new Set<string>()
  for (const item of tokenList) {
    const result = await discord.validateToken(item.token)

    const existingTokens = storage.getTokens()
    if (result.user?.id) {
      if (addedUserIds.has(result.user.id) || existingTokens.some((et) => et.user?.id === result.user?.id)) continue
      addedUserIds.add(result.user.id)
    }

    const label = result.user?.username || item.username || `Conta ${Date.now().toString(36)}`

    const newToken = storage.addToken({
      label,
      token: item.token,
      user: result.user,
    })

    let badges: any[] = []
    let profileData: any = null

    if (result.valid && result.user) {
      const profile = await discord.fetchUserProfile(result.user.id, item.token)
      if (profile) {
        badges = processProfileBadges(profile.badges, profile.premium_since, profile.premium_guild_since)
        const createdTimestamp = Number(BigInt(result.user.id) >> BigInt(22)) + 1420070400000
        const nitroMonths = profile.premium_since
          ? Math.max(0, Math.floor((Date.now() - new Date(profile.premium_since).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
          : 0
        profileData = {
          badges,
          premiumType: profile.premium_type,
          premiumSince: profile.premium_since,
          premiumGuildSince: profile.premium_guild_since,
          createdAt: new Date(createdTimestamp).toISOString(),
          cachedAt: new Date().toISOString(),
          nitroMonths,
          connectedAccounts: profile.connected_accounts || [],
        }
      }
    }

    storage.updateToken(newToken.id, {
      status: result.valid ? 'valid' : 'invalid',
      user: result.user,
      badges,
      profileData,
    } as any)

    if (result.valid && result.user?.id) {
      await cacheAvatar(result.user.id, result.user.avatar ?? null).catch(() => {})
    }

    added.push({
      ...storage.getTokenById(newToken.id),
      token: `${item.token.slice(0, 6)}...${item.token.slice(-4)}`,
    })
  }

  res.status(201).json({
    success: true,
    data: added,
    message: `${added.length} token(s) adicionada(s)`,
    timestamp: new Date().toISOString(),
  })

  if (!discord.isConnected() && added.length > 0) {
    const firstValid = added.find((t: any) => t?.status === 'valid')
    if (firstValid) {
      const stored = storage.getTokenById(firstValid.id as string)
      if (stored?.token) discord.connect(stored.token).catch(() => {})
    }
  }
})

/**
 * Remove uma token pelo ID
 * @returns {Object} Confirmação de remoção
 */
router.delete('/:id', async (req, res) => {
  const token = storage.getTokenById(req.params.id)
  if (!token) {
    res.status(404).json({
      success: false,
      error: 'Token não encontrada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (discord.getActiveToken() === token.token) {
    await discord.disconnect()
  }

  storage.removeToken(req.params.id)
  res.json({ success: true, message: 'Token removida', timestamp: new Date().toISOString() })
})

/**
 * Troca a conta: desconecta a atual e conecta na nova
 * @returns {Object} Dados da nova conta conectada
 */
router.post('/:id/switch', async (_req, res) => {
  const token = storage.getTokenById(_req.params.id)
  if (!token) {
    res.status(404).json({
      success: false,
      error: 'Token não encontrada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  try {
    await discord.disconnect()
    await discord.connect(token.token)
    discord.setSelectedTokenId(token.id)
  } catch (err) {
    logger.error('Tokens', `POST /switch userId=${token.user?.id} falha ao conectar: ${err}`)
    res.status(500).json({
      success: false,
      error: `Falha ao conectar: ${err instanceof Error ? err.message : err}`,
      timestamp: new Date().toISOString(),
    })
    return
  }

  const badges = (token as any).profileData?.badges || (token as any).badges || []

  logger.info('Tokens', `POST /switch conectado como userId=${token.user?.id}`)

  if (isRPCActive()) {
    const page = getLastPagePresence()
    if (page) {
      updatePresence({ details: page.details, state: page.state }).catch(() => {})
    } else {
      updatePresence().catch(() => {})
    }
  }

  res.json({
    success: true,
    data: {
      connected: true,
      clientConnected: true,
      tokenId: token.id,
      user: token.user,
      avatarUrl: getAvatarUrl(token.user?.id, token.user?.avatar),
      badges,
      profileData: (token as any).profileData || null,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Conecta ao Discord usando a token especificada
 * @returns {Object} Dados do usuário conectado com badges
 */
router.post('/:id/connect', async (req, res) => {
  const token = storage.getTokenById(req.params.id)
  if (!token) {
    res.status(404).json({
      success: false,
      error: 'Token não encontrada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  try {
    const user = await discord.connect(token.token)
    discord.setSelectedTokenId(token.id)

    const existingProfile = (token as any).profileData
    let badges = existingProfile?.badges || (token as any).badges || []
    let profileData = existingProfile || null

    if (!existingProfile) {
      logger.debug('Tokens', `POST /connect userId=${user.id} sem cache, buscando /profile...`)
      const profile = await discord.fetchUserProfile(user.id, token.token)
      if (profile) {
        badges = processProfileBadges(profile.badges, profile.premium_since, profile.premium_guild_since)
        const createdTimestamp = Number(BigInt(user.id) >> BigInt(22)) + 1420070400000
        const nitroMonths = profile.premium_since
          ? Math.max(0, Math.floor((Date.now() - new Date(profile.premium_since).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
          : 0
        profileData = {
          badges,
          premiumType: profile.premium_type,
          premiumSince: profile.premium_since,
          premiumGuildSince: profile.premium_guild_since,
          createdAt: new Date(createdTimestamp).toISOString(),
          cachedAt: new Date().toISOString(),
          nitroMonths,
          connectedAccounts: profile.connected_accounts || [],
        }
        logger.debug('Tokens', `POST /connect userId=${user.id} ${badges.length} badges do /profile`)
      } else {
        logger.warn('Tokens', `POST /connect userId=${user.id} /profile falhou, badges vazias`)
      }
    } else {
      logger.debug('Tokens', `POST /connect userId=${user.id} usando profile cacheado (${badges.length} badges)`)
    }

    if (profileData) {
      storage.updateToken(token.id, { badges, profileData } as any)
    }

    if (isRPCActive()) {
      const page = getLastPagePresence()
      if (page) {
        updatePresence({ details: page.details, state: page.state }).catch(() => {})
      } else {
        updatePresence().catch(() => {})
      }
    }

    res.json({
      success: true,
      data: { connected: true, user, avatarUrl: getAvatarUrl(user.id, user.avatar), badges, profileData },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Falha ao conectar: ${err instanceof Error ? err.message : err}`,
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * Desconecta a conta do Discord
 * @returns {Object} Confirmação de desconexão
 */
router.post('/:id/disconnect', async (_req, res) => {
  await discord.disconnect()
  res.json({
    success: true,
    message: 'Desconectado',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Verifica se a token ainda é válida
 * @returns {Object} Token com status atualizado
 */
router.post('/:id/check', async (req, res) => {
  const token = storage.getTokenById(req.params.id)
  if (!token) {
    res.status(404).json({
      success: false,
      error: 'Token não encontrada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  storage.updateToken(token.id, { status: 'checking' })

  const result = await discord.validateToken(token.token)
  const newStatus = result.valid ? 'valid' : 'invalid'
  const updated = storage.updateToken(token.id, {
    status: newStatus,
    user: result.user,
    lastCheckedAt: new Date().toISOString(),
  })

  res.json({
    success: true,
    data: {
      ...updated,
      token: `${token.token.slice(0, 6)}...${token.token.slice(-4)}`,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * Retorna os servidores da conta conectada
 * @returns {Object} Lista de guilds do usuário
 */
router.get('/:id/guilds', async (req, res) => {
  const token = storage.getTokenById(req.params.id)
  if (!token) {
    res.status(404).json({
      success: false,
      error: 'Token não encontrada',
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (!discord.isConnected() || discord.getActiveToken() !== token.token) {
    res.status(400).json({
      success: false,
      error: 'Conta não está conectada. Conecte primeiro.',
      timestamp: new Date().toISOString(),
    })
    return
  }

  const guilds = discord.getGuilds()
  res.json({ success: true, data: guilds, timestamp: new Date().toISOString() })
})

/**
 * Retorna os canais de um servidor específico
 * @returns {Object} Lista de canais do guild
 */
router.get('/:id/guilds/:guildId/channels', async (req, res) => {
  const token = storage.getTokenById(req.params.id)
  if (!token) {
    res.status(404).json({ success: false, error: 'Token não encontrada', timestamp: new Date().toISOString() })
    return
  }
  if (!discord.isConnected() || discord.getActiveToken() !== token.token) {
    res.status(400).json({ success: false, error: 'Conta não está conectada.', timestamp: new Date().toISOString() })
    return
  }
  try {
    const channels = await discord.getGuildChannels(req.params.guildId)
    res.json({ success: true, data: channels, timestamp: new Date().toISOString() })
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Erro ao buscar canais', timestamp: new Date().toISOString() })
  }
})

export default router
