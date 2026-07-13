import { Router } from 'express'
import { limparDmRoutes } from './limpar-dm'
import { backupToolRoutes } from './backup'
import { limparPackageRoutes } from './limpar-package'
import { abrirDmsRoutes } from './abrir-dms'
import { limparDmsAbertasRoutes } from './limpar-dms-abertas'
import { limparDmAmigosRoutes } from './limpar-dm-amigos'
import { removerAmigosRoutes } from './remover-amigos'
import { removerServidoresRoutes } from './remover-servidores'
import { clonarServidorRoutes } from './clonar-servidor'
import { scraperIconsRoutes } from './scraper-icons'
import { fecharDmsRoutes } from './fechar-dms'
import { callUtilsRoutes } from './call-utils'
import { prefixCommandsRoutes } from './prefix-commands'
import { monitoringRoutes } from './monitoring'
import { keywordAlertsRoutes } from './keyword-alerts'

const featureRouter = Router()

featureRouter.use('/', limparDmRoutes)
featureRouter.use('/', backupToolRoutes)
featureRouter.use('/', limparPackageRoutes)
featureRouter.use('/', abrirDmsRoutes)
featureRouter.use('/', limparDmsAbertasRoutes)
featureRouter.use('/', limparDmAmigosRoutes)
featureRouter.use('/', removerAmigosRoutes)
featureRouter.use('/', removerServidoresRoutes)
featureRouter.use('/', clonarServidorRoutes)
featureRouter.use('/', scraperIconsRoutes)
featureRouter.use('/', fecharDmsRoutes)
featureRouter.use('/', callUtilsRoutes)
featureRouter.use('/', prefixCommandsRoutes)
featureRouter.use('/', monitoringRoutes)
featureRouter.use('/', keywordAlertsRoutes)

export default featureRouter
