/**
 * Listas auxiliares para a análise de mensagens: stopwords (PT+EN) e
 * palavrões (contagem de "curse words", usado nas curiosidades).
 */

export const STOPWORDS = new Set<string>([
  'que', 'nao', 'não', 'com', 'uma', 'para', 'por', 'mais', 'como', 'mas', 'foi',
  'ele', 'ela', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'ha', 'nos', 'ja',
  'esta', 'eu', 'tambem', 'só', 'so', 'pelo', 'pela', 'ate', 'isso', 'ela', 'entre',
  'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse', 'eles',
  'voce', 'você', 'vc', 'essa', 'num', 'nem', 'suas', 'meu', 'as', 'os', 'um', 'em',
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'ao', 'e', 'é', 'o', 'a', 'se', 'sim',
  'ta', 'tá', 'to', 'tô', 'né', 'ne', 'pra', 'pro', 'tem', 'ter', 'vou', 'vai', 'ai',
  'aí', 'la', 'lá', 'aqui', 'agora', 'ola', 'olá', 'oi', 'kkk', 'kkkk', 'kkkkk',
  'sao', 'são', 'seja', 'pode', 'faz', 'fez', 'era', 'vamos', 'esse', 'dele', 'dela',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now',
  'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she',
  'too', 'use', 'that', 'this', 'with', 'have', 'from', 'they', 'will', 'your',
  'what', 'when', 'them', 'then', 'were', 'been', 'just', 'like', 'yeah', 'lol',
  'dont', 'don', 'im', 'its', 'about', 'there', 'their', 'would', 'could',
])

const CURSE = [
  'porra', 'porras', 'caralho', 'caralho', 'carai', 'caraca', 'krl', 'crlh', 'kct',
  'merda', 'merdas', 'bosta', 'bostas', 'cocô', 'foder', 'fodase', 'foda', 'fodido',
  'fudido', 'fudeu', 'fodeu', 'fodendo', 'fodase', 'foda-se', 'puta', 'putas', 'puto',
  'putaria', 'putinha', 'putona', 'putaria', 'buceta', 'bucetas', 'boceta', 'xoxota',
  'xota', 'xereca', 'ppk', 'cu', 'cuzao', 'cuzão', 'cuzinho', 'rabo', 'viado', 'viadinho',
  'veado', 'veadinho', 'bicha', 'bichinha', 'corno', 'cornao', 'cornão', 'chifrudo',
  'desgraça', 'desgraca', 'desgraçado', 'desgracado', 'desgraçada', 'arrombado',
  'arrombada', 'otario', 'otário', 'otaria', 'otária', 'babaca', 'babacas', 'idiota',
  'idiotas', 'imbecil', 'imbecis', 'burro', 'burra', 'retardado', 'retardada', 'mongol',
  'mongoloide', 'jumento', 'escroto', 'escrota', 'vagabundo', 'vagabunda', 'vadia',
  'vadias', 'piranha', 'piriguete', 'safado', 'safada', 'cachorra', 'prostituta', 'pqp',
  'vsf', 'vtnc', 'tnc', 'fdp', 'cacete', 'cacetada', 'bunda', 'peido', 'peido', 'trouxa',
  'palhaço', 'palhaco', 'pau', 'pinto', 'pica', 'rola', 'caceta', 'boquete', 'chupar',
  'tesao', 'tesão', 'punheta', 'siririca', 'gozar', 'gozada', 'buceta', 'nojento',
  'nojenta', 'lixo', 'verme', 'canalha', 'safadeza', 'puta que pariu', 'filho da puta',
  'filha da puta', 'vai tomar no cu', 'vai se foder', 'pau no cu', 'que se foda',
  'toma no cu', 'sua puta', 'seu merda',
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fuckin', 'fuk', 'fck', 'motherfucker',
  'motherfuckers', 'mofo', 'shit', 'shitty', 'shits', 'bullshit', 'bullcrap', 'bitch',
  'bitches', 'bitching', 'asshole', 'assholes', 'ass', 'asses', 'dumbass', 'jackass',
  'dick', 'dickhead', 'dicks', 'bastard', 'bastards', 'cunt', 'cunts', 'damn', 'goddamn',
  'crap', 'crappy', 'wtf', 'stfu', 'gtfo', 'lmfao', 'bollocks', 'bugger', 'bloody', 'slut',
  'sluts', 'whore', 'whores', 'hoe', 'hoes', 'prick', 'twat', 'wanker', 'jerk', 'idiot',
  'moron', 'retard', 'retarded', 'piss', 'pissed', 'pissing', 'screwed', 'cock', 'cocks',
  'pussy', 'pussies', 'boobs', 'tits', 'titties', 'cum', 'jizz', 'blowjob', 'handjob',
  'nsfw', 'thot', 'simp', 'douche', 'douchebag', 'fag', 'faggot',
]
export const CURSE_SET = new Set(CURSE)

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const CURSE_SINGLE = CURSE.filter((w) => !/\s/.test(w))
const CURSE_PHRASES = CURSE.filter((w) => /\s/.test(w))

