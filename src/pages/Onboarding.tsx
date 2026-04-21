import { useState, useEffect } from 'react'
import { Check, ChevronRight, Zap, RefreshCw, FolderOpen } from 'lucide-react'
import { useDb } from '../hooks/useDb'

interface Props {
  onComplete: () => void
}

interface ProviderOption {
  slug: string
  name: string
  color: string
  defaultQuota: number
  quotaType: 'tokens' | 'requests' | 'cost'
  icon: string
  quotaLabel?: string   // custom label for non-token quotas
  quotaMin?: number
  quotaMax?: number
  quotaStep?: number
  autoCapture?: boolean // false = usage must be added manually
}

const ALL_PROVIDERS: ProviderOption[] = [
  // ─── API diretas (captura automática via transcripts) ─────────────────────
  { slug: 'anthropic', name: 'Anthropic',       color: '#d97706', defaultQuota: 1000000, quotaType: 'tokens', icon: '🧠', autoCapture: true },
  { slug: 'openai',    name: 'OpenAI',          color: '#10a37f', defaultQuota: 1000000, quotaType: 'tokens', icon: '🤖', autoCapture: true },
  { slug: 'google',    name: 'Google Gemini',   color: '#4285f4', defaultQuota: 1000000, quotaType: 'tokens', icon: '✨', autoCapture: true },
  { slug: 'mistral',   name: 'Mistral AI',      color: '#7c3aed', defaultQuota: 1000000, quotaType: 'tokens', icon: '⚡', autoCapture: true },
  { slug: 'groq',      name: 'Groq',            color: '#059669', defaultQuota: 500000,  quotaType: 'tokens', icon: '⚙️', autoCapture: true },
  { slug: 'cohere',    name: 'Cohere',          color: '#0891b2', defaultQuota: 1000000, quotaType: 'tokens', icon: '🔵', autoCapture: true },
  { slug: 'xai',       name: 'xAI (Grok)',      color: '#e11d48', defaultQuota: 1000000, quotaType: 'tokens', icon: '𝕏', autoCapture: true },
  { slug: 'deepseek',  name: 'DeepSeek',        color: '#2563eb', defaultQuota: 1000000, quotaType: 'tokens', icon: '🔍', autoCapture: true },
  // ─── Ferramentas de coding AI (registro manual ou futuras integrações) ────
  {
    slug: 'copilot', name: 'GitHub Copilot', color: '#6e40c9',
    defaultQuota: 300, quotaType: 'requests',
    quotaLabel: 'premium requests/mês',
    quotaMin: 50, quotaMax: 1500, quotaStep: 50,
    icon: '🐙', autoCapture: false,
  },
  {
    slug: 'kiro', name: 'Amazon Kiro', color: '#FF9900',
    defaultQuota: 20, quotaType: 'cost',
    quotaLabel: 'USD/mês (créditos)',
    quotaMin: 20, quotaMax: 200, quotaStep: 20,
    icon: '☁️', autoCapture: false,
  },
  {
    slug: 'devin', name: 'Devin (Cognition)', color: '#3969CA',
    defaultQuota: 250, quotaType: 'requests',
    quotaLabel: 'ACUs/mês',
    quotaMin: 50, quotaMax: 1000, quotaStep: 50,
    icon: '🤖', autoCapture: false,
  },
]

