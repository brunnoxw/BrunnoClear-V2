import { discord } from '../../services/discord.service'
import { taskManager } from '../../services/task-manager.service'
import { sleep } from '../../utils/helpers'
import { logger } from '../../core/logger'
import { stats } from '../../services/stats.service'
import type { FecharDmsConfig } from '../../../src/types/tools'

const DM_CLOSE_DELAY = 1300

/**
 * Fecha DMs 1-a-1 e/ou sai de grupos da conta conectada.
 * O modo controla o que é processado:
 *  - 'dms'    → apenas DMs 1-a-1 (padrão)
 *  - 'grupos' → apenas grupos (group DMs)
 *  - 'ambos'  → DMs + grupos
 */
export async function fecharDms(cfg: FecharDmsConfig) {
  const modo = cfg.modo ?? 'dms'

  const dms: any[] = []
  if (modo === 'dms' || modo === 'ambos') dms.push(...discord.listOpenDMs())
  if (modo === 'grupos' || modo === 'ambos') dms.push(...discord.listGroupDMs())

  if (dms.length === 0) {
    const msg = modo === 'grupos'
      ? 'Você não está em nenhum grupo.'
      : modo === 'ambos'
        ? 'Você não tem DMs abertas nem grupos.'
        : 'Você não tem DMs abertas.'
    throw Object.assign(new Error(msg), { statusCode: 400 })
  }

  const task = taskManager.createTask('fechar-dms', {
    ...(cfg as unknown as Record<string, unknown>),
    totalDms: dms.length,
  })
  const controller = taskManager.startTask(task.id)
  if (!controller) throw new Error('Falha ao iniciar task')

  executarFechamento(task.id, dms).catch(() => {})

  return { taskId: task.id, totalDms: dms.length }
}

async function executarFechamento(taskId: string, dms: any[]) {
  const startTime = Date.now()
  try {
    let fechadas = 0

    taskManager.updateProgress(taskId, 0, dms.length, `0/${dms.length} processados`, 'deleting')

    for (const dm of dms) {
      if (taskManager.isAborted(taskId)) {
        return
      }

      await sleep(DM_CLOSE_DELAY)

      try {
        await dm.delete()
        fechadas++
      } catch {
        fechadas++
      }

      taskManager.updateProgress(
        taskId, fechadas, dms.length,
        `${fechadas}/${dms.length} processados`,
        'deleting',
      )
    }

    const duration = Math.floor((Date.now() - startTime) / 1000)
    stats.recordAction('fechar-dms', duration, {
      dmsClosed: fechadas,
      totalDms: dms.length,
    })

    taskManager.completeTask(taskId)
    logger.success('FecharDMs', `${fechadas} DMs fechadas`)
  } catch (err) {
    taskManager.failTask(taskId, String(err))
    logger.error('FecharDMs', `Erro: ${err}`)
  }
}
