import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware'
import { asyncHandler, requireConnected } from '../_shared'
import { callUtils, getActiveCallTasks, stopCallTask, toggleMuteCallTask, toggleDeafCallTask, updateTormentFlags } from './call-utils.service'

const router = Router()

const callUtilsSchema = z.object({
  tokenId: z.string(),
  action: z.enum([
    'disconnect-all',
    'move-members',
    'farm-hours',
    'mute-all',
    'unmute-all',
    'deafen-all',
    'undeafen-all',
    'list-members',
    'elevator',
    'leash',
    'protect',
    'torment',
  ]),
  channelId: z.string().optional(),
  sourceChannelId: z.string().optional(),
  targetChannelId: z.string().optional(),
  guildId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  anchorUserId: z.string().optional(),
  selfMute: z.boolean().optional(),
  selfDeaf: z.boolean().optional(),
  flags: z.object({
    persistentMute: z.boolean().optional(),
    persistentDeaf: z.boolean().optional(),
    autoDisconnect: z.boolean().optional(),
    persistentNick: z.boolean().optional(),
    blacklistChat: z.boolean().optional(),
  }).optional(),
  nickname: z.string().optional(),
})

router.post('/call-utils', validate(callUtilsSchema), asyncHandler(async (req, res) => {
  await requireConnected(req.body.tokenId)
  const result = await callUtils(req.body)
  res.status(201).json({ success: true, data: result, timestamp: new Date().toISOString() })
}))

router.get('/call-utils/active', asyncHandler(async (_req, res) => {
  res.json({ success: true, data: getActiveCallTasks() })
}))

router.delete('/call-utils/:taskId', asyncHandler(async (req, res) => {
  const stopped = await stopCallTask(req.params.taskId)
  res.json({ success: true, stopped })
}))

router.patch('/call-utils/:taskId/mute', asyncHandler(async (req, res) => {
  const { mute } = req.body as { mute: boolean }
  const toggled = await toggleMuteCallTask(req.params.taskId, !!mute)
  if (!toggled) {
    res.status(404).json({ success: false, error: 'Task não encontrada' })
    return
  }
  res.json({ success: true, mute: !!mute })
}))

router.patch('/call-utils/:taskId/deaf', asyncHandler(async (req, res) => {
  const { deaf } = req.body as { deaf: boolean }
  const toggled = await toggleDeafCallTask(req.params.taskId, !!deaf)
  if (!toggled) {
    res.status(404).json({ success: false, error: 'Task não encontrada' })
    return
  }
  res.json({ success: true, deaf: !!deaf })
}))

router.patch('/call-utils/:taskId/torment', asyncHandler(async (req, res) => {
  const { flags, nickname } = req.body as { flags?: Record<string, boolean>; nickname?: string }
  const updated = await updateTormentFlags(req.params.taskId, flags, nickname)
  if (!updated) {
    res.status(404).json({ success: false, error: 'Task não encontrada' })
    return
  }
  res.json({ success: true, flags: updated.flags, nickname: updated.nickname })
}))

export default router
