import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware'
import { asyncHandler, requireConnected } from '../_shared'
import { abrirDms, analisarAbrirPackage } from './abrir-dms.service'

const router = Router()

const analisarSchema = z.object({
  tokenId: z.string(),
  zipPath: z.string(),
  whitelist: z.array(z.string()).default([]),
})

router.post('/abrir-dms/analisar', validate(analisarSchema), asyncHandler(async (req, res) => {
  await requireConnected(req.body.tokenId)
  const result = await analisarAbrirPackage({
    zipPath: req.body.zipPath,
    whitelist: req.body.whitelist,
  })
  res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() })
}))

const abrirSchema = z.object({
  tokenId: z.string(),
  modo: z.enum(['especifico', 'package']),
  targetIds: z.array(z.string()).default([]),
  zipPath: z.string().optional(),
  whitelist: z.array(z.string()).default([]),
  delay: z.number().min(100).default(700),
})

router.post('/abrir-dms', validate(abrirSchema), asyncHandler(async (req, res) => {
  await requireConnected(req.body.tokenId)
  const result = await abrirDms(req.body)
  res.status(201).json({ success: true, data: result, timestamp: new Date().toISOString() })
}))

export default router