const CURSE_REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${CURSE_SINGLE.map(escapeRe).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
)
const CURSE_PHRASE_REGEX = CURSE_PHRASES.length
  ? new RegExp(CURSE_PHRASES.map(escapeRe).join('|'), 'gi')
  : null

/** retorna todos os palavrões encontrados (normalizados p/ minúsculas). */
export function curseMatches(lower: string): string[] {
  const out: string[] = []
  const m = lower.match(CURSE_REGEX)
  if (m) for (const w of m) out.push(w.toLowerCase())
  if (CURSE_PHRASE_REGEX) {
    const p = lower.match(CURSE_PHRASE_REGEX)
    if (p) for (const w of p) out.push(w.toLowerCase())
  }
  return out
}

export function countCurses(lower: string): number {
  return curseMatches(lower).length
}

/**
 * Rótulos amigáveis em PT — linguagem simples, do ponto de vista do usuário
 * ("Vezes que você fez X"), evitando jargão técnico do Discord.
 */
export const EVENT_LABELS: Record<string, string> = {
  session_start: 'Vezes que abriu o Discord',
  session_end: 'Vezes que fechou o Discord',
  session_start_success: 'Conexões ao Discord',
  app_opened: 'Vezes que abriu o app',
  send_message: 'Mensagens enviadas',
  message_edited: 'Mensagens editadas',
  message_deleted: 'Mensagens apagadas',
  open_popout: 'Perfis que você abriu',
  user_profile_action: 'Ações em perfis',
  channel_opened: 'Canais que você abriu',
  channel_closed: 'Canais que você fechou',
  guild_viewed: 'Servidores que você olhou',
  member_list_viewed: 'Listas de membros vistas',
  member_list_view: 'Listas de membros vistas',
  dm_list_viewed: 'Vezes que abriu as DMs',
  friends_list_viewed: 'Vezes que abriu os amigos',
  inbox_opened: 'Vezes que abriu a caixa de entrada',
  close_tutorial: 'Tutoriais fechados',
  ack_messages: 'Conversas marcadas como lidas',
  invite_opened: 'Convites abertos',
  accepted_instant_invite: 'Convites aceitos',
  open_modal: 'Janelas abertas',
  launch_game: 'Jogos que você abriu',
  join_voice_channel: 'Vezes que entrou em call',
  leave_voice_channel: 'Vezes que saiu de call',
  voice_disconnect: 'Vezes que saiu de call',
  voice_connection_success: 'Chamadas conectadas',
  call_button_clicked: 'Vezes que clicou em ligar',
  start_speaking: 'Vezes que falou em call',
  start_listening: 'Áudios ouvidos',
  video_stream_ended: 'Transmissões (lives) feitas',
  settings_pane_viewed: 'Telas de configuração abertas',
  search_started: 'Buscas feitas',
  image_hovered: 'Imagens visualizadas',
  update_relationship: 'Amizades e bloqueios alterados',
  channel_deleted: 'Canais apagados',
  create_channel: 'Canais criados',
  guild_joined: 'Servidores em que entrou',
  leave_guild: 'Servidores de que saiu',
  keyboard_shortcut_used: 'Atalhos de teclado usados',
  login_attempted: 'Tentativas de login',
  login_successful: 'Logins feitos',
  notification_viewed: 'Notificações vistas',
  add_reaction: 'Reações que você deu',
  remove_reaction: 'Reações removidas',
  application_command_used: 'Comandos usados',
  slash_command_used: 'Comandos de barra usados',
  guild_onboarding_loaded: 'Boas-vindas de servidor vistas',
  sticker_sent: 'Figurinhas enviadas',
  gif_sent: 'GIFs enviados',
  user_settings_updated: 'Configurações alteradas',
  notification_settings_updated: 'Config. de notificações alteradas',
  guild_settings_updated: 'Config. de servidor alteradas',
  channel_settings_updated: 'Config. de canal alteradas',
  settings_updated: 'Configurações alteradas',
  avatar_updated: 'Avatar alterado',
  profile_updated: 'Perfil alterado',
  status_updated: 'Status alterado',
  email_updated: 'E-mail alterado',
  logout: 'Logouts',
  mfa_login: 'Logins com 2FA',
  new_login_location: 'Novos locais de login',
  oauth2_authorized: 'Apps autorizados',
  authorized_app: 'Apps autorizados',
  friend_request_sent: 'Pedidos de amizade enviados',
  friend_request_accepted: 'Pedidos de amizade aceitos',
  friend_added: 'Amigos adicionados',
  friend_removed: 'Amigos removidos',
  user_blocked: 'Usuários bloqueados',
  user_unblocked: 'Usuários desbloqueados',
  attachment_uploaded: 'Anexos enviados',
  file_uploaded: 'Arquivos enviados',
  emoji_used: 'Emojis usados',
  sticker_used: 'Figurinhas usadas',
  gif_selected: 'GIFs enviados',
  message_pinned: 'Mensagens fixadas',
  message_reported: 'Mensagens denunciadas',
  message_forwarded: 'Mensagens encaminhadas',
  reply_started: 'Respostas iniciadas',
  message_reaction_add: 'Reações que você deu',
  message_reaction_remove: 'Reações removidas',
  voice_channel_join: 'Vezes que entrou em call',
  voice_channel_leave: 'Vezes que saiu de call',
  screenshare_started: 'Compartilhamentos de tela',
  screenshare_ended: 'Compartilhamentos encerrados',
  go_live_started: 'Lives iniciadas',
  go_live_ended: 'Lives encerradas',
  video_stream_started: 'Transmissões iniciadas',
  popout_closed: 'Perfis fechados',
  modal_closed: 'Janelas fechadas',
  tab_opened: 'Abas abertas',
  context_menu_opened: 'Menus de contexto abertos',
  emoji_picker_opened: 'Seletor de emoji aberto',
  sticker_picker_opened: 'Seletor de figurinhas aberto',
  gif_picker_opened: 'Seletor de GIFs aberto',
  guild_created: 'Servidores criados',
  channel_pins_ack: 'Fixados marcados como lidos',
  notification_clicked: 'Notificações clicadas',
  application_launched: 'Aplicativos abertos',
  application_opened: 'Aplicativos abertos',
}

