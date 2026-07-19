/**
 * Rotas de analytics e estatísticas
 * @returns {Router} Dados analíticos de uso do painel
 */
import { Router } from 'express'
import { stats } from '../services/stats.service'

const router = Router()

/**
 * Retorna os dados analíticos de uso
 * @returns {Object} Estatísticas e métricas do painel
 */
router.get('/', (req, res) => {
  const account = typeof req.query.account === 'string' ? req.query.account : undefined
  const data = stats.getAnalytics(account)
  res.json({ success: true, data, timestamp: new Date().toISOString() })
})

export default router
