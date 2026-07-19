import fs from 'fs'
import path from 'path'
import yauzl from 'yauzl'
import { discord } from '../../services/discord.service'
import { taskManager } from '../../services/task-manager.service'
import { stats } from '../../services/stats.service'
import { storage } from '../../services/storage.service'
import { sleep } from '../../utils/helpers'
import { logger } from '../../core/logger'
import { config } from '../../config'
import { backupAntesDeLimpar } from '../backup'
import type { LimparPackageConfig } from '../../../src/types/tools'

function getProgressFilePath(): string {
  return path.join(config.storage.dataPath, '.package_progress.json')
}

interface PackageProgress {
  zipPath: string
  timestamp: number
  idsProcessados: string[]
  totalMensagensApagadas: number
}

function salvarProgresso(zipPath: string, idsProcessados: string[], totalMensagensApagadas: number): void {
  try {
    const progresso: PackageProgress = {
      zipPath,
      timestamp: Date.now(),
      idsProcessados,
      totalMensagensApagadas,
    }
    fs.writeFileSync(getProgressFilePath(), JSON.stringify(progresso, null, 2))
  } catch (err) {
    logger.warn('LimparPackage', `Erro ao salvar progresso: ${err}`)
  }
}

function carregarProgresso(zipPath: string): PackageProgress | null {
  try {
    const filePath = getProgressFilePath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const progresso: PackageProgress = JSON.parse(raw)
      if (progresso.zipPath === zipPath) {
        return progresso
      }
    }
  } catch (err) {
    logger.warn('LimparPackage', `Erro ao carregar progresso: ${err}`)
  }
  return null
}

function limparProgressoArquivo(): void {
  try {
    const filePath = getProgressFilePath()
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    logger.warn('LimparPackage', `Erro ao limpar progresso: ${err}`)
  }
}

function canalValido(fileName: string): boolean {
  return /^(?:messages?|mensagens?)\/c[0-9]+\/(?:channel|canal)\.json$/i.test(fileName)
}

function ehDM(data: any): boolean {
  return data?.type === 'DM' && Array.isArray(data?.recipients) && data.recipients.length > 0
}

function extrairIDsValidos(recipients: any[]): string[] {
  return recipients.filter((id: any) => typeof id === 'string' && /^\d+$/.test(id) && id !== 'Deleted User')
}

function lerEntryComoJSON(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<any | null> {
  return new Promise((resolve) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err || !readStream) {
        resolve(null)
        return
      }

      let data = ''
      readStream.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      readStream.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(null)
        }
      })
      readStream.on('error', () => resolve(null))
    })
  })
}

interface ExtractionResult {
  ids: string[]
  totalCanais: number
  totalDMs: number
}

function extrairIDsDoPackage(
  zipPath: string,
  whitelist: string[],
  onProgress: (totalArquivos: number, totalCanais: number, canaisDM: number, idsUnicos: number) => void,
): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err || new Error('Não foi possível abrir o ZIP'))
        return
      }

      const idsEncontrados = new Set<string>()
      const contagemIDs = new Map<string, number>()
      let totalCanais = 0
      let canaisDM = 0
      let totalArquivos = 0

      zipfile.readEntry()
      zipfile.on('entry', async (entry: yauzl.Entry) => {
        totalArquivos++

        if (totalArquivos % 50 === 0) {
          onProgress(totalArquivos, totalCanais, canaisDM, idsEncontrados.size)
        }

        if (canalValido(entry.fileName)) {
          totalCanais++
          const channelData = await lerEntryComoJSON(zipfile, entry)

          if (channelData && ehDM(channelData)) {
            canaisDM++
            const idsValidos = extrairIDsValidos(channelData.recipients)
            for (const id of idsValidos) {
              idsEncontrados.add(id)
              contagemIDs.set(id, (contagemIDs.get(id) || 0) + 1)
            }
          }
        }

        zipfile.readEntry()
      })

      zipfile.on('end', () => {
        let idDono: string | null = null
        let maxContagem = 0
        for (const [id, contagem] of contagemIDs.entries()) {
          if (contagem > maxContagem) {
            maxContagem = contagem
            idDono = id
          }
        }
        if (idDono) idsEncontrados.delete(idDono)

        for (const id of whitelist) {
          idsEncontrados.delete(id.trim())
        }

        resolve({
          ids: Array.from(idsEncontrados),
          totalCanais,
          totalDMs: canaisDM,
        })
      })

      zipfile.on('error', (err) => reject(err))
    })
  })
}

