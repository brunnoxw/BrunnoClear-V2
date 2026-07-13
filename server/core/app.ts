import express from 'express'
import cors from 'cors'
import path from 'path'
import { createServer } from 'http'
import { config, initDataPath } from '../config'
import { loggerMiddleware, errorMiddleware, notFoundMiddleware } from '../middleware'
import { storage } from '../services/storage.service'
import { stats } from '../services/stats.service'
import { refreshAllAvatars } from '../services/avatar-cache.service'
import { initRPC, updatePresence } from '../services/rpc.service'
import { monitoringService } from '../features/monitoring/monitoring.service'
import { initKeywordAlerts, keywordAlertsEmitter } from '../features/keyword-alerts'
import { wsManager } from './websocket'
import { logger } from './logger'
import { taskManager } from '../services/task-manager.service'
import apiRouter from '../routes'

/**
 * Cria e configura o servidor Express + WebSocket.
 * Inicializa storage, stats, RPC, monitoramento e rotas da API
 * @returns {Object} Objeto com server, app, start() e stop()
 */
export function createApiServer() {
  initDataPath()

  const app = express()

  app.use(cors({ origin: '*' }))
  app.use(express.json({ limit: '10mb' }))
  app.use(loggerMiddleware)

  app.use(
    '/avatars',
    express.static(path.join(config.storage.dataPath, config.storage.avatarsDir), {
      maxAge: '1d',
      immutable: true,
    })
  )

  app.use('/api', apiRouter)

  const isDev = process.env.NODE_ENV !== 'production'
  const appRoot = path.resolve(__dirname, '..', '..', '..')

  const frontendReady = true

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', frontendReady, timestamp: new Date().toISOString() })
  })

  if (!isDev) {
    const distDir = path.join(appRoot, 'dist-frontend')
    app.use(express.static(distDir, {
      maxAge: '7d',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        }
      },
    }))
  }

  app.use('/api', notFoundMiddleware)
  app.use('/api', errorMiddleware)

  const server = createServer(app)

  wsManager.init(server)

  storage.init()
  stats.load()

  keywordAlertsEmitter.on('match', (match) => {
    wsManager.broadcast('keyword-alert:match', match)
  })
  initKeywordAlerts()

  refreshAllAvatars().catch((err) => {
    logger.warn('Server', `Erro ao atualizar avatares no startup: ${err}`)
  })

  initRPC().then(async (ok) => {
    if (ok) await updatePresence()
  }).catch(() => {})

  monitoringService.init().then(() => {
    monitoringService.on('voice:event', (event) => {
      wsManager.broadcast('monitoring:voice_event', event)
    })
    monitoringService.on('session:start', (session) => {
      wsManager.broadcast('monitoring:session_start', session)
    })
    monitoringService.on('session:end', (session) => {
      wsManager.broadcast('monitoring:session_end', session)
    })
    monitoringService.on('token:status', (data) => {
      wsManager.broadcast('monitoring:token_status', data)
    })
    monitoringService.on('user:added', (user) => {
      wsManager.broadcast('monitoring:user_added', user)
    })
    monitoringService.on('user:removed', (data) => {
      wsManager.broadcast('monitoring:user_removed', data)
    })
    monitoringService.on('message:create', (msg) => {
      wsManager.broadcast('monitoring:message', msg)
    })
    monitoringService.on('message:delete', (msg) => {
      wsManager.broadcast('monitoring:message_delete', msg)
    })
    monitoringService.on('message:mention', (msg) => {
      wsManager.broadcast('monitoring:message_mention', msg)
    })
    monitoringService.on('media:downloaded', (item) => {
      wsManager.broadcast('monitoring:media', item)
    })
  }).catch((err) => {
    logger.warn('Server', `Erro ao inicializar monitoramento: ${err}`)
  })

  return {
    server,
    app,
    taskManager,
    monitoringService,
    start: async () => {
      if (!isDev) {
        const distDir = path.join(appRoot, 'dist-frontend')
        const indexHtml = path.join(distDir, 'index.html')
        app.use((req: any, res: any, next: any) => {
          if (req.path.startsWith('/api') || req.path === '/health' || req.path.startsWith('/avatars')) {
            return next()
          }
          res.sendFile(indexHtml)
        })
        logger.success('Server', 'Frontend estático carregado')
      }
      return new Promise<void>((resolve) => {
        server.listen(config.server.port, config.server.host, () => {
          logger.success('Server', `API rodando em http://${config.server.host}:${config.server.port}`)
          logger.info('Server', `WebSocket em ws://${config.server.host}:${config.server.port}${config.websocket.path}`)
          resolve()
        })
      })
    },
    stop: () => {
      return new Promise<void>((resolve) => {
        monitoringService.shutdown().catch(() => {})
        wsManager.shutdown()
        server.close(() => {
          logger.info('Server', 'Servidor encerrado')
          resolve()
        })
      })
    },
  }
}
