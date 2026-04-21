import { useState, useCallback } from 'react'
import type { Provider, UsageRecord, ProviderStats, DailyUsage, AppSettings } from '../types'

export type Page = 'dashboard' | 'usage' | 'providers' | 'settings'

export interface AppState {
  page: Page
  providers: Provider[]
  usageRecords: UsageRecord[]
  providerStats: ProviderStats[]
  dailyUsage: DailyUsage[]
  settings: AppSettings
  loading: boolean
  error: string | null
}

const defaultSettings: AppSettings = {
  theme: 'system',
  currency: 'USD',
  language: 'pt-BR',
  notifications: true,
  autoRefresh: false,
  refreshInterval: 30,
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    page: 'dashboard',
    providers: [],
    usageRecords: [],
    providerStats: [],
    dailyUsage: [],
    settings: defaultSettings,
    loading: false,
    error: null,
  })

  const setPage = useCallback((page: Page) => {
    setState(s => ({ ...s, page }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(s => ({ ...s, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(s => ({ ...s, error }))
  }, [])

  const setProviders = useCallback((providers: Provider[]) => {
    setState(s => ({ ...s, providers }))
  }, [])

  const setUsageRecords = useCallback((usageRecords: UsageRecord[]) => {
    setState(s => ({ ...s, usageRecords }))
  }, [])

  const setProviderStats = useCallback((providerStats: ProviderStats[]) => {
    setState(s => ({ ...s, providerStats }))
  }, [])

  const setDailyUsage = useCallback((dailyUsage: DailyUsage[]) => {
    setState(s => ({ ...s, dailyUsage }))
  }, [])

  const setSettings = useCallback((settings: AppSettings) => {
    setState(s => ({ ...s, settings }))
  }, [])

  return {
    state,
    setPage,
    setLoading,
    setError,
    setProviders,
    setUsageRecords,
    setProviderStats,
    setDailyUsage,
    setSettings,
  }
}