export interface PackageProgressInfo {
  hasProgress: boolean
  idsProcessados: number
  idsRestantes: number
  totalMensagensApagadas: number
}

export function verificarProgresso(zipPath: string, totalIds: number): PackageProgressInfo {
  const progresso = carregarProgresso(zipPath)
  if (!progresso || progresso.idsProcessados.length === 0) {
    return { hasProgress: false, idsProcessados: 0, idsRestantes: totalIds, totalMensagensApagadas: 0 }
  }
  return {
    hasProgress: true,
    idsProcessados: progresso.idsProcessados.length,
    idsRestantes: totalIds - progresso.idsProcessados.length,
    totalMensagensApagadas: progresso.totalMensagensApagadas,
  }
}

export interface PackageAnalysis {
  totalUsers: number
  totalChannels: number
  totalDMs: number
  userIds: string[]
  progress: PackageProgressInfo | null
}

export async function analisarPackage(cfg: { zipPath: string; whitelist: string[] }): Promise<PackageAnalysis> {
  const { zipPath, whitelist } = cfg

  if (!fs.existsSync(zipPath)) {
    throw Object.assign(new Error('Arquivo ZIP não encontrado'), { statusCode: 400 })
  }

  const result = await extrairIDsDoPackage(zipPath, whitelist, () => {})

  const progressInfo = verificarProgresso(zipPath, result.ids.length)

  return {
    totalUsers: result.ids.length,
    totalChannels: result.totalCanais,
    totalDMs: result.totalDMs,
    userIds: result.ids,
    progress: progressInfo.hasProgress ? progressInfo : null,
  }
}

/**
 * Processa o package de dados do Discord (ZIP).
 * Extrai mensagens e deleta do servidor com progresso persistido
 */
export async function limparPackage(cfg: LimparPackageConfig) {
  if (!fs.existsSync(cfg.zipPath)) {
    throw Object.assign(new Error('Arquivo ZIP não encontrado'), { statusCode: 400 })
  }

  const client = (discord as any)['activeClient']
  if (!client) throw Object.assign(new Error('Nenhuma conta conectada'), { statusCode: 400 })

  logger.info('LimparPackage', `Analisando package: ${cfg.zipPath}`)

  const result = await extrairIDsDoPackage(cfg.zipPath, cfg.whitelist, () => {})

  if (result.ids.length === 0) {
    throw Object.assign(new Error('Nenhum usuário encontrado no package'), { statusCode: 400 })
  }

  let idsParaProcessar = result.ids
  let totalMensagensApagadas = 0
  let idsProcessados: string[] = []

  if (cfg.continuar) {
    const progresso = carregarProgresso(cfg.zipPath)
    if (progresso && progresso.idsProcessados.length > 0) {
      idsParaProcessar = result.ids.filter((id) => !progresso.idsProcessados.includes(id))
      totalMensagensApagadas = progresso.totalMensagensApagadas
      idsProcessados = [...progresso.idsProcessados]
      logger.info('LimparPackage', `Continuando: ${idsProcessados.length} já processados, ${idsParaProcessar.length} restantes`)
    }
  } else {
    limparProgressoArquivo()
  }

  const task = taskManager.createTask('limpar-package', {
    zipPath: cfg.zipPath,
    totalUsers: idsParaProcessar.length,
    fazerBackup: cfg.fazerBackup,
    salvarMidiaLocal: cfg.salvarMidiaLocal,
    delay: cfg.delay,
  })
  const controller = taskManager.startTask(task.id)
  if (!controller) throw new Error('Falha ao iniciar task')

  executarLimpezaPackage(
    task.id,
    cfg,
    idsParaProcessar,
    idsProcessados,
    totalMensagensApagadas,
  ).catch(() => {})

  return {
    taskId: task.id,
    totalUsers: idsParaProcessar.length,
    totalChannels: result.totalCanais,
    totalDMs: result.totalDMs,
    resumed: cfg.continuar && idsProcessados.length > 0,
  }
}

