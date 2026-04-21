import { useEffect, useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { UsagePage } from './pages/UsagePage'
import { ProvidersPage } from './pages/ProvidersPage'
import { SettingsPage } from './pages/SettingsPage'
import { Onboarding } from './pages/Onboarding'
import { useAppState } from './store/appStore'
import { useDb, useElectronEvent } from './hooks/useDb'
import type { Provider, UsageRecord, ProviderStats, AppSettings } from './types'

interface DailyRow {
  date: string
  total_tokens: number
  cost_usd: number
  request_count: number
  provider_name: string
}

interface RawProvider {
  id: number; name: string; slug: string; color: string; icon: string
  api_key_hint: string; monthly_quota: number; monthly_quota_type: 'tokens' | 'requests' | 'cost'
  alert_threshold: number; is_active: number; created_at: string
}

interface RawUsage {
  id: number; provider_id: number; provider_name: string; provider_color: string
  model: string; input_tokens: number; output_tokens: number; total_tokens: number
  request_count: number; cost_usd: number; used_at: string; notes: string
}

interface RawSettings {
  theme: string; currency: string; language: string
  notifications: string; autoRefresh: string; refreshInterval: string
  onboardingComplete?: string
  [key: string]: string | undefined
}

function mapProvider(r: RawProvider): Provider {
  return {
    id: r.id, name: r.name, slug: r.slug, color: r.color, icon: r.icon,
    apiKeyHint: r.api_key_hint, monthlyQuota: r.monthly_quota,
    monthlyQuotaType: r.monthly_quota_type, alertThreshold: r.alert_threshold,
    isActive: Boolean(r.is_active), createdAt: r.created_at,
  }
}

function mapUsage(r: RawUsage): UsageRecord {
  return {
    id: r.id, providerId: r.provider_id, providerName: r.provider_name,
    providerColor: r.provider_color, model: r.model, inputTokens: r.input_tokens,
    outputTokens: r.output_tokens, totalTokens: r.total_tokens, requestCount: r.request_count,
    costUsd: r.cost_usd, usedAt: r.used_at, notes: r.notes,
  }
}

function mapSettings(r: RawSettings): AppSettings {
  return {
    theme: (r.theme as AppSettings['theme']) || 'system',
    currency: (r.currency as AppSettings['currency']) || 'USD',
    language: (r.language as AppSettings['language']) || 'pt-BR',
    notifications: r.notifications === 'true',
    autoRefresh: r.autoRefresh === 'true',
    refreshInterval: Number(r.refreshInterval) || 30,
  }
}

export default function App() {
  const { invoke } = useDb()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const {
    state,
    setPage, setLoading, setError,
    setProviders, setUsageRecords, setProviderStats, setDailyUsage, setSettings,
  } = useAppState()

  // Check onboarding state on first load
  useEffect(() => {
    invoke<RawSettings>('db:getSettings').then(s => {
      setOnboardingDone(s.onboardingComplete === 'true')
    }).catch(() => setOnboardingDone(false))
  }, [invoke])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawProviders, rawUsage, rawStats, rawDaily, rawSettings] = await Promise.all([
        invoke<RawProvider[]>('db:getProviders'),
        invoke<RawUsage[]>('db:getUsageRecords', { limit: 200 }),
        invoke<ProviderStats[]>('db:getProviderStats'),
        invoke<DailyRow[]>('db:getDailyUsage', 30),
        invoke<RawSettings>('db:getSettings'),
      ])
      setProviders(rawProviders.map(mapProvider))
      setUsageRecords(rawUsage.map(mapUsage))
      setProviderStats(rawStats)
      setDailyUsage(rawDaily as never)
      setSettings(mapSettings(rawSettings))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [invoke, setLoading, setError, setProviders, setUsageRecords, setProviderStats, setDailyUsage, setSettings])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Refresh automatically when Claude Code hook pushes a new usage record
  useElectronEvent('usage:new', useCallback(() => loadAll(), [loadAll]))

  useEffect(() => {
    if (!state.settings.autoRefresh) return
    const id = setInterval(loadAll, state.settings.refreshInterval * 1000)
    return () => clearInterval(id)
  }, [state.settings.autoRefresh, state.settings.refreshInterval, loadAll])

  // Show loading until we know onboarding state
  if (onboardingDone === null) {
    return <div className="flex h-screen bg-slate-950 items-center justify-center">
      <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
    </div>
  }

  // Show onboarding wizard on first launch
  if (!onboardingDone) {
    return <Onboarding onComplete={() => { setOnboardingDone(true); loadAll() }} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        page={state.page}
        onNavigate={setPage}
        providerStats={state.providerStats}
      />
      <main className="flex-1 flex flex-col min-w-0 relative">
        {state.loading && (
          <div className="absolute top-3 right-3 z-10">
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
        )}
        {state.error && (
          <div className="mx-6 mt-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {state.error}
          </div>
        )}
        {state.page === 'dashboard' && (
          <Dashboard
            providerStats={state.providerStats}
            dailyUsage={state.dailyUsage as never}
          />
        )}
        {state.page === 'usage' && (
          <UsagePage
            usageRecords={state.usageRecords}
            providers={state.providers}
            onRefresh={loadAll}
          />
        )}
        {state.page === 'providers' && (
          <ProvidersPage
            providers={state.providers}
            providerStats={state.providerStats}
            onRefresh={loadAll}
          />
        )}
        {state.page === 'settings' && (
          <SettingsPage
            settings={state.settings}
            onRefresh={loadAll}
          />
        )}
      </main>
    </div>
  )
}
