import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware'
import { asyncHandler, requireConnected } from '../_shared'
import { fecharDms } from './fechar-dms.service'

const router = Router()

const fecharDmsSchema = z.object({
  tokenId: z.string(),
  modo: z.enum(['dms', 'grupos', 'ambos']).default('dms'),
})

router.post('/fechar-dms', validate(fecharDmsSchema), asyncHandler(async (req, res) => {
  await requireConnected(req.body.tokenId)
  const result = await fecharDms(req.body)
  res.status(201).json({ success: true, data: result, timestamp: new Date().toISOString() })
}))

export default router