async function executarLimpezaPackage(
  taskId: string,
  cfg: LimparPackageConfig,
  idsParaProcessar: string[],
  idsJaProcessados: string[],
  totalMensagensApagadasAnterior: number,
) {
  const startTime = Date.now()
  const client = (discord as any)['activeClient']
  const me = discord.getMe()
  const totalUsers = idsParaProcessar.length
  let usersProcessados = 0
  let totalMensagensApagadas = totalMensagensApagadasAnterior
  const idsProcessados = [...idsJaProcessados]

  try {
    taskManager.updateProgress(taskId, 0, totalUsers, `0/${totalUsers} usuários`, 'fetching')

    for (const idUsuario of idsParaProcessar) {
      if (taskManager.isAborted(taskId)) {
        taskManager.failTask(taskId, `Cancelado (${usersProcessados}/${totalUsers} usuários processados)`)
        return
      }

      let channel: any = null
      let username = idUsuario

      await sleep(1000)

      try {
        const dmData = await client.api.users(client.user.id).channels.post({
          data: {
            recipients: [idUsuario],
          },
        })

        channel = client.channels.cache.get(dmData.id)
        if (!channel) {
          channel = await client.channels.fetch(dmData.id).catch(() => null)
        }

        if (channel?.recipient) {
          username = channel.recipient.globalName || channel.recipient.username || idUsuario
        }
      } catch {
        logger.warn('LimparPackage', `Não foi possível abrir DM com ${idUsuario}, pulando`)
        usersProcessados++
        idsProcessados.push(idUsuario)
        salvarProgresso(cfg.zipPath, idsProcessados, totalMensagensApagadas)
        taskManager.updateProgress(
          taskId,
          usersProcessados,
          totalUsers,
          `${usersProcessados}/${totalUsers} usuários (pulou ${username})`,
          'deleting',
        )
        continue
      }

      if (!channel) {
        usersProcessados++
        idsProcessados.push(idUsuario)
        salvarProgresso(cfg.zipPath, idsProcessados, totalMensagensApagadas)
        continue
      }

      const userId = channel.recipient?.id || idUsuario
      const avatarUrl = channel.recipient?.displayAvatarURL?.({ dynamic: true, size: 256 }) || null
      const currentUser = { username, avatarUrl }

      logger.info('LimparPackage', `currentUser: ${JSON.stringify(currentUser)} | recipient: ${channel.recipient?.username} | globalName: ${channel.recipient?.globalName} | avatar: ${channel.recipient?.avatar} | displayAvatarURL: ${avatarUrl} | publicFlags: ${channel.recipient?.publicFlags?.bitfield} | flags: ${channel.recipient?.flags?.bitfield} | premiumType: ${channel.recipient?.premiumType}`)

      if (cfg.fazerBackup) {
        if (taskManager.isAborted(taskId)) {
          taskManager.failTask(taskId, 'Cancelado pelo usuário')
          return
        }

        taskManager.updateProgress(
          taskId,
          usersProcessados,
          totalUsers,
          `Backup: ${username} (${usersProcessados + 1}/${totalUsers})`,
          'backup',
          { currentUser },
        )

        try {
          await backupAntesDeLimpar(channel.id, username, userId, avatarUrl, [], cfg.salvarMidiaLocal, taskId)
        } catch (err) {
          logger.warn('LimparPackage', `Erro no backup de ${username}: ${err}`)
        }

        if (taskManager.isAborted(taskId)) {
          taskManager.failTask(taskId, 'Cancelado pelo usuário')
          return
        }
      }

      taskManager.updateProgress(
        taskId,
        usersProcessados,
        totalUsers,
        `Buscando msgs: ${username} (${usersProcessados + 1}/${totalUsers})`,
        'fetching',
        { currentUser, dmStatus: 'searching' as const },
      )

      const messages: any[] = []
      let lastId: string | undefined

      while (true) {
        if (taskManager.isAborted(taskId)) {
          taskManager.failTask(taskId, `Cancelado (${usersProcessados}/${totalUsers})`)
          return
        }

        const fetched = await channel.messages.fetch({
          limit: 100,
          ...(lastId && { before: lastId }),
        })

        if (fetched.size === 0) break

        const msgs = Array.from(fetched.values()) as any[]
        const own = msgs.filter((m: any) => m.author.id === me.id && !m.system)
        messages.push(...own)

        lastId = fetched.lastKey()
        if (fetched.size < 100) break
        await sleep(400)
      }

      if (messages.length > 0) {
        let deleted = 0
        const totalMsgs = messages.length

        for (const msg of messages) {
          if (taskManager.isAborted(taskId)) {
            taskManager.failTask(taskId, `Cancelado (${usersProcessados}/${totalUsers}, ${deleted}/${totalMsgs} msgs)`)
            return
          }

          try {
            await msg.delete()
          } catch (err) {
            logger.warn('LimparPackage', `Erro ao deletar msg ${msg.id}: ${err}`)
          }

          deleted++
          totalMensagensApagadas++

          if (deleted % 5 === 0 || deleted === totalMsgs) {
            taskManager.updateProgress(
              taskId,
              usersProcessados,
              totalUsers,
              `${username}: ${deleted}/${totalMsgs} msgs | ${usersProcessados + 1}/${totalUsers} usuários`,
              'deleting',
              { currentUser, dmStatus: 'deleting' as const, dmProgress: { deleted, total: totalMsgs } },
            )
          }

          await sleep(cfg.delay)
        }

        logger.info('LimparPackage', `${deleted} msgs deletadas com ${username}`)
      } else {
        taskManager.updateProgress(
          taskId,
          usersProcessados,
          totalUsers,
          `${username}: sem mensagens | ${usersProcessados + 1}/${totalUsers} usuários`,
          'deleting',
          { currentUser, dmStatus: 'no-messages' as const },
        )
      }

      try {
        await channel.delete()
      } catch {}

      usersProcessados++
      idsProcessados.push(idUsuario)
      salvarProgresso(cfg.zipPath, idsProcessados, totalMensagensApagadas)

      taskManager.updateProgress(
        taskId,
        usersProcessados,
        totalUsers,
        `${usersProcessados}/${totalUsers} usuários processados`,
        'deleting',
        { currentUser },
      )
    }

    limparProgressoArquivo()

    stats.recordCleanup({
      username: 'Limpeza de Package',
      userId: `package_${me.id}`,
      avatarUrl: null,
      messagesDeleted: totalMensagensApagadas,
      messagesScanned: totalMensagensApagadas,
      duration: Math.floor((Date.now() - startTime) / 1000),
      backup: !!cfg.fazerBackup,
      source: 'package',
    })

    taskManager.completeTask(taskId)
    logger.success('LimparPackage', `Concluído: ${usersProcessados} usuários, ${totalMensagensApagadas} mensagens apagadas`)
  } catch (err) {
    taskManager.failTask(taskId, String(err))
    logger.error('LimparPackage', `Erro: ${err}`)
  }
}