/**
 * Frase em 3ª pessoa por evento → "{nome} {phrase} {n} vezes".
 * Só os eventos aqui viram frase; os demais (com rótulo) caem no formato "{n} {rótulo}".
 */
export const EVENT_PHRASES: Record<string, string> = {
  session_start: 'abriu o Discord',
  session_end: 'fechou o Discord',
  session_start_success: 'conectou ao Discord',
  app_opened: 'abriu o app',
  send_message: 'enviou uma mensagem',
  message_edited: 'editou uma mensagem',
  message_deleted: 'apagou uma mensagem',
  message_pinned: 'fixou uma mensagem',
  message_reported: 'denunciou uma mensagem',
  message_forwarded: 'encaminhou uma mensagem',
  reply_started: 'respondeu uma mensagem',
  open_popout: 'abriu um perfil',
  popout_closed: 'fechou um perfil',
  user_profile_action: 'interagiu com um perfil',
  channel_opened: 'abriu um canal',
  channel_closed: 'fechou um canal',
  create_channel: 'criou um canal',
  channel_deleted: 'apagou um canal',
  guild_viewed: 'abriu um servidor',
  guild_joined: 'entrou num servidor',
  guild_created: 'criou um servidor',
  leave_guild: 'saiu de um servidor',
  member_list_viewed: 'abriu a lista de membros',
  member_list_view: 'abriu a lista de membros',
  dm_list_viewed: 'abriu as DMs',
  friends_list_viewed: 'abriu a lista de amigos',
  inbox_opened: 'abriu a caixa de entrada',
  close_tutorial: 'fechou um tutorial',
  ack_messages: 'marcou uma conversa como lida',
  channel_pins_ack: 'marcou os fixados como lidos',
  invite_opened: 'abriu um convite',
  accepted_instant_invite: 'aceitou um convite',
  open_modal: 'abriu uma janela',
  modal_closed: 'fechou uma janela',
  launch_game: 'abriu um jogo',
  join_voice_channel: 'entrou numa call',
  voice_channel_join: 'entrou numa call',
  leave_voice_channel: 'saiu de uma call',
  voice_channel_leave: 'saiu de uma call',
  voice_disconnect: 'saiu de uma call',
  voice_connection_success: 'conectou numa chamada',
  call_button_clicked: 'clicou em ligar',
  start_speaking: 'falou numa call',
  start_listening: 'ouviu um áudio',
  video_stream_started: 'iniciou uma transmissão',
  video_stream_ended: 'encerrou uma transmissão',
  screenshare_started: 'compartilhou a tela',
  screenshare_ended: 'parou de compartilhar a tela',
  go_live_started: 'iniciou uma live',
  go_live_ended: 'encerrou uma live',
  settings_pane_viewed: 'abriu as configurações',
  user_settings_updated: 'mudou uma configuração',
  notification_settings_updated: 'mudou uma config. de notificação',
  guild_settings_updated: 'mudou uma config. de servidor',
  channel_settings_updated: 'mudou uma config. de canal',
  settings_updated: 'mudou uma configuração',
  avatar_updated: 'mudou o avatar',
  profile_updated: 'mudou o perfil',
  status_updated: 'mudou o status',
  email_updated: 'mudou o e-mail',
  search_started: 'fez uma busca',
  image_hovered: 'olhou uma imagem',
  update_relationship: 'mudou uma amizade ou bloqueio',
  friend_request_sent: 'enviou um pedido de amizade',
  friend_request_accepted: 'aceitou um pedido de amizade',
  friend_added: 'adicionou um amigo',
  friend_removed: 'removeu um amigo',
  user_blocked: 'bloqueou alguém',
  user_unblocked: 'desbloqueou alguém',
  keyboard_shortcut_used: 'usou um atalho de teclado',
  login_attempted: 'tentou fazer login',
  login_successful: 'fez login',
  logout: 'saiu da conta',
  mfa_login: 'entrou com 2FA',
  new_login_location: 'entrou de um novo local',
  oauth2_authorized: 'autorizou um app',
  authorized_app: 'autorizou um app',
  notification_viewed: 'viu uma notificação',
  notification_clicked: 'clicou numa notificação',
  add_reaction: 'reagiu a uma mensagem',
  remove_reaction: 'removeu uma reação',
  message_reaction_add: 'reagiu a uma mensagem',
  message_reaction_remove: 'removeu uma reação',
  application_command_used: 'usou um comando',
  slash_command_used: 'usou um comando de barra',
  guild_onboarding_loaded: 'viu as boas-vindas de um servidor',
  sticker_sent: 'enviou uma figurinha',
  sticker_used: 'usou uma figurinha',
  gif_sent: 'enviou um GIF',
  gif_selected: 'enviou um GIF',
  emoji_used: 'usou um emoji',
  attachment_uploaded: 'enviou um anexo',
  file_uploaded: 'enviou um arquivo',
  tab_opened: 'abriu uma aba',
  context_menu_opened: 'abriu um menu de contexto',
  emoji_picker_opened: 'abriu o seletor de emojis',
  sticker_picker_opened: 'abriu o seletor de figurinhas',
  gif_picker_opened: 'abriu o seletor de GIFs',
  application_launched: 'abriu um aplicativo',
  application_opened: 'abriu um aplicativo',
}

