import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { ResetService } from './resetService'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderRow {
  id: number; name: string; slug: string; color: string; icon: string
  api_key_hint: string; monthly_quota: number; monthly_quota_type: string
  alert_threshold: number; is_active: number; created_at: string
}

interface UsageRow {
  id: number; provider_id: number; model: string; input_tokens: number
  output_tokens: number; total_tokens: number; request_count: number
  cost_usd: number; used_at: string; notes: string
}

interface ResetConfigRow {
  id: number; provider_id: number; reset_type: string; reset_day?: number
  reset_time: string; timezone: string; is_active: number
  last_reset_at?: string; next_reset_at?: string; created_at: string; updated_at: string
}

interface ResetHistoryRow {
  id: number; provider_id: number; reset_at: string; period_start: string
  period_end: string; total_tokens: number; total_requests: number; total_cost: number
  reset_type: string; timezone: string
}

interface DbData {
  providers: ProviderRow[]
  usage: UsageRow[]
  resetConfigs: ResetConfigRow[]
  resetHistory: ResetHistoryRow[]
  settings: Record<string, string>
  nextProviderId: number
  nextUsageId: number
  nextResetConfigId: number
  nextResetHistoryId: number
}

// ─── Storage ─────────────────────────────────────────────────────────────────

let _db: DbData | null = null
let _dbPath = ''

function dbPath(): string {
  if (_dbPath) return _dbPath
  _dbPath = path.join(app.getPath('userData'), 'quoteiamanager.json')
  return _dbPath
}

function loadDb(): DbData {
  if (_db) return _db
  if (fs.existsSync(dbPath())) {
    try {
      _db = JSON.parse(fs.readFileSync(dbPath(), 'utf-8')) as DbData
      migrateDb(_db)
      return _db
    } catch {
      // fall through to defaults
    }
  }
  _db = {
    providers: [],
    usage: [],
    resetConfigs: [],
    resetHistory: [],
    settings: {
      theme: 'system',
      currency: 'USD',
      language: 'pt-BR',
      notifications: 'true',
      autoRefresh: 'false',
      refreshInterval: '30',
    },
    nextProviderId: 1,
    nextUsageId: 1,
    nextResetConfigId: 1,
    nextResetHistoryId: 1,
  }
  seedProviders(_db)
  saveDb()
  return _db
}

function saveDb() {
  if (!_db) return
  fs.writeFileSync(dbPath(), JSON.stringify(_db, null, 2), 'utf-8')
}

// Adds missing providers to existing databases without resetting data
function migrateDb(db: DbData) {
  const newProviders = [
    { name: 'xAI (Grok)',      slug: 'xai',      color: '#e11d48', icon: 'zap',      quota: 1000000, type: 'tokens' },
    { name: 'DeepSeek',        slug: 'deepseek', color: '#2563eb', icon: 'cpu',      quota: 1000000, type: 'tokens' },
    { name: 'GitHub Copilot',  slug: 'copilot',  color: '#6e40c9', icon: 'bot',      quota: 300,     type: 'requests' },
    { name: 'Amazon Kiro',     slug: 'kiro',     color: '#FF9900', icon: 'sparkles', quota: 20,      type: 'cost' },
    { name: 'Devin (Cognition)', slug: 'devin',  color: '#3969CA', icon: 'cpu',      quota: 250,     type: 'requests' },
  ]
  const existingSlugs = new Set(db.providers.map(p => p.slug))
  let changed = false
  for (const s of newProviders) {
    if (!existingSlugs.has(s.slug)) {
      db.providers.push({
        id: db.nextProviderId++,
        name: s.name, slug: s.slug, color: s.color, icon: s.icon,
        api_key_hint: '', monthly_quota: s.quota, monthly_quota_type: s.type,
        alert_threshold: 0.8, is_active: 0, // inactive by default, user enables via onboarding
        created_at: new Date().toISOString(),
      })
      changed = true
    }
  }
  
  // Initialize reset configs and history arrays if they don't exist
  if (!db.resetConfigs) {
    db.resetConfigs = []
    db.nextResetConfigId = 1
    changed = true
  }
  if (!db.resetHistory) {
    db.resetHistory = []
    db.nextResetHistoryId = 1
    changed = true
  }
  if (!db.nextResetConfigId) {
    db.nextResetConfigId = 1
    changed = true
  }
  if (!db.nextResetHistoryId) {
    db.nextResetHistoryId = 1
    changed = true
  }
  
  if (changed) saveDb()
}