function fmtQuota(p: ProviderOption, n: number) {
  if (p.quotaLabel) {
    if (p.quotaType === 'cost') return `$${n.toFixed(0)} ${p.quotaLabel}`
    return `${n.toLocaleString()} ${p.quotaLabel}`
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M tokens/mês`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K tokens/mês`
  return `${n} tokens/mês`
}

export function Onboarding({ onComplete }: Props) {
  const { invoke } = useDb()
  const [step, setStep] = useState(0) // 0=welcome, 1=providers, 2=quotas, 3=done
  const [selected, setSelected] = useState<Set<string>>(new Set(['anthropic']))
  const [quotas, setQuotas] = useState<Record<string, number>>({})
  const [claudeDir, setClaudeDir] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    invoke<string | null>('app:getClaudeProjectsDir').then(setClaudeDir).catch(() => {})
  }, [invoke])

  const toggleProvider = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(slug)) { next.delete(slug) } else { next.add(slug) }
      return next
    })
  }

  const getQuota = (slug: string) => {
    if (quotas[slug] !== undefined) return quotas[slug]
    return ALL_PROVIDERS.find(p => p.slug === slug)?.defaultQuota ?? 1000000
  }

  const handleSaveProviders = async () => {
    setSaving(true)
    try {
      // Get existing providers to avoid duplicates
      const existing = await invoke<Array<{ slug: string; id: number }>>('db:getProviders')
      const existingSlugs = new Set(existing.map(p => p.slug))

      for (const slug of selected) {
        if (existingSlugs.has(slug)) {
          // Update quota on existing
          const p = ALL_PROVIDERS.find(x => x.slug === slug)!
          const ex = existing.find(e => e.slug === slug)!
          await invoke('db:updateProvider', ex.id, {
            monthlyQuota: getQuota(slug),
            monthlyQuotaType: p.quotaType,
            isActive: true,
          })
        } else {
          const p = ALL_PROVIDERS.find(x => x.slug === slug)!
          await invoke('db:addProvider', {
            name: p.name,
            slug: p.slug,
            color: p.color,
            icon: 'cpu',
            apiKeyHint: '',
            monthlyQuota: getQuota(slug),
            monthlyQuotaType: p.quotaType,
            alertThreshold: 0.8,
          })
        }
      }
      // Disable unselected providers
      for (const ex of existing) {
        if (!selected.has(ex.slug)) {
          await invoke('db:updateProvider', ex.id, { isActive: false })
        }
      }

      setStep(3)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const count = await invoke<number>('app:syncTranscripts')
      setSyncCount(count)
    } finally {
      setSyncing(false)
    }
  }

  const handleFinish = async () => {
    await invoke('db:updateSettings', { onboardingComplete: 'true' })
    onComplete()
  }

  return (
    <div className="flex h-screen bg-slate-950 items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {['Boas-vindas', 'Provedores', 'Cotas', 'Pronto'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                i < step ? 'bg-green-500 text-white'
                : i === step ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400'
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{label}</span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-slate-600" />}
            </div>
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Quote IA Manager</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Monitore automaticamente o consumo das IAs que você usa.
                Vamos configurar em 3 passos rápidos.
              </p>
            </div>
            {claudeDir && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-left">
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span>Claude Code detectado em <code className="font-mono">{claudeDir}</code></span>
              </div>
            )}
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
            >
              Começar configuração
            </button>
          </div>
        )}

        {/* Step 1: Select providers */}
        {step === 1 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">Quais IAs você usa?</h2>
              <p className="text-sm text-slate-400 mt-1">Selecione os provedores para monitorar</p>
            </div>

            {/* API diretas */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">APIs diretas — captura automática</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PROVIDERS.filter(p => p.autoCapture).map(p => {
                  const isSelected = selected.has(p.slug)
                  return (
                    <button
                      key={p.slug}
                      onClick={() => toggleProvider(p.slug)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}44` }}>
                        {p.icon}
                      </div>
                      <p className="text-xs font-medium text-white flex-1 leading-tight">{p.name}</p>
                      {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Ferramentas de coding */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Ferramentas de coding — registro manual</p>
              <div className="grid grid-cols-1 gap-2">
                {ALL_PROVIDERS.filter(p => !p.autoCapture).map(p => {
                  const isSelected = selected.has(p.slug)
                  return (
                    <button
                      key={p.slug}
                      onClick={() => toggleProvider(p.slug)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}44` }}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.quotaLabel ?? 'tokens/mês'}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors">
                Voltar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selected.size === 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm transition-colors disabled:opacity-40"
              >
                Próximo ({selected.size} selecionado{selected.size !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Set quotas */}
        {step === 2 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">Cotas mensais</h2>
              <p className="text-sm text-slate-400 mt-1">Defina o limite de tokens por mês para cada provedor</p>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {[...selected].map(slug => {
                const p = ALL_PROVIDERS.find(x => x.slug === slug)!
                const quota = getQuota(slug)
                return (
                  <div key={slug} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: p.color + '22' }}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{fmtQuota(p, quota)}</p>
                    </div>
                    <input
                      type="range"
                      min={p.quotaMin ?? 100000}
                      max={p.quotaMax ?? 10000000}
                      step={p.quotaStep ?? 100000}
                      value={quota}
                      onChange={e => setQuotas(q => ({ ...q, [slug]: Number(e.target.value) }))}
                      className="w-28"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors">
                Voltar
              </button>
              <button
                onClick={handleSaveProviders}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar e continuar'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done + initial sync */}
        {step === 3 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Tudo pronto!</h2>
              <p className="text-slate-400 text-sm">
                O app monitora automaticamente o diretório{' '}
                <code className="text-slate-300 font-mono text-xs">~/.claude/projects/</code>{' '}
                — cada sessão do Claude Code é capturada em tempo real.
              </p>
            </div>

            {claudeDir && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Importar histórico de sessões anteriores:</p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar histórico'}
                </button>
                {syncCount !== null && (
                  <p className="text-xs text-green-400">
                    {syncCount > 0 ? `✓ ${syncCount} sessão(ões) importada(s)` : 'Nenhum registro novo encontrado'}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
            >
              Ir para o Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
