import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware'
import { asyncHandler } from '../_shared'
import {
  iniciarAnalise,
  getResultado,
  saveResultado,
  listSavedAnalyses,
  getSavedAnalysis,
  deleteSavedAnalysis,
} from './package-analytics.service'

const router = Router()

const analisarSchema = z.object({
  zipPath: z.string().min(1),
  botToken: z.string().optional(),
})

const saveSchema = z.object({
  taskId: z.string().min(1),
  name: z.string().max(80).optional(),
})

router.post('/package-analytics/analisar', validate(analisarSchema), asyncHandler(async (req, res) => {
  const result = await iniciarAnalise(req.body.zipPath, req.body.botToken)
  res.status(201).json({ success: true, data: result, timestamp: new Date().toISOString() })
}))

router.get('/package-analytics/resultado/:taskId', asyncHandler(async (req, res) => {
  const data = getResultado(req.params.taskId)
  if (!data) {
    res.status(404).json({ success: false, error: 'Resultado ainda não disponível', timestamp: new Date().toISOString() })
    return
  }
  res.status(200).json({ success: true, data, timestamp: new Date().toISOString() })
}))

router.post('/package-analytics/save', validate(saveSchema), asyncHandler(async (req, res) => {
  const meta = saveResultado(req.body.taskId, req.body.name)
  if (!meta) {
    res.status(404).json({ success: false, error: 'Resultado não encontrado (talvez expirado — reanalise para salvar)', timestamp: new Date().toISOString() })
    return
  }
  res.status(201).json({ success: true, data: meta, timestamp: new Date().toISOString() })
}))

router.get('/package-analytics/saved', asyncHandler(async (_req, res) => {
  res.status(200).json({ success: true, data: listSavedAnalyses(), timestamp: new Date().toISOString() })
}))

router.get('/package-analytics/saved/:id', asyncHandler(async (req, res) => {
  const data = getSavedAnalysis(req.params.id)
  if (!data) {
    res.status(404).json({ success: false, error: 'Análise salva não encontrada', timestamp: new Date().toISOString() })
    return
  }
  res.status(200).json({ success: true, data, timestamp: new Date().toISOString() })
}))

router.delete('/package-analytics/saved/:id', asyncHandler(async (req, res) => {
  const ok = deleteSavedAnalysis(req.params.id)
  res.status(ok ? 200 : 404).json({ success: ok, timestamp: new Date().toISOString() })
}))

export default router
