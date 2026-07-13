import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware'
import { asyncHandler } from '../_shared'
import { getStatus, setConfig, getHistory, clearHistory } from './keyword-alerts.service'

const router = Router()

router.get('/keyword-alerts', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: getStatus(), timestamp: new Date().toISOString() })
}))

const configSchema = z.object({
  enabled: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
  ignoreOwn: z.boolean().optional(),
  ignoreBots: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  wholeWord: z.boolean().optional(),
  dmOnly: z.boolean().optional(),
})

router.patch('/keyword-alerts/config', validate(configSchema), asyncHandler(async (req, res) => {
  const status = setConfig(req.body)
  res.json({ success: true, data: status, timestamp: new Date().toISOString() })
}))

router.get('/keyword-alerts/history', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: getHistory(), timestamp: new Date().toISOString() })
}))

router.delete('/keyword-alerts/history', asyncHandler(async (_req, res) => {
  clearHistory()
  res.json({ success: true, timestamp: new Date().toISOString() })
}))

export default router
