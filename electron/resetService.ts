import { getUsageRecords } from './database'

export interface ResetConfig {
  id?: number
  providerId: number
  resetType: 'monthly' | 'weekly' | 'daily' | 'custom'
  resetDay?: number
  resetTime: string
  timezone: string
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

export class ResetService {
  // Timezone utilities
  static getTimezones(): Array<{value: string, label: string, offset: string}> {
    const timezones = [
      { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00' },
      { value: 'America/New_York', label: 'New York', offset: '-05:00' },
      { value: 'America/Los_Angeles', label: 'Los Angeles', offset: '-08:00' },
      { value: 'Europe/London', label: 'London', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
      { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
      { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
      { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
      { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
      { value: 'Australia/Sydney', label: 'Sydney', offset: '+11:00' },
      { value: 'UTC', label: 'UTC', offset: '+00:00' },
    ]
    
    return timezones.map(tz => ({
      ...tz,
      currentTime: new Date().toLocaleString('pt-BR', { timeZone: tz.value })
    }))
  }

  // Date calculation utilities
  static getNextResetDate(config: ResetConfig): Date {
    const now = new Date()
    const [hours, minutes] = config.resetTime.split(':').map(Number)
    
    let nextReset = new Date()
    
    switch (config.resetType) {
      case 'daily':
        nextReset = new Date(now)
        nextReset.setHours(hours, minutes, 0, 0)
        if (nextReset <= now) {
          nextReset.setDate(nextReset.getDate() + 1)
        }
        break
        
      case 'weekly':
        nextReset = new Date(now)
        const currentDay = nextReset.getDay() // 0 = Sunday, 1 = Monday, ...
        const targetDay = config.resetDay || 1 // Default to Monday
        let daysUntilTarget = (targetDay - currentDay + 7) % 7
        if (daysUntilTarget === 0 && nextReset > new Date(now.setHours(hours, minutes, 0, 0))) {
          daysUntilTarget = 7
        }
        nextReset.setDate(nextReset.getDate() + daysUntilTarget)
        nextReset.setHours(hours, minutes, 0, 0)
        break
        
      case 'monthly':
        nextReset = new Date(now.getFullYear(), now.getMonth(), (config.resetDay || 1), hours, minutes, 0, 0)
        if (nextReset <= now) {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, (config.resetDay || 1), hours, minutes, 0, 0)
        }
        break
        
      case 'custom':
        // For custom, we'll use the nextResetAt field if set, otherwise default to monthly
        if (config.nextResetAt) {
          nextReset = new Date(config.nextResetAt)
        } else {
          nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, hours, minutes, 0, 0)
        }
        break
    }
    
    return nextReset
  }

  static getPeriodStart(config: ResetConfig, referenceDate?: Date): Date {
    const ref = referenceDate || new Date()
    const [hours, minutes] = config.resetTime.split(':').map(Number)
    
    let periodStart = new Date(ref)
    
    switch (config.resetType) {
      case 'daily':
        periodStart.setHours(hours, minutes, 0, 0)
        if (periodStart > ref) {
          periodStart.setDate(periodStart.getDate() - 1)
        }
        break
        
      case 'weekly':
        const targetDay = config.resetDay || 1 // Monday
        const currentDay = periodStart.getDay()
        let daysToGoBack = (currentDay - targetDay + 7) % 7
        if (daysToGoBack === 0 && periodStart.getHours() < hours) {
          daysToGoBack = 7
        }
        periodStart.setDate(periodStart.getDate() - daysToGoBack)
        periodStart.setHours(hours, minutes, 0, 0)
        break
        
      case 'monthly':
        const targetDayOfMonth = config.resetDay || 1
        if (periodStart.getDate() < targetDayOfMonth || 
            (periodStart.getDate() === targetDayOfMonth && periodStart.getHours() < hours)) {
          periodStart.setMonth(periodStart.getMonth() - 1)
        }
        periodStart.setDate(targetDayOfMonth)
        periodStart.setHours(hours, minutes, 0, 0)
        break
        
      case 'custom':
        // For custom, try to use lastResetAt or default to 30 days ago
        if (config.lastResetAt) {
          periodStart = new Date(config.lastResetAt)
        } else {
          periodStart.setDate(periodStart.getDate() - 30)
        }
        break
    }
    
    return periodStart
  }

  static getDaysUntilReset(config: ResetConfig): number {
    const nextReset = this.getNextResetDate(config)
    const now = new Date()
    const diffTime = nextReset.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Reset configuration management
  static createResetConfig(config: Omit<ResetConfig, 'id' | 'createdAt' | 'updatedAt'>): ResetConfig {
    const now = new Date().toISOString()
    const nextReset = this.getNextResetDate(config as ResetConfig)
    
    return {
      ...config,
      id: 0, // Will be set by database
      createdAt: now,
      updatedAt: now,
      nextResetAt: nextReset.toISOString()
    }
  }

  static updateResetConfig(config: ResetConfig): ResetConfig {
    const nextReset = this.getNextResetDate(config)
    
    return {
      ...config,
      updatedAt: new Date().toISOString(),
      nextResetAt: nextReset.toISOString()
    }
  }

  // Reset execution
  static async performReset(providerId: number, config: ResetConfig): Promise<ResetHistory> {
    const periodStart = this.getPeriodStart(config)
    const periodEnd = new Date()
    
    // Get usage records for the period
    const usageRecords = getUsageRecords({
      providerId,
      startDate: periodStart.toISOString(),
      endDate: periodEnd.toISOString()
    })
    
    // Calculate totals
    const totals = usageRecords.reduce((acc, record) => ({
      totalTokens: acc.totalTokens + record.total_tokens,
      totalRequests: acc.totalRequests + record.request_count,
      totalCost: acc.totalCost + record.cost_usd
    }), { totalTokens: 0, totalRequests: 0, totalCost: 0 })
    
    // Create reset history record
    const resetHistory: ResetHistory = {
      id: 0, // Will be set by database
      providerId,
      resetAt: new Date().toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalTokens: totals.totalTokens,
      totalRequests: totals.totalRequests,
      totalCost: totals.totalCost,
      resetType: config.resetType,
      timezone: config.timezone
    }
    
    return resetHistory
  }

  // Check for pending resets
  static getPendingResets(resetConfigs: ResetConfig[]): ResetConfig[] {
    const now = new Date()
    return resetConfigs.filter(config => {
      if (!config.isActive) return false
      
      const nextReset = new Date(config.nextResetAt || '')
      return nextReset <= now
    })
  }

  // Get current period stats
  static getCurrentPeriodStats(providerId: number, config: ResetConfig) {
    const periodStart = this.getPeriodStart(config)
    const now = new Date()
    
    const usageRecords = getUsageRecords({
      providerId,
      startDate: periodStart.toISOString(),
      endDate: now.toISOString()
    })
    
    const stats = usageRecords.reduce((acc, record) => ({
      totalTokens: acc.totalTokens + record.total_tokens,
      inputTokens: acc.inputTokens + record.input_tokens,
      outputTokens: acc.outputTokens + record.output_tokens,
      requestCount: acc.requestCount + record.request_count,
      costUsd: acc.costUsd + record.cost_usd
    }), { 
      totalTokens: 0, 
      inputTokens: 0, 
      outputTokens: 0, 
      requestCount: 0, 
      costUsd: 0 
    })
    
    return {
      ...stats,
      startDate: periodStart.toISOString(),
      endDate: now.toISOString(),
      daysUntilReset: this.getDaysUntilReset(config),
      nextResetDate: this.getNextResetDate(config).toISOString()
    }
  }
}