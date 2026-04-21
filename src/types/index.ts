export interface Provider {
  id: number
  name: string
  slug: string
  color: string
  icon: string
  apiKeyHint: string
  monthlyQuota: number
  monthlyQuotaType: 'tokens' | 'requests' | 'cost'
  alertThreshold: number
  isActive: boolean
  createdAt: string
  planType?: string
  customLimits?: {
    tokens?: number
    requests?: number
    cost?: number
  }
  resetConfig?: ProviderResetConfig
}

export interface ProviderPlan {
  id: string
  name: string
  provider: string
  description: string
  limits: {
    tokens?: number
    requests?: number
    cost?: number
  }
  features: string[]
  isPopular?: boolean
}

export interface UsageRecord {
  id: number
  providerId: number
  providerName?: string
  providerColor?: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requestCount: number
  costUsd: number
  usedAt: string
  notes?: string
}

export interface ProviderStats {
  providerId: number
  providerName: string
  providerColor: string
  currentPeriod: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    requestCount: number
    costUsd: number
    startDate: string
    endDate: string
  }
  quota: number
  quotaType: 'tokens' | 'requests' | 'cost'
  alertThreshold: number
  percentUsed: number
  isOverQuota: boolean
  isNearQuota: boolean
  resetConfig?: ProviderResetConfig
  nextResetDate?: string
  daysUntilReset?: number
}

export interface DailyUsage {
  date: string
  totalTokens: number
  costUsd: number
  requestCount: number
  providerBreakdown: Record<string, number>
}

export interface ProviderResetConfig {
  id?: number
  providerId: number
  resetType: 'monthly' | 'weekly' | 'daily' | 'custom'
  resetDay?: number // 1-31 for monthly, 1-7 for weekly (1=Monday)
  resetTime: string // HH:MM format
  timezone: string // IANA timezone identifier
  isActive: boolean
  lastResetAt?: string
  nextResetAt?: string
  createdAt: string
  updatedAt: string
}

export interface ResetHistory {
  id: number
  providerId: number
  resetAt: string
  periodStart: string
  periodEnd: string
  totalTokens: number
  totalRequests: number
  totalCost: number
  resetType: string
  timezone: string
}

export interface TimezoneInfo {
  value: string
  label: string
  offset: string
  currentTime: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  currency: 'USD' | 'BRL' | 'EUR'
  language: 'pt-BR' | 'en-US'
  notifications: boolean
  autoRefresh: boolean
  refreshInterval: number
}

export type IpcChannel =
  | 'db:getProviders'
  | 'db:addProvider'
  | 'db:updateProvider'
  | 'db:deleteProvider'
  | 'db:getUsageRecords'
  | 'db:addUsageRecord'
  | 'db:deleteUsageRecord'
  | 'db:getProviderStats'
  | 'db:getDailyUsage'
  | 'db:getSettings'
  | 'db:updateSettings'
  | 'db:importCsv'
  | 'db:exportCsv'
  | 'db:getResetConfigs'
  | 'db:addResetConfig'
  | 'db:updateResetConfig'
  | 'db:deleteResetConfig'
  | 'db:getResetHistory'
  | 'db:performReset'
  | 'db:getTimezones'
  | 'db:getProviderStatsWithReset'
  | 'reset:getStatus'
  | 'reset:triggerCheck'
  | 'reset:getNextScheduled'
  | 'app:openFile'
  | 'app:saveFile'
  | 'config:getStatus'
  | 'config:forceHooks'
  | 'config:forceProviders'
  | 'config:forceScripts'
  | 'config:validateAll'
  | 'config:getLogs'
