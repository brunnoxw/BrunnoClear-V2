import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain, shell, app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = !app.isPackaged

const GITHUB_OWNER = 'brunnoxw'
const GITHUB_REPO = 'BrunnoClear-V2'

const FORCE_LOCAL_CHANGELOG = process.env.FORCE_LOCAL_CHANGELOG === '1'

function readLocalChangelog(version?: string): { version: string; name: string; body: string; published_at: string; html_url: string } | null {
  const candidates = [
    path.join(process.cwd(), 'CHANGELOG.md'),
    path.join(__dirname, '..', '..', 'CHANGELOG.md'),
    path.join(__dirname, '..', '..', '..', 'CHANGELOG.md'),
  ]
  let raw: string | null = null
  let found = ''
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        raw = fs.readFileSync(p, 'utf8')
        found = p
        break
      }
    } catch {}
  }
  if (!raw) {
    console.log('[WhatsNew] CHANGELOG.md local não encontrado em:', candidates)
    return null
  }
  console.log(`[WhatsNew] Lendo CHANGELOG.md local: ${found}`)

  const blocks = raw.split(/^# v/m).map((b) => b.trim()).filter(Boolean)
  if (blocks.length === 0) return null

  const target = (version || '').replace(/^v/, '').trim()

  const parseBlock = (block: string) => {
    const firstLine = block.split('\n', 1)[0] || ''
    const ver = (firstLine.match(/^([\d.]+)/)?.[1] || '').trim()
    const name = firstLine.includes('—') ? firstLine.split('—').slice(1).join('—').trim() : `Versão ${ver}`
    const body = block.split('\n').slice(1).join('\n').replace(/^---\s*$/m, '').trim()
    return { ver, name, body }
  }

  let picked = blocks.map(parseBlock).find((b) => target && b.ver === target) || parseBlock(blocks[0])

  return {
    version: `v${picked.ver}`,
    name: picked.name ? `v${picked.ver} — ${picked.name}` : `Versão ${picked.ver}`,
    body: picked.body,
    published_at: new Date().toISOString(),
    html_url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/CHANGELOG.md`,
  }
}

export type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'not-available'; info: UpdateInfo }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; transferred: number; total: number }
  | { status: 'downloaded'; info: UpdateInfo }
  | { status: 'error'; message: string }

let mainWindowRef: BrowserWindow | null = null

/**
 * Envia status de atualização para o renderer via IPC
 */
function send(status: UpdateStatus) {
  mainWindowRef?.webContents.send('updater:status', status)
}

/**
 * Inicializa o sistema de auto-update via electron-updater.
 * Configura handlers IPC, feed do GitHub e verificação periódica
 */
export function initUpdater(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  ipcMain.handle('updater:check', async () => {
    if (isDev) {
      return { status: 'dev', message: 'Running from source — use GitHub Releases.' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.updateInfo ?? null
    } catch (err: any) {
      return { status: 'error', message: err?.message ?? 'Unknown error' }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (isDev) return false
    try {
      await autoUpdater.downloadUpdate()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('updater:install', () => {
    if (isDev) return false
    autoUpdater.quitAndInstall(false, true)
    return true
  })

  ipcMain.handle('updater:openReleases', () => {
    shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`)
  })

  ipcMain.handle('updater:getVersion', () => app.getVersion())

  ipcMain.handle('updater:isPackaged', () => app.isPackaged)

  ipcMain.handle('updater:getReleaseNotes', async (_event, version?: string) => {
    if (FORCE_LOCAL_CHANGELOG || isDev) {
      console.log(`[WhatsNew] Lendo CHANGELOG.md local (isDev=${isDev}, force=${FORCE_LOCAL_CHANGELOG})`)
      const local = readLocalChangelog(version)
      if (local) return local
    }
    try {
      const ghToken = process.env.GH_TOKEN || ''
      console.log(`[WhatsNew] getReleaseNotes chamado — version=${version}, hasToken=${!!ghToken}`)
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
      if (ghToken) headers.Authorization = `token ${ghToken}`

      let url: string
      if (version) {
        const tag = version.startsWith('v') ? version : `v${version}`
        url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${tag}`
      } else {
        url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
      }

      console.log(`[WhatsNew] Buscando: ${url}`)
      const res = await fetch(url, { headers })
      console.log(`[WhatsNew] Resposta: ${res.status} ${res.statusText}`)

      let data: any = null

      if (res.ok) {
        data = await res.json()
      } else if (version) {
        console.log(`[WhatsNew] Tag não encontrada, tentando latest...`)
        const fallback = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
          { headers }
        )
        console.log(`[WhatsNew] Fallback latest: ${fallback.status} ${fallback.statusText}`)
        if (fallback.ok) data = await fallback.json()
      }

      if (!data) return null

      if (!data.body && ghToken) {
        console.log(`[WhatsNew] Body vazio, tentando generate-notes...`)
        const tag = data.tag_name
        const genRes = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/generate-notes`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_name: tag }),
          }
        )
        if (genRes.ok) {
          const genData: any = await genRes.json()
          console.log(`[WhatsNew] generate-notes OK: ${genData.body?.length ?? 0} chars`)
          data.body = genData.body
          if (!data.name || data.name === tag) data.name = genData.name
        } else {
          console.log(`[WhatsNew] generate-notes falhou: ${genRes.status}`)
        }
      }

      console.log(`[WhatsNew] Release final: ${data.tag_name} — "${data.name}" (body: ${data.body?.length ?? 0} chars)`)
      return { version: data.tag_name, name: data.name, body: data.body, published_at: data.published_at, html_url: data.html_url }
    } catch (err) {
      console.error(`[WhatsNew] Erro:`, err)
      return null
    }
  })

  if (isDev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoRunAppAfterInstall = true

  const ghToken = process.env.GH_TOKEN || ''

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    private: true,
    token: ghToken,
  })

  autoUpdater.on('checking-for-update', () => {
    send({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    send({ status: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    send({ status: 'not-available', info })
  })

  autoUpdater.on('download-progress', (progress) => {
    send({
      status: 'downloading',
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send({ status: 'downloaded', info })
  })

  autoUpdater.on('error', (err) => {
    send({ status: 'error', message: err?.message ?? 'Update error' })
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 30 * 60 * 1000)
}
