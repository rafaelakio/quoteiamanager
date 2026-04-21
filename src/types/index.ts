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
  currentMonth: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    requestCount: number
    costUsd: number
  }
  quota: number
  quotaType: 'tokens' | 'requests' | 'cost'
  alertThreshold: number
  percentUsed: number
  isOverQuota: boolean
  isNearQuota: boolean
}

export interface DailyUsage {
  date: string
  totalTokens: number
  costUsd: number
  requestCount: number
  providerBreakdown: Record<string, number>
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
  | 'app:openFile'
  | 'app:saveFile'
