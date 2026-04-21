import { exec } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BrowserWindow } from 'electron'
import { addUsageRecord, getProviders, getSettings, updateSettings } from './database'

// ─── Devin DB path ────────────────────────────────────────────────────────────

function getDevinDbPath(): string | null {
  const candidates = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'devin', 'cli', 'sessions.db') : '',
    path.join(os.homedir(), 'AppData', 'Roaming', 'devin', 'cli', 'sessions.db'),
    path.join(os.homedir(), '.devin', 'cli', 'sessions.db'),
  ].filter(Boolean)

  return candidates.find(p => { try { return fs.statSync(p).isFile() } catch { return false } }) ?? null
}

// ─── State tracking ───────────────────────────────────────────────────────────

function getLastRowId(): number {
  try { return parseInt(getSettings()['_devinLastRowId'] ?? '0', 10) || 0 } catch { return 0 }
}

function saveLastRowId(rowId: number) {
  updateSettings({ _devinLastRowId: String(rowId) })
}

// ─── Query via standalone node:sqlite script (uses system Node.js >=22.5) ─────

interface DevinRecord {
  rowId: number
  sessionId: string
  sessionModel: string
  requestId: string | null
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  createdAt: string
  generationModel: string
}

function queryNewRecords(dbPath: string, lastRowId: number): Promise<DevinRecord[]> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '../scripts/devin-query.js')
    exec(`node "${scriptPath}" "${dbPath}" ${lastRowId}`, { timeout: 15000 }, (err, stdout) => {
      if (err) { resolve([]); return }
      try { resolve(JSON.parse(stdout.trim())) } catch { resolve([]) }
    })
  })
}

// ─── Process and persist records ──────────────────────────────────────────────

function processRecords(records: DevinRecord[]): number {
  if (records.length === 0) return 0

  const providers = getProviders() as Array<{ id: number; slug: string }>
  const devinProvider = providers.find(p => p.slug === 'devin')
  if (!devinProvider) {
    console.warn('[devin-watcher] "devin" provider not found in database')
    return 0
  }

  // Group by sessionId — one usage record per session per polling batch
  const sessions = new Map<string, {
    inputTokens: number; outputTokens: number; cacheRead: number; cacheCreate: number
    requestCount: number; lastCreatedAt: string; model: string
  }>()

  for (const rec of records) {
    const key = rec.sessionId
    const existing = sessions.get(key)
    if (existing) {
      existing.inputTokens    += rec.inputTokens
      existing.outputTokens   += rec.outputTokens
      existing.cacheRead      += rec.cacheReadTokens
      existing.cacheCreate    += rec.cacheCreationTokens
      existing.requestCount   += 1
      existing.lastCreatedAt  = rec.createdAt
    } else {
      sessions.set(key, {
        inputTokens:   rec.inputTokens,
        outputTokens:  rec.outputTokens,
        cacheRead:     rec.cacheReadTokens,
        cacheCreate:   rec.cacheCreationTokens,
        requestCount:  1,
        lastCreatedAt: rec.createdAt,
        model:         rec.generationModel || rec.sessionModel || 'devin-swe-1.5',
      })
    }
  }

  let stored = 0
  for (const [sessionId, s] of sessions) {
    const totalInput  = s.inputTokens + s.cacheRead + s.cacheCreate
    const totalTokens = totalInput + s.outputTokens
    if (totalTokens === 0 && s.requestCount === 0) continue

    addUsageRecord({
      providerId:   devinProvider.id,
      model:        s.model,
      inputTokens:  totalInput,
      outputTokens: s.outputTokens,
      totalTokens,
      requestCount: s.requestCount,
      costUsd:      0, // Devin is subscription-based
      usedAt:       s.lastCreatedAt,
      notes:        `Devin CLI · sessão ${sessionId.slice(0, 8)}`,
    })
    stored++
  }

  return stored
}

// ─── Watcher ──────────────────────────────────────────────────────────────────

export function startDevinWatcher(getWindow: () => BrowserWindow | null) {
  const dbPath = getDevinDbPath()
  if (!dbPath) {
    console.log('[devin-watcher] Devin sessions.db not found — skipping')
    return null
  }

  console.log('[devin-watcher] watching', dbPath)

  async function poll() {
    const lastRowId = getLastRowId()
    const records   = await queryNewRecords(dbPath!, lastRowId)
    if (records.length === 0) return

    const maxRowId = Math.max(...records.map(r => r.rowId))
    const stored   = processRecords(records)

    saveLastRowId(maxRowId)

    if (stored > 0) {
      console.log(`[devin-watcher] +${stored} records (${records.length} API calls, up to row ${maxRowId})`)
      getWindow()?.webContents.send('usage:new', { source: 'devin', count: stored })
    }
  }

  // Initial poll + periodic polling every 60 seconds
  poll()
  const timer = setInterval(poll, 60_000)
  return () => clearInterval(timer)
}

// ─── Manual sync (called from IPC) ───────────────────────────────────────────

export async function syncDevinSessions(): Promise<number> {
  const dbPath = getDevinDbPath()
  if (!dbPath) return 0

  const lastRowId = getLastRowId()
  const records   = await queryNewRecords(dbPath, lastRowId)
  if (records.length === 0) return 0

  const maxRowId = Math.max(...records.map(r => r.rowId))
  const stored   = processRecords(records)
  saveLastRowId(maxRowId)
  return stored
}
