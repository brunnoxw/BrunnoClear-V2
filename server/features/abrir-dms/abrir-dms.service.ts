import { discord } from '../../services/discord.service'
import { taskManager } from '../../services/task-manager.service'
import { sleep } from '../../utils/helpers'
import { logger } from '../../core/logger'
import { analisarPackage } from '../limpar-package'
import type { AbrirDmsConfig } from '../../../src/types/tools'

/**
 * Analisa o package (ZIP) reutilizando o mesmo sistema do Limpar Package.
 * Retorna os IDs de usuários encontrados nas DMs para abrir depois.
 */
export async function analisarAbrirPackage(cfg: { zipPath: string; whitelist: string[] }) {
  return analisarPackage(cfg)
}

/**
 * Abre DMs com um usuário específico ou com todos os usuários do package.
 */
export async function abrirDms(cfg: AbrirDmsConfig) {
  const client = (discord as any)['activeClient']
  if (!client) throw Object.assign(new Error('Nenhuma conta conectada'), { statusCode: 400 })

  let ids: string[] = []

  if (cfg.modo === 'package') {
    if (!cfg.zipPath) throw Object.assign(new Error('Arquivo ZIP não informado'), { statusCode: 400 })
    const analysis = await analisarPackage({ zipPath: cfg.zipPath, whitelist: cfg.whitelist || [] })
    ids = analysis.userIds
  } else {
    ids = (cfg.targetIds || []).map((id) => id.trim()).filter((id) => /^\d+$/.test(id))
  }

  ids = Array.from(new Set(ids))

  if (ids.length === 0) {
    throw Object.assign(new Error('Nenhum usuário válido para abrir DM'), { statusCode: 400 })
  }

  const task = taskManager.createTask('abrir-dms', {
    modo: cfg.modo,
    totalUsers: ids.length,
    delay: cfg.delay,
  })
  const controller = taskManager.startTask(task.id)
  if (!controller) throw new Error('Falha ao iniciar task')

  executarAbrirDms(task.id, cfg, ids).catch(() => {})

  return { taskId: task.id, totalUsers: ids.length }
}

async function executarAbrirDms(taskId: string, cfg: AbrirDmsConfig, ids: string[]) {
  const client = (discord as any)['activeClient']
  const total = ids.length
  let abertas = 0
  let falhas = 0

  try {
    taskManager.updateProgress(taskId, 0, total, `0/${total} DMs abertas`, 'opening')

    for (const idUsuario of ids) {
      if (taskManager.isAborted(taskId)) {
        taskManager.failTask(taskId, `Cancelado (${abertas}/${total} DMs abertas)`)
        return
      }

      let username = idUsuario
      let avatarUrl: string | null = null

      try {
        const dmData = await client.api.users(client.user.id).channels.post({
          data: { recipients: [idUsuario] },
        })

        let channel = client.channels.cache.get(dmData.id)
        if (!channel) channel = await client.channels.fetch(dmData.id).catch(() => null)

        if (channel?.recipient) {
          username = channel.recipient.globalName || channel.recipient.username || idUsuario
          avatarUrl = channel.recipient.displayAvatarURL?.({ dynamic: true, size: 256 }) || null
        }

        abertas++
        logger.info('AbrirDms', `DM aberta com ${username} (${idUsuario})`)
      } catch (err) {
        falhas++
        logger.warn('AbrirDms', `Não foi possível abrir DM com ${idUsuario}: ${err}`)
      }

      taskManager.updateProgress(
        taskId,
        abertas + falhas,
        total,
        `${abertas} DM(s) aberta(s)${falhas ? `, ${falhas} falha(s)` : ''} (${abertas + falhas}/${total})`,
        'opening',
        { currentUser: { username, avatarUrl }, abertas, falhas },
      )

      await sleep(cfg.delay)
    }

    taskManager.completeTask(taskId)
    logger.success('AbrirDms', `Concluído: ${abertas} DMs abertas, ${falhas} falhas`)
  } catch (err) {
    taskManager.failTask(taskId, String(err))
    logger.error('AbrirDms', `Erro: ${err}`)
  }
}