function seedProviders(db: DbData) {
  const seed = [
    { name: 'OpenAI',          slug: 'openai',    color: '#10a37f', icon: 'bot',      quota: 1000000, type: 'tokens' },
    { name: 'Anthropic',       slug: 'anthropic', color: '#d97706', icon: 'brain',    quota: 1000000, type: 'tokens' },
    { name: 'Google Gemini',   slug: 'google',    color: '#4285f4', icon: 'sparkles', quota: 1000000, type: 'tokens' },
    { name: 'Mistral AI',      slug: 'mistral',   color: '#7c3aed', icon: 'zap',      quota: 1000000, type: 'tokens' },
    { name: 'Groq',            slug: 'groq',      color: '#059669', icon: 'cpu',      quota: 500000,  type: 'tokens' },
    { name: 'Cohere',          slug: 'cohere',    color: '#0891b2', icon: 'layers',   quota: 1000000, type: 'tokens' },
    { name: 'xAI (Grok)',      slug: 'xai',       color: '#e11d48', icon: 'zap',      quota: 1000000, type: 'tokens' },
    { name: 'DeepSeek',        slug: 'deepseek',  color: '#2563eb', icon: 'cpu',      quota: 1000000, type: 'tokens' },
    { name: 'GitHub Copilot',  slug: 'copilot',   color: '#6e40c9', icon: 'bot',      quota: 300,     type: 'requests' },
    { name: 'Amazon Kiro',     slug: 'kiro',      color: '#FF9900', icon: 'sparkles', quota: 20,      type: 'cost' },
    { name: 'Devin (Cognition)', slug: 'devin',   color: '#3969CA', icon: 'cpu',      quota: 250,     type: 'requests' },
  ]
  for (const s of seed) {
    db.providers.push({
      id: db.nextProviderId++,
      name: s.name, slug: s.slug, color: s.color, icon: s.icon,
      api_key_hint: '', monthly_quota: s.quota, monthly_quota_type: (s as { type?: string }).type ?? 'tokens',
      alert_threshold: 0.8, is_active: 1, created_at: new Date().toISOString(),
    })
  }
}

// ─── Providers ───────────────────────────────────────────────────────────────

export function getProviders() {
  return loadDb().providers
}

export function addProvider(data: {
  name: string; slug: string; color: string; icon: string; apiKeyHint: string
  monthlyQuota: number; monthlyQuotaType: string; alertThreshold: number
}) {
  const db = loadDb()
  const row: ProviderRow = {
    id: db.nextProviderId++,
    name: data.name, slug: data.slug, color: data.color, icon: data.icon,
    api_key_hint: data.apiKeyHint, monthly_quota: data.monthlyQuota,
    monthly_quota_type: data.monthlyQuotaType, alert_threshold: data.alertThreshold,
    is_active: 1, created_at: new Date().toISOString(),
  }
  db.providers.push(row)
  saveDb()
  return row
}