/**
 * Eventos internos/telemetria que não fazem sentido para o usuário
 * (experimentos, anúncios, métricas, rede…). São escondidos das listas.
 */
const NOISE_PATTERNS = [
  'experiment', 'ad_decision', 'ad_viewed', 'ad_impression', 'ads_', 'impression',
  'analytics', 'metric', 'heartbeat', 'network', 'api_request', 'perf_', 'performance',
  'telemetry', 'debug', 'frame_rate', 'rtc_', 'webrtc', 'quic', 'protocol', 'sdk_',
  'gateway', 'render', 'batch', 'cold_start', 'crash', 'app_native',
  'app_ui_viewed', 'tracing', 'latency', 'bandwidth', 'cache_', 'preload',
  'dispatch', 'flush', 'sample', 'poll', 'ping', 'pong', '_sync', 'deprecat',
  'warning', '_error', 'fatal', 'timeout', 'retry', 'reconnect', 'websocket',
  'lazy_load', 'chunk', 'bundle', 'worker', 'service_worker', 'idle', 'gc_',
  'memory', 'cpu_', 'gpu_', 'fps', 'jank', 'paint', 'layout_shift', 'hydrat',
  'native_module', 'ipc_', 'updater', 'auto_update', 'download_progress',
  'received', 'delivered', 'queued', 'pending_', 'ack_native', 'ready_payload',
  'presence_update', 'typing', 'viewed_native', 'unhandled', 'fingerprint',
]

/** true quando o evento é relevante para exibir (whitelist sempre vence). */
export function isMeaningfulEvent(type: string): boolean {
  if (EVENT_LABELS[type]) return true
  const t = type.toLowerCase()
  return !NOISE_PATTERNS.some((p) => t.includes(p))
}

