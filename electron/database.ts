import fs from 'fs'
import path from 'path'
import { app } from 'electron'

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

interface DbData {
  providers: ProviderRow[]
  usage: UsageRow[]
  settings: Record<string, string>
  nextProviderId: number
  nextUsageId: number
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