export function updateProvider(id: number, data: Partial<{
  name: string; slug: string; color: string; icon: string; apiKeyHint: string
  monthlyQuota: number; monthlyQuotaType: string; alertThreshold: number; isActive: boolean
}>) {
  const db = loadDb()
  const idx = db.providers.findIndex(p => p.id === id)
  if (idx === -1) return null
  const p = db.providers[idx]
  if (data.name !== undefined) p.name = data.name
  if (data.slug !== undefined) p.slug = data.slug
  if (data.color !== undefined) p.color = data.color
  if (data.icon !== undefined) p.icon = data.icon
  if (data.apiKeyHint !== undefined) p.api_key_hint = data.apiKeyHint
  if (data.monthlyQuota !== undefined) p.monthly_quota = data.monthlyQuota
  if (data.monthlyQuotaType !== undefined) p.monthly_quota_type = data.monthlyQuotaType
  if (data.alertThreshold !== undefined) p.alert_threshold = data.alertThreshold
  if (data.isActive !== undefined) p.is_active = data.isActive ? 1 : 0
  saveDb()
  return p
}

export function deleteProvider(id: number) {
  const db = loadDb()
  db.providers = db.providers.filter(p => p.id !== id)
  db.usage = db.usage.filter(u => u.provider_id !== id)
  saveDb()
  return { success: true }
}

// ─── Usage Records ───────────────────────────────────────────────────────────

export function getUsageRecords(filters?: {
  providerId?: number; startDate?: string; endDate?: string; limit?: number
}) {
  const db = loadDb()
  let rows = db.usage.slice()

  if (filters?.providerId) rows = rows.filter(r => r.provider_id === filters.providerId)
  if (filters?.startDate) rows = rows.filter(r => r.used_at >= filters.startDate!)
  if (filters?.endDate) rows = rows.filter(r => r.used_at <= filters.endDate!)

  rows.sort((a, b) => b.used_at.localeCompare(a.used_at))

  if (filters?.limit) rows = rows.slice(0, filters.limit)

  return rows.map(r => {
    const p = db.providers.find(pr => pr.id === r.provider_id)
    return { ...r, provider_name: p?.name || 'Desconhecido', provider_color: p?.color || '#6366f1' }
  })
}

export function addUsageRecord(data: {
  providerId: number; model: string; inputTokens: number; outputTokens: number
  totalTokens: number; requestCount: number; costUsd: number; usedAt: string; notes: string
}) {
  const db = loadDb()
  const row: UsageRow = {
    id: db.nextUsageId++,
    provider_id: data.providerId, model: data.model, input_tokens: data.inputTokens,
    output_tokens: data.outputTokens, total_tokens: data.totalTokens,
    request_count: data.requestCount, cost_usd: data.costUsd,
    used_at: data.usedAt, notes: data.notes,
  }
  db.usage.push(row)
  saveDb()
  const p = db.providers.find(pr => pr.id === data.providerId)
  return { ...row, provider_name: p?.name || '', provider_color: p?.color || '#6366f1' }
}

