
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Palette,
  Save,
  Loader2,
  Bell,
  BellOff,
  FolderOpen,
  HardDrive,
  Monitor,
  Wrench,
  X,
  Trash2,
  AlertTriangle,
  Sparkles,
  Grid3x3,
  Type,
  Square,
} from "lucide-react"
import { api } from "@/lib/api-client"
import { aplicarCorPainel, aplicarAparencia, aplicarTema, resetarTema } from "@/hooks/use-cor-painel"
import { TEMAS, getTema } from "@/lib/themes"
import { ColorPicker } from "@/components/ui/color-picker"
import { ThemePickerModal } from "@/components/theme-picker-modal"
import { ThemedIcon } from "@/components/themed-icon"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import type { AppSettings } from "@/types/api"

const DELAY_OPTIONS = [
  { value: 300, label: "300ms", desc: "Rápido" },
  { value: 500, label: "500ms", desc: "Normal" },
  { value: 700, label: "700ms", desc: "Seguro" },
  { value: 1000, label: "1s", desc: "Lento" },
  { value: 1500, label: "1.5s", desc: "Muito lento" },
]

export default function PaginaConfiguracoes() {
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    corPainel: "#ffffff",
    tema: "custom",
    delay: 700,
    aguardarFetch: true,
    aparencia: {
      bloomIntensidade: "normal",
      estiloCards: "flat",
      tamanhoFonte: "normal",
      mostrarGrade: true,
    },
    general: {
      language: "pt-BR",
      notifications: true,
      minimizeToTray: true,
      logLevel: "info",
    },
    storage: {
      backupsDir: "",
      logsDir: "",
    },
  })
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [customDelay, setCustomDelay] = useState(false)
  const savedSettings = useRef<string>("")

  const hasChanges = JSON.stringify(settings) !== savedSettings.current

  useEffect(() => {
    api.getSettings()
      .then((res) => {
        const data = res.data as Partial<AppSettings>
        setSettings(data)
        savedSettings.current = JSON.stringify(data)
        if (data.delay && !DELAY_OPTIONS.some((o) => o.value === data.delay)) {
          setCustomDelay(true)
        }
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const handleSave = async () => {
    setSalvando(true)
    try {
      await api.updateSettings(settings)
      const temaId = settings.tema || 'custom'
      if (temaId === 'custom' || temaId === 'padrao') {
        resetarTema()
        if (temaId === 'custom' && settings.corPainel) aplicarCorPainel(settings.corPainel)
      } else {
        const tema = getTema(temaId)
        if (tema) aplicarTema(tema)
      }
      if (settings.aparencia) aplicarAparencia(settings.aparencia)
      savedSettings.current = JSON.stringify(settings)
    } catch {} finally {
      setSalvando(false)
    }
  }

  const updateGeneral = (key: string, value: unknown) => {
    setSettings((s) => ({
      ...s,
      general: { ...s.general!, [key]: value } as AppSettings["general"],
    }))
  }

  const updateAparencia = (key: string, value: unknown) => {
    setSettings((s) => {
      const novaAparencia = { ...s.aparencia!, [key]: value } as AppSettings["aparencia"]
      aplicarAparencia(novaAparencia)
      return { ...s, aparencia: novaAparencia }
    })
  }

  const pickDirectory = async (key: "backupsDir" | "logsDir") => {
    const dir = await window.electronAPI?.dialog.openDirectory()
    if (dir) {
      setSettings((s) => ({
        ...s,
        storage: { ...s.storage!, [key]: dir } as AppSettings["storage"],
      }))
    }
  }

  const Toggle = ({ ativado, aoAlternar, label }: { ativado: boolean; aoAlternar: () => void; label: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={ativado}
      aria-label={label}
      onClick={aoAlternar}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        ativado ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${
          ativado ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie todas as configurações do BrunnoClear</p>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
            <ThemedIcon name="appearance" size={24}><Palette size={18} className="text-purple-400" /></ThemedIcon>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aparência</h2>
            <p className="text-xs text-muted-foreground">Personalize as cores e o visual do painel</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 block">
              Tema
            </label>
            <ThemePickerModal
              tema={settings.tema ?? "custom"}
              corPainel={settings.corPainel ?? "#ffffff"}
              onSelectTema={(temaId) => {
                setSettings((s) => ({ ...s, tema: temaId }))
                if (temaId === 'custom' || temaId === 'padrao') {
                  resetarTema()
                  if (temaId === 'custom' && settings.corPainel) aplicarCorPainel(settings.corPainel)
                } else {
                  const t = getTema(temaId)
                  if (t) aplicarTema(t)
                }
              }}
              onSelectCor={(cor) => {
                setSettings((s) => ({ ...s, corPainel: cor }))
                resetarTema()
                aplicarCorPainel(cor)
              }}
            />
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-muted-foreground" />
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Intensidade do Bloom
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Controla o brilho das luzes de fundo</p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: "desligado", label: "Desligado", desc: "Sem efeito" },
                { value: "sutil", label: "Sutil", desc: "Discreto" },
                { value: "normal", label: "Normal", desc: "Padrão" },
                { value: "intenso", label: "Intenso", desc: "Vibrante" },
              ] as const).map((opt) => {
                const selected = settings.aparencia?.bloomIntensidade === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateAparencia("bloomIntensidade", opt.value)}
                    className={`flex flex-col items-center rounded-lg border p-3 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px]">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Square size={14} className="text-muted-foreground" />
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estilo dos Cards
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Visual dos painéis e seções</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "flat", label: "Flat", desc: "Sólido" },
                { value: "glass", label: "Glass", desc: "Transparente" },
                { value: "bordered", label: "Bordered", desc: "Destaque" },
              ] as const).map((opt) => {
                const selected = settings.aparencia?.estiloCards === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateAparencia("estiloCards", opt.value)}
                    className={`flex flex-col items-center rounded-lg border p-3 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px]">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type size={14} className="text-muted-foreground" />
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tamanho da Fonte
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "pequeno", label: "Pequeno", desc: "14px" },
                { value: "normal", label: "Normal", desc: "16px" },
                { value: "grande", label: "Grande", desc: "18px" },
              ] as const).map((opt) => {
                const selected = settings.aparencia?.tamanhoFonte === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateAparencia("tamanhoFonte", opt.value)}
                    className={`flex flex-col items-center rounded-lg border p-3 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-[10px]">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-3">
              <Grid3x3 size={16} className={settings.aparencia?.mostrarGrade ? "text-primary" : "text-muted-foreground"} />
              <div>
                <p className="text-sm font-medium text-foreground">Grade de fundo</p>
                <p className="text-xs text-muted-foreground">Exibe uma grade sutil no plano de fundo</p>
              </div>
            </div>
            <Toggle
              label="Grade de fundo"
              ativado={settings.aparencia?.mostrarGrade ?? true}
              aoAlternar={() => updateAparencia("mostrarGrade", !settings.aparencia?.mostrarGrade)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ThemedIcon name="settings" size={24}><Wrench size={18} className="text-primary" /></ThemedIcon>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Ferramentas</h2>
            <p className="text-xs text-muted-foreground">Configurações de execução das ferramentas</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Aguardar Fetch</p>
              <p className="text-xs text-muted-foreground">Aguarda a resposta da API antes de continuar</p>
            </div>
            <Toggle
              label="Aguardar Fetch"
              ativado={settings.aguardarFetch ?? true}
              aoAlternar={() => setSettings((s) => ({ ...s, aguardarFetch: !s.aguardarFetch }))}
            />
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Delay padrão</p>
            <p className="text-xs text-muted-foreground mb-4">Intervalo entre requisições para evitar rate-limit</p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {DELAY_OPTIONS.map((opt) => {
                const selected = !customDelay && settings.delay === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSettings((s) => ({ ...s, delay: opt.value }))
                      setCustomDelay(false)
                    }}
                    className={`flex flex-col items-center rounded-lg border p-3 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold tabular-nums">{opt.label}</span>
                    <span className="text-[10px]">{opt.desc}</span>
                  </button>
                )
              })}
              <button
                onClick={() => setCustomDelay(true)}
                className={`flex flex-col items-center rounded-lg border p-3 transition-all ${
                  customDelay
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <span className="text-sm font-semibold">Custom</span>
                <span className="text-[10px]">Manual</span>
              </button>
            </div>

            {customDelay && (
              <div className="mt-3 flex items-center gap-3">
                <Input
                  value={settings.delay ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === "") {
                      setSettings((s) => ({ ...s, delay: undefined as unknown as number }))
                    } else {
                      const n = parseInt(raw)
                      if (!isNaN(n)) setSettings((s) => ({ ...s, delay: n }))
                    }
                  }}
                  className="w-28 border-border bg-secondary/40 text-sm"
                  type="number"
                  min={100}
                  step={50}
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">milissegundos</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <ThemedIcon name="computer" size={24}><Monitor size={18} className="text-blue-400" /></ThemedIcon>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sistema</h2>
            <p className="text-xs text-muted-foreground">Comportamento geral da aplicação</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-3">
              {settings.general?.notifications ? (
                <Bell size={16} className="text-primary" />
              ) : (
                <BellOff size={16} className="text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Notificações</p>
                <p className="text-xs text-muted-foreground">Alertas do Windows ao iniciar e concluir limpezas</p>
              </div>
            </div>
            <Toggle
              label="Notificações"
              ativado={settings.general?.notifications ?? true}
              aoAlternar={() => updateGeneral("notifications", !settings.general?.notifications)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Minimizar para bandeja</p>
              <p className="text-xs text-muted-foreground">Ao fechar, minimiza para a bandeja do sistema</p>
            </div>
            <Toggle
              label="Minimizar para a bandeja"
              ativado={settings.general?.minimizeToTray ?? true}
              aoAlternar={() => updateGeneral("minimizeToTray", !settings.general?.minimizeToTray)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Nível de log</p>
              <p className="text-xs text-muted-foreground">Define o nível de detalhe dos logs</p>
            </div>
            <select
              value={settings.general?.logLevel ?? "info"}
              onChange={(e) => updateGeneral("logLevel", e.target.value)}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm text-foreground outline-none"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
            <ThemedIcon name="folder" size={24}><HardDrive size={18} className="text-orange-400" /></ThemedIcon>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Armazenamento</h2>
            <p className="text-xs text-muted-foreground">Diretórios para backup e logs</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Diretório de backups</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Onde os backups de mensagens serão salvos</p>
            <div className="flex gap-2">
              <Input
                value={settings.storage?.backupsDir ?? ""}
                readOnly
                placeholder="Selecione um diretório..."
                className="flex-1 border-border bg-secondary/40 font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => pickDirectory("backupsDir")}
                className="shrink-0 border-border text-muted-foreground hover:text-foreground"
              >
                <FolderOpen size={14} className="mr-2" />
                Selecionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Diretório de logs</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Onde os logs da aplicação serão salvos</p>
            <div className="flex gap-2">
              <Input
                value={settings.storage?.logsDir ?? ""}
                readOnly
                placeholder="Selecione um diretório..."
                className="flex-1 border-border bg-secondary/40 font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => pickDirectory("logsDir")}
                className="shrink-0 border-border text-muted-foreground hover:text-foreground"
              >
                <FolderOpen size={14} className="mr-2" />
                Selecionar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Zona de Perigo</h2>
            <p className="text-xs text-muted-foreground">Ações irreversíveis que afetam todos os dados</p>
          </div>
        </div>

        <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 size={16} className="text-red-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Apagar todos os dados</p>
                <p className="text-xs text-muted-foreground">Remove tokens, backups, logs, analytics e avatares. As configurações são mantidas.</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
                >
                  <Trash2 size={14} className="mr-2" />
                  Apagar tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-red-500/20 bg-card">
                <AlertDialogHeader>
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <AlertDialogTitle className="text-center">Apagar todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription className="text-center">
                    Isso irá remover permanentemente todos os seus <span className="font-medium text-foreground">tokens, backups, logs, analytics e avatares</span>. As configurações serão mantidas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-2 sm:justify-center">
                  <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await api.clearAllData()
                        window.electronAPI?.notification.show({ title: "BrunnoClear", body: "Todos os dados foram apagados. Reinicie o app." })
                        window.electronAPI?.app.quit()
                      } catch {
                      }
                    }}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Sim, apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div
        className={`settings-savebar fixed bottom-6 left-64 right-0 z-50 flex justify-center pointer-events-none transition-all duration-300 ease-out ${
          hasChanges ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 px-5 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Alterações pendentes</span>
          <button
            onClick={() => {
              const prev = JSON.parse(savedSettings.current) as Partial<AppSettings>
              setSettings(prev)
              const temaId = prev.tema || 'custom'
              if (temaId === 'custom' || temaId === 'padrao') {
                resetarTema()
                if (temaId === 'custom' && prev.corPainel) aplicarCorPainel(prev.corPainel)
              } else {
                const t = getTema(temaId)
                if (t) aplicarTema(t)
              }
              if (prev.aparencia) aplicarAparencia(prev.aparencia)
            }}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={14} />
          </button>
          <Button
            onClick={handleSave}
            disabled={salvando}
            size="sm"
            className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {salvando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}
