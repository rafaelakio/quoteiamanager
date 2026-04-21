import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw, Zap, Copy, Check, CircleDot } from 'lucide-react'
import type { AppSettings } from '../types'
import { useDb, useElectronEvent } from '../hooks/useDb'

interface Props {
  settings: AppSettings
  onRefresh: () => void
}

const INGEST_PORT = 47821

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

export function SettingsPage({ settings, onRefresh }: Props) {
  const { invoke } = useDb()
  const [form, setForm] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverActive, setServerActive] = useState(false)
  const [lastPing, setLastPing] = useState<string | null>(null)
  const [hookScriptPath, setHookScriptPath] = useState('')

  useEffect(() => {
    invoke<string>('app:getHookScriptPath').then(p => setHookScriptPath(p)).catch(() => {})
    // Check if server is reachable
    fetch(`http://127.0.0.1:${INGEST_PORT}/usage`, { method: 'OPTIONS' })
      .then(() => setServerActive(true))
      .catch(() => setServerActive(false))
  }, [invoke])

  const handleNewUsage = useCallback(() => {
    setLastPing(new Date().toLocaleTimeString('pt-BR'))
    onRefresh()
  }, [onRefresh])

  useElectronEvent('usage:new', handleNewUsage)

  const handleSave = async () => {
    setSaving(true)
    try {
      await invoke('db:updateSettings', {
        theme: form.theme,
        currency: form.currency,
        language: form.language,
        notifications: String(form.notifications),
        autoRefresh: String(form.autoRefresh),
        refreshInterval: String(form.refreshInterval),
      })
      setSaved(true)
      onRefresh()
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const isWindows = navigator.userAgent.includes('Windows')
  const scriptPath = hookScriptPath || (isWindows
    ? 'C:\\dev\\quoteIAmanager\\hook\\claude-code-hook.js'
    : '~/dev/quoteIAmanager/hook/claude-code-hook.js')

  const hookJson = JSON.stringify({
    hooks: {
      Stop: [{ type: "command", command: `node "${scriptPath}"` }]
    }
  }, null, 2)

  const settingsPath = isWindows
    ? '%APPDATA%\\Claude\\claude_desktop_config.json → ou → %USERPROFILE%\\.claude\\settings.json'
    : '~/.claude/settings.json'

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Configurações</h2>
          <p className="text-sm text-slate-400">Preferências do aplicativo</p>
        </div>

        {/* Integração Claude Code */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Integração com Claude Code CLI</h3>
            <div className="ml-auto flex items-center gap-2">
              <CircleDot className={`w-3 h-3 ${serverActive ? 'text-green-400' : 'text-slate-500'}`} />
              <span className={`text-xs ${serverActive ? 'text-green-400' : 'text-slate-500'}`}>
                {serverActive ? `Servidor ativo (porta ${INGEST_PORT})` : 'Aguardando app...'}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-4 text-sm">
            <p className="text-slate-400">
              Configure um <strong className="text-slate-200">hook</strong> no Claude Code para que cada sessão
              registre automaticamente os tokens usados neste app.
            </p>

            {lastPing && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                <Check className="w-3.5 h-3.5" />
                Último registro recebido às {lastPing}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase">1. Abra o arquivo de configuração</p>
              <CodeBlock code={settingsPath} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase">2. Adicione o hook Stop</p>
              <CodeBlock code={hookJson} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase">3. Teste manualmente (opcional)</p>
              <CodeBlock code={`echo '{"session_id":"test","transcript_path":""}' | node "${scriptPath}"`} />
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
              <p className="font-medium text-blue-200">Como funciona</p>
              <p>Ao encerrar cada conversa (<code className="font-mono">Stop</code>), o Claude Code executa o script, que lê o transcript da sessão, soma os tokens por modelo e envia para este app via HTTP local.</p>
              <p className="text-blue-400">Nenhum dado sai do seu computador.</p>
            </div>
          </div>
        </div>

        {/* Preferências */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Aparência</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tema</label>
              <select
                value={form.theme}
                onChange={e => setForm(f => ({ ...f, theme: e.target.value as AppSettings['theme'] }))}
                className="w-full bg-slate-900 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="system">Sistema</option>
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Regional</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Moeda</label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value as AppSettings['currency'] }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="USD">USD (Dólar)</option>
                  <option value="BRL">BRL (Real)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Idioma</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value as AppSettings['language'] }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Notificações</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-slate-300">Alertas de cota</p>
                <p className="text-xs text-slate-500">Notificar quando próximo ou acima da cota</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, notifications: !f.notifications }))}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                  form.notifications ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.notifications ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Atualização automática</h3>
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <div>
                <p className="text-sm text-slate-300">Atualizar automaticamente</p>
                <p className="text-xs text-slate-500">Recarregar dados em intervalos</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, autoRefresh: !f.autoRefresh }))}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                  form.autoRefresh ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.autoRefresh ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </div>
            </label>
            {form.autoRefresh && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Intervalo: {form.refreshInterval}s
                </label>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={form.refreshInterval}
                  onChange={e => setForm(f => ({ ...f, refreshInterval: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setForm(settings)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