export function deleteUsageRecord(id: number) {
  const db = loadDb()
  db.usage = db.usage.filter(u => u.id !== id)
  saveDb()
  return { success: true }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getProviderStats() {
  const db = loadDb()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  return db.providers
    .filter(p => p.is_active)
    .map(p => {
      const monthlyUsage = db.usage.filter(u => u.provider_id === p.id && u.used_at >= startOfMonth)
      const agg = monthlyUsage.reduce(
        (acc, u) => ({
          totalTokens: acc.totalTokens + u.total_tokens,
          inputTokens: acc.inputTokens + u.input_tokens,
          outputTokens: acc.outputTokens + u.output_tokens,
          requestCount: acc.requestCount + u.request_count,
          costUsd: acc.costUsd + u.cost_usd,
        }),
        { totalTokens: 0, inputTokens: 0, outputTokens: 0, requestCount: 0, costUsd: 0 }
      )

      const currentValue =
        p.monthly_quota_type === 'tokens' ? agg.totalTokens
        : p.monthly_quota_type === 'requests' ? agg.requestCount
        : agg.costUsd

      const percentUsed = p.monthly_quota > 0 ? currentValue / p.monthly_quota : 0

      return {
        providerId: p.id,
        providerName: p.name,
        providerColor: p.color,
        currentMonth: {
          totalTokens: agg.totalTokens, inputTokens: agg.inputTokens,
          outputTokens: agg.outputTokens, requestCount: agg.requestCount, costUsd: agg.costUsd,
        },
        quota: p.monthly_quota,
        quotaType: p.monthly_quota_type,
        alertThreshold: p.alert_threshold,
        percentUsed,
        isOverQuota: percentUsed >= 1,
        isNearQuota: percentUsed >= p.alert_threshold && percentUsed < 1,
      }
    })
}

export function getDailyUsage(days = 30) {
  const db = loadDb()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()

  const result: Record<string, Record<string, {
    date: string; total_tokens: number; cost_usd: number; request_count: number; provider_name: string
  }>> = {}

  for (const u of db.usage.filter(u => u.used_at >= sinceStr)) {
    const date = u.used_at.slice(0, 10)
    const p = db.providers.find(pr => pr.id === u.provider_id)
    const pname = p?.name || 'Desconhecido'
    if (!result[date]) result[date] = {}
    if (!result[date][pname]) result[date][pname] = { date, total_tokens: 0, cost_usd: 0, request_count: 0, provider_name: pname }
    result[date][pname].total_tokens += u.total_tokens
    result[date][pname].cost_usd += u.cost_usd
    result[date][pname].request_count += u.request_count
  }

  return Object.values(result).flatMap(byProvider => Object.values(byProvider))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return loadDb().settings
}

export function updateSettings(settings: Record<string, string>) {
  const db = loadDb()
  Object.assign(db.settings, settings)
  saveDb()
  return db.settings
}

// ─── Reset Configurations ─────────────────────────────────────────────────────

export function getResetConfigs(providerId?: number) {
  const db = loadDb()
  let configs = db.resetConfigs.slice()
  
  if (providerId) {
    configs = configs.filter(c => c.provider_id === providerId)
  }
  
  return configs.map(c => ({
    id: c.id,
    providerId: c.provider_id,
    resetType: c.reset_type,
    resetDay: c.reset_day,
    resetTime: c.reset_time,
    timezone: c.timezone,
    isActive: Boolean(c.is_active),
    lastResetAt: c.last_reset_at,
    nextResetAt: c.next_reset_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }))
}

export function addResetConfig(data: {
  providerId: number; resetType: string; resetDay?: number
  resetTime: string; timezone: string; isActive: boolean
}) {
  const db = loadDb()
  const config = ResetService.createResetConfig({
    providerId: data.providerId,
    resetType: data.resetType as any,
    resetDay: data.resetDay,
    resetTime: data.resetTime,
    timezone: data.timezone,
    isActive: data.isActive,
    lastResetAt: undefined,
    nextResetAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  
  const row: ResetConfigRow = {
    id: db.nextResetConfigId++,
    provider_id: config.providerId,
    reset_type: config.resetType,
    reset_day: config.resetDay,
    reset_time: config.resetTime,
    timezone: config.timezone,
    is_active: config.isActive ? 1 : 0,
    last_reset_at: config.lastResetAt,
    next_reset_at: config.nextResetAt,
    created_at: config.createdAt,
    updated_at: config.updatedAt
  }
  
  db.resetConfigs.push(row)
  saveDb()
  
  return {
    id: row.id,
    providerId: row.provider_id,
    resetType: row.reset_type,
    resetDay: row.reset_day,
    resetTime: row.reset_time,
    timezone: row.timezone,
    isActive: Boolean(row.is_active),
    lastResetAt: row.last_reset_at,
    nextResetAt: row.next_reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function updateResetConfig(id: number, data: Partial<{
  resetType: string; resetDay?: number; resetTime: string
  timezone: string; isActive: boolean
}>) {
  const db = loadDb()
  const idx = db.resetConfigs.findIndex(c => c.id === id)
  if (idx === -1) return null
  
  const config = db.resetConfigs[idx]
  if (data.resetType !== undefined) config.reset_type = data.resetType
  if (data.resetDay !== undefined) config.reset_day = data.resetDay
  if (data.resetTime !== undefined) config.reset_time = data.resetTime
  if (data.timezone !== undefined) config.timezone = data.timezone
  if (data.isActive !== undefined) config.is_active = data.isActive ? 1 : 0
  
  config.updated_at = new Date().toISOString()
  
  // Recalculate next reset date
  const configObj = {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  }
  
  const updated = ResetService.updateResetConfig(configObj)
  config.next_reset_at = updated.nextResetAt
  
  saveDb()
  
  return {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  }
}

export function deleteResetConfig(id: number) {
  const db = loadDb()
  db.resetConfigs = db.resetConfigs.filter(c => c.id !== id)
  saveDb()
  return { success: true }
}

// ─── Reset History ────────────────────────────────────────────────────────────

export function getResetHistory(providerId?: number, limit?: number) {
  const db = loadDb()
  let history = db.resetHistory.slice()
  
  if (providerId) {
    history = history.filter(h => h.provider_id === providerId)
  }
  
  history.sort((a, b) => b.reset_at.localeCompare(a.reset_at))
  
  if (limit) {
    history = history.slice(0, limit)
  }
  
  return history.map(h => ({
    id: h.id,
    providerId: h.provider_id,
    resetAt: h.reset_at,
    periodStart: h.period_start,
    periodEnd: h.period_end,
    totalTokens: h.total_tokens,
    totalRequests: h.total_requests,
    totalCost: h.total_cost,
    resetType: h.reset_type,
    timezone: h.timezone
  }))
}

export function addResetHistory(data: {
  providerId: number; resetAt: string; periodStart: string; periodEnd: string
  totalTokens: number; totalRequests: number; totalCost: number
  resetType: string; timezone: string
}) {
  const db = loadDb()
  const row: ResetHistoryRow = {
    id: db.nextResetHistoryId++,
    provider_id: data.providerId,
    reset_at: data.resetAt,
    period_start: data.periodStart,
    period_end: data.periodEnd,
    total_tokens: data.totalTokens,
    total_requests: data.totalRequests,
    total_cost: data.totalCost,
    reset_type: data.resetType,
    timezone: data.timezone
  }
  
  db.resetHistory.push(row)
  saveDb()
  
  return {
    id: row.id,
    providerId: row.provider_id,
    resetAt: row.reset_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    totalTokens: row.total_tokens,
    totalRequests: row.total_requests,
    totalCost: row.total_cost,
    resetType: row.reset_type,
    timezone: row.timezone
  }
}

// ─── Reset Operations ─────────────────────────────────────────────────────────

export async function performReset(providerId: number, configId: number) {
  const db = loadDb()
  const config = db.resetConfigs.find(c => c.id === configId && c.provider_id === providerId)
  if (!config) {
    throw new Error('Reset configuration not found')
  }
  
  const configObj = {
    id: config.id,
    providerId: config.provider_id,
    resetType: config.reset_type,
    resetDay: config.reset_day,
    resetTime: config.reset_time,
    timezone: config.timezone,
    isActive: Boolean(config.is_active),
    lastResetAt: config.last_reset_at,
    nextResetAt: config.next_reset_at,
    createdAt: config.created_at,
    updatedAt: config.updated_at
  }
  
  // Perform the reset
  const resetHistory = await ResetService.performReset(providerId, configObj)
  
  // Save reset history
  const historyRecord = addResetHistory({
    providerId: resetHistory.providerId,
    resetAt: resetHistory.resetAt,
    periodStart: resetHistory.periodStart,
    periodEnd: resetHistory.periodEnd,
    totalTokens: resetHistory.totalTokens,
    totalRequests: resetHistory.totalRequests,
    totalCost: resetHistory.totalCost,
    resetType: resetHistory.resetType,
    timezone: resetHistory.timezone
  })
  
  // Update config with new reset dates
  config.last_reset_at = resetHistory.resetAt
  const updatedConfig = ResetService.updateResetConfig({
    ...configObj,
    lastResetAt: resetHistory.resetAt
  })
  config.next_reset_at = updatedConfig.nextResetAt
  config.updated_at = updatedConfig.updatedAt
  
  saveDb()
  
  return historyRecord
}

export function getTimezones() {
  return ResetService.getTimezones()
}

export function getProviderStatsWithReset() {
  const db = loadDb()
  const providers = db.providers.filter(p => p.is_active)
  
  return providers.map(p => {
    const resetConfig = db.resetConfigs.find(c => c.provider_id === p.id && c.is_active)
    
    let periodStats
    if (resetConfig) {
      const configObj = {
        id: resetConfig.id,
        providerId: resetConfig.provider_id,
        resetType: resetConfig.reset_type,
        resetDay: resetConfig.reset_day,
        resetTime: resetConfig.reset_time,
        timezone: resetConfig.timezone,
        isActive: Boolean(resetConfig.is_active),
        lastResetAt: resetConfig.last_reset_at,
        nextResetAt: resetConfig.next_reset_at,
        createdAt: resetConfig.created_at,
        updatedAt: resetConfig.updated_at
      }
      
      periodStats = ResetService.getCurrentPeriodStats(p.id, configObj)
    } else {
      // Default to monthly behavior
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthlyUsage = db.usage.filter(u => u.provider_id === p.id && u.used_at >= startOfMonth)
      
      periodStats = monthlyUsage.reduce(
        (acc, u) => ({
          totalTokens: acc.totalTokens + u.total_tokens,
          inputTokens: acc.inputTokens + u.input_tokens,
          outputTokens: acc.outputTokens + u.output_tokens,
          requestCount: acc.requestCount + u.request_count,
          costUsd: acc.costUsd + u.cost_usd,
          startDate: startOfMonth,
          endDate: now.toISOString(),
          daysUntilReset: undefined,
          nextResetDate: undefined
        }),
        { 
          totalTokens: 0, 
          inputTokens: 0, 
          outputTokens: 0, 
          requestCount: 0, 
          costUsd: 0,
          startDate: startOfMonth,
          endDate: now.toISOString(),
          daysUntilReset: undefined,
          nextResetDate: undefined
        }
      )
    }
    
    const currentValue =
      p.monthly_quota_type === 'tokens' ? periodStats.totalTokens
      : p.monthly_quota_type === 'requests' ? periodStats.requestCount
      : periodStats.costUsd

    const percentUsed = p.monthly_quota > 0 ? currentValue / p.monthly_quota : 0
    
    return {
      providerId: p.id,
      providerName: p.name,
      providerColor: p.color,
      currentPeriod: {
        totalTokens: periodStats.totalTokens,
        inputTokens: periodStats.inputTokens,
        outputTokens: periodStats.outputTokens,
        requestCount: periodStats.requestCount,
        costUsd: periodStats.costUsd,
        startDate: periodStats.startDate,
        endDate: periodStats.endDate
      },
      quota: p.monthly_quota,
      quotaType: p.monthly_quota_type,
      alertThreshold: p.alert_threshold,
      percentUsed,
      isOverQuota: percentUsed >= 1,
      isNearQuota: percentUsed >= p.alert_threshold && percentUsed < 1,
      resetConfig: resetConfig ? {
        id: resetConfig.id,
        providerId: resetConfig.provider_id,
        resetType: resetConfig.reset_type,
        resetDay: resetConfig.reset_day,
        resetTime: resetConfig.reset_time,
        timezone: resetConfig.timezone,
        isActive: Boolean(resetConfig.is_active),
        lastResetAt: resetConfig.last_reset_at,
        nextResetAt: resetConfig.next_reset_at,
        createdAt: resetConfig.created_at,
        updatedAt: resetConfig.updated_at
      } : undefined,
      nextResetDate: periodStats.nextResetDate,
      daysUntilReset: periodStats.daysUntilReset
    }
  })
}
