export type XpIconName =
  | 'computer' | 'user' | 'folder' | 'search' | 'settings' | 'network'
  | 'messages' | 'recycle-bin' | 'sound' | 'security' | 'tasks' | 'terminal'
  | 'games' | 'help' | 'shutdown' | 'appearance' | 'run' | 'notepad' | 'chart' | 'backup'

const routeIcons: Record<string, XpIconName> = {
  '': 'computer',
  perfil: 'user',
  analytics: 'chart',
  'limpar-dm': 'recycle-bin',
  'limpar-dm-amigos': 'recycle-bin',
  'limpar-dms': 'recycle-bin',
  'limpar-package': 'recycle-bin',
  'abrir-dms': 'messages',
  'fechar-dms': 'messages',
  'remover-amigos': 'user',
  'sair-servidores': 'network',
  'clonar-servidor': 'folder',
  'scraper-icones': 'appearance',
  'desconectar-call': 'sound',
  'mover-call': 'sound',
  'farm-call': 'sound',
  'mutar-call': 'sound',
  'ensurdecer-call': 'sound',
  'listar-call': 'user',
  elevador: 'network',
  coleira: 'network',
  'proteger-user': 'security',
  tormentar: 'security',
  'analise-package': 'chart',
  backups: 'backup',
  monitoramento: 'network',
  alertas: 'help',
  tasks: 'tasks',
  'prefix-commands': 'terminal',
  rpc: 'games',
  configuracoes: 'settings',
}

export const XP_SECTION_ICONS: Record<string, XpIconName> = {
  Geral: 'computer',
  Mensagens: 'messages',
  Conta: 'user',
  Servidores: 'network',
  Call: 'sound',
  Dados: 'folder',
  Monitoramento: 'tasks',
  Sistema: 'settings',
}

export function xpIconForRoute(pathname: string): XpIconName {
  return routeIcons[pathname.split('/').filter(Boolean)[0] || ''] || 'computer'
}