export function prettifyEvent(type: string): string {
  if (EVENT_LABELS[type]) return EVENT_LABELS[type]
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface ActivityStatDef {
  label: string
  icon: string
  types: string[]
  /** ação em 3ª pessoa p/ frase "{nome} {phrase} {n} vezes" */
  phrase: string
}

/** Grade de estatísticas (estilo discordpackage) — soma dos event_types indicados. */
export const ACTIVITY_STAT_DEFS: ActivityStatDef[] = [
  { label: 'Mensagens enviadas', icon: 'send', types: ['send_message'], phrase: 'enviou uma mensagem' },
  { label: 'Vezes que abriu o app', icon: 'power', types: ['app_opened'], phrase: 'abriu o app' },
  { label: 'Vezes que abriu o Discord', icon: 'activity', types: ['session_start'], phrase: 'abriu o Discord' },
  { label: 'Logins feitos', icon: 'login', types: ['login_successful'], phrase: 'fez login' },
  { label: 'Tentativas de login', icon: 'key', types: ['login_attempted'], phrase: 'tentou fazer login' },
  { label: 'Chamadas conectadas', icon: 'phone', types: ['voice_connection_success'], phrase: 'conectou numa chamada' },
  { label: 'Vezes que entrou em call', icon: 'phone-call', types: ['join_voice_channel'], phrase: 'entrou numa call' },
  { label: 'Vezes que saiu de call', icon: 'phone-off', types: ['leave_voice_channel', 'voice_disconnect'], phrase: 'saiu de uma call' },
  { label: 'Vezes que falou em call', icon: 'mic', types: ['start_speaking'], phrase: 'falou numa call' },
  { label: 'Reações que você deu', icon: 'heart', types: ['add_reaction'], phrase: 'reagiu a uma mensagem' },
  { label: 'Buscas feitas', icon: 'search', types: ['search_started'], phrase: 'fez uma busca' },
  { label: 'Transmissões (lives)', icon: 'video', types: ['video_stream_ended'], phrase: 'fez uma transmissão' },
  { label: 'Notificações vistas', icon: 'bell', types: ['notification_viewed'], phrase: 'viu uma notificação' },
  { label: 'Convites abertos', icon: 'link', types: ['invite_opened'], phrase: 'abriu um convite' },
  { label: 'Convites aceitos', icon: 'user-plus', types: ['accepted_instant_invite'], phrase: 'aceitou um convite' },
  { label: 'Servidores em que entrou', icon: 'server', types: ['guild_joined'], phrase: 'entrou num servidor' },
  { label: 'Servidores de que saiu', icon: 'server-off', types: ['leave_guild'], phrase: 'saiu de um servidor' },
  { label: 'Servidores que você olhou', icon: 'eye', types: ['guild_viewed'], phrase: 'abriu um servidor' },
  { label: 'Canais que você abriu', icon: 'hash', types: ['channel_opened'], phrase: 'abriu um canal' },
  { label: 'Canais criados', icon: 'plus', types: ['create_channel'], phrase: 'criou um canal' },
  { label: 'Canais apagados', icon: 'trash', types: ['channel_deleted'], phrase: 'apagou um canal' },
  { label: 'Perfis que você abriu', icon: 'user', types: ['open_popout'], phrase: 'abriu um perfil' },
  { label: 'Janelas abertas', icon: 'square', types: ['open_modal'], phrase: 'abriu uma janela' },
  { label: 'Atalhos de teclado usados', icon: 'keyboard', types: ['keyboard_shortcut_used'], phrase: 'usou um atalho de teclado' },
  { label: 'Tutoriais fechados', icon: 'graduation', types: ['close_tutorial'], phrase: 'fechou um tutorial' },
  { label: 'Jogos que você abriu', icon: 'gamepad', types: ['launch_game'], phrase: 'abriu um jogo' },
  { label: 'Comandos usados', icon: 'terminal', types: ['application_command_used', 'slash_command_used'], phrase: 'usou um comando' },
  { label: 'Conversas marcadas como lidas', icon: 'check', types: ['ack_messages'], phrase: 'marcou uma conversa como lida' },
  { label: 'Amizades e bloqueios alterados', icon: 'users', types: ['update_relationship'], phrase: 'alterou uma amizade ou bloqueio' },
]

/** country_code (ISO-2) → emoji de bandeira. */
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2 || !/^[a-zA-Z]{2}$/.test(code)) return ''
  const A = 0x1f1e6
  const up = code.toUpperCase()
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65))
}
