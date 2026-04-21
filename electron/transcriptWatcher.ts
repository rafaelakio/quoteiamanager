import fs from 'fs'
import path from 'path'
import os from 'os'
import { BrowserWindow } from 'electron'
import { addUsageRecord, getProviders, getSettings, updateSettings } from './database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  type?: string
  message?: {
    model?: string
    role?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  uuid?: string
  sessionId?: string
  timestamp?: string
}

interface SessionAccumulator {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreate: number
  cacheRead: number
  messageUuids: Set<string>
  sessionId: string
  lastTimestamp: string
}

// ─── Claude Code paths ────────────────────────────────────────────────────────

function getClaudeProjectsDir(): string | null {
  const candidates = [
    path.join(os.homedir(), '.claude', 'projects'),
    // Windows AppData fallback
    process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'projects') : '',
  ].filter(Boolean)

  return candidates.find(p => {
    try { return fs.statSync(p).isDirectory() } catch { return false }
  }) ?? null
}

// ─── File offset tracking (persisted in settings as JSON) ─────────────────────

function getOffsets(): Record<string, number> {
  try {
    const s = getSettings()
    return JSON.parse(s['_transcriptOffsets'] ?? '{}')
  } catch { return {} }
}

function saveOffsets(offsets: Record<string, number>) {
  updateSettings({ _transcriptOffsets: JSON.stringify(offsets) })
}

function getProcessedUuids(): Set<string> {
  try {
    const s = getSettings()
    const arr = JSON.parse(s['_processedUuids'] ?? '[]') as string[]
    return new Set(arr)
  } catch { return new Set() }
}

function saveProcessedUuids(uuids: Set<string>) {
  // Keep last 50000 to avoid unbounded growth
  const arr = [...uuids].slice(-50000)
  updateSettings({ _processedUuids: JSON.stringify(arr) })
}

// ─── Model → provider mapping ─────────────────────────────────────────────────

function resolveProviderSlug(model: string): string {
  const m = model.toLowerCase()
  if (m.includes('claude')) return 'anthropic'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4') || m.includes('chatgpt')) return 'openai'
  if (m.includes('gemini')) return 'google'
  if (m.includes('mistral') || m.includes('mixtral') || m.includes('devstral') || m.includes('codestral')) return 'mistral'
  if (m.includes('llama') || m.includes('qwen') || m.includes('deepseek') || m.includes('whisper')) return 'groq'
  if (m.includes('command')) return 'cohere'
  return 'anthropic'
}

const PRICING: Record<string, [number, number]> = {
  'claude-opus-4':          [15, 75],
  'claude-sonnet-4-6':      [3, 15],
  'claude-sonnet-4':        [3, 15],
  'claude-haiku-4-5':       [0.8, 4],
  'claude-haiku-4':         [0.8, 4],
  'claude-3-7-sonnet':      [3, 15],
  'claude-3-5-sonnet':      [3, 15],
  'claude-3-5-haiku':       [0.8, 4],
  'claude-3-opus':          [15, 75],
  'claude-3-sonnet':        [3, 15],
  'claude-3-haiku':         [0.25, 1.25],
  'gpt-4o':                 [2.5, 10],
  'gpt-4o-mini':            [0.15, 0.6],
  'gpt-4-turbo':            [10, 30],
  'o1':                     [15, 60],
  'o3':                     [10, 40],
  'o4-mini':                [1.1, 4.4],
  'gemini-2.5-pro':         [1.25, 10],
  'gemini-2.0-flash':       [0.1, 0.4],
  'gemini-1.5-pro':         [1.25, 5],
  'mistral-large':          [2, 6],
  'mistral-small':          [0.1, 0.3],
}

function estimateCost(model: string, input: number, output: number): number {
  const key = Object.keys(PRICING).find(k => model.toLowerCase().startsWith(k))
  if (!key) return 0
  const [inP, outP] = PRICING[key]
  return (input / 1_000_000) * inP + (output / 1_000_000) * outP
}

// ─── Transcript processing ────────────────────────────────────────────────────

export function processTranscriptFile(
  filePath: string,
  offsets: Record<string, number>,
  processedUuids: Set<string>
): { newRecords: number; updatedOffsets: Record<string, number> } {
  let newRecords = 0

  try {
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const offset = offsets[filePath] ?? 0

    if (fileSize <= offset) return { newRecords: 0, updatedOffsets: offsets }

    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(fileSize - offset)
    fs.readSync(fd, buf, 0, buf.length, offset)
    fs.closeSync(fd)

    const newContent = buf.toString('utf-8')
    const lines = newContent.split('\n').filter(l => l.trim())

    // Accumulate usage per session+model in this batch
    const sessions: Record<string, SessionAccumulator> = {}

    for (const line of lines) {
      let entry: TranscriptEntry
      try { entry = JSON.parse(line) } catch { continue }

      if (entry.type !== 'assistant') continue
      const msg = entry.message
      if (!msg?.usage || !msg?.model) continue

      const uuid = entry.uuid ?? ''
      if (uuid && processedUuids.has(uuid)) continue

      const sessionId = entry.sessionId ?? 'unknown'
      const model = msg.model
      const key = `${sessionId}::${model}`

      if (!sessions[key]) {
        sessions[key] = {
          model,
          inputTokens: 0, outputTokens: 0,
          cacheCreate: 0, cacheRead: 0,
          messageUuids: new Set(),
          sessionId,
          lastTimestamp: entry.timestamp ?? new Date().toISOString(),
        }
      }

      const s = sessions[key]
      s.inputTokens += msg.usage.input_tokens ?? 0
      s.outputTokens += msg.usage.output_tokens ?? 0
      s.cacheCreate += msg.usage.cache_creation_input_tokens ?? 0
      s.cacheRead += msg.usage.cache_read_input_tokens ?? 0
      if (uuid) s.messageUuids.add(uuid)
      if (entry.timestamp) s.lastTimestamp = entry.timestamp
    }

    // Store aggregated records
    const providers = getProviders() as Array<{ id: number; slug: string }>

    for (const acc of Object.values(sessions)) {
      if (acc.inputTokens + acc.outputTokens + acc.cacheCreate + acc.cacheRead === 0) continue

      const slug = resolveProviderSlug(acc.model)
      const provider = providers.find(p => p.slug === slug) ?? providers.find(p => p.slug === 'anthropic')
      if (!provider) continue

      const totalInput = acc.inputTokens + acc.cacheCreate + acc.cacheRead
      const totalTokens = totalInput + acc.outputTokens
      const cost = estimateCost(acc.model, totalInput, acc.outputTokens)

      addUsageRecord({
        providerId: provider.id,
        model: acc.model,
        inputTokens: totalInput,
        outputTokens: acc.outputTokens,
        totalTokens,
        requestCount: acc.messageUuids.size || 1,
        costUsd: cost,
        usedAt: acc.lastTimestamp,
        notes: `Auto-captura · sessão ${acc.sessionId.slice(0, 8)}`,
      })

      for (const uid of acc.messageUuids) processedUuids.add(uid)
      newRecords++
    }

    offsets[filePath] = fileSize
  } catch (err) {
    console.error('[watcher] error processing', filePath, err)
  }

  return { newRecords, updatedOffsets: offsets }
}

// ─── Watcher ──────────────────────────────────────────────────────────────────

export function startTranscriptWatcher(getWindow: () => BrowserWindow | null) {
  const projectsDir = getClaudeProjectsDir()
  if (!projectsDir) {
    console.log('[watcher] Claude projects dir not found, skipping')
    return
  }

  console.log('[watcher] watching', projectsDir)

  let offsets = getOffsets()
  let processedUuids = getProcessedUuids()
  let debounce: ReturnType<typeof setTimeout> | null = null

  function processChangedFile(filePath: string) {
    if (!filePath.endsWith('.jsonl')) return
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      const result = processTranscriptFile(filePath, offsets, processedUuids)
      if (result.newRecords > 0) {
        offsets = result.updatedOffsets
        saveOffsets(offsets)
        saveProcessedUuids(processedUuids)
        console.log(`[watcher] +${result.newRecords} records from ${path.basename(filePath)}`)
        getWindow()?.webContents.send('usage:new', { source: 'watcher', count: result.newRecords })
      }
    }, 1500)
  }

  // Initial scan of all existing files (new since last offsets)
  function initialScan() {
    try {
      const projects = fs.readdirSync(projectsDir!)
      for (const proj of projects) {
        const projPath = path.join(projectsDir!, proj)
        try {
          if (!fs.statSync(projPath).isDirectory()) continue
          const files = fs.readdirSync(projPath)
          for (const f of files) {
            if (!f.endsWith('.jsonl')) continue
            const fp = path.join(projPath, f)
            const result = processTranscriptFile(fp, offsets, processedUuids)
            if (result.newRecords > 0) {
              offsets = result.updatedOffsets
              console.log(`[watcher] initial scan +${result.newRecords} from ${f}`)
            }
          }
        } catch { /* skip unreadable */ }
      }
      if (Object.keys(offsets).length > 0) {
        saveOffsets(offsets)
        saveProcessedUuids(processedUuids)
      }
    } catch (e) {
      console.error('[watcher] initial scan error', e)
    }
  }

  initialScan()

  // Watch for changes
  try {
    fs.watch(projectsDir, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const filePath = path.join(projectsDir, String(filename))
      processChangedFile(filePath)
    })
  } catch (e) {
    console.error('[watcher] fs.watch failed', e)
  }

  return projectsDir
}

// ─── Manual sync (called from IPC) ───────────────────────────────────────────

export function syncAllTranscripts(): number {
  const projectsDir = getClaudeProjectsDir()
  if (!projectsDir) return 0

  let offsets = getOffsets()
  const processedUuids = getProcessedUuids()
  let total = 0

  try {
    const projects = fs.readdirSync(projectsDir)
    for (const proj of projects) {
      const projPath = path.join(projectsDir, proj)
      try {
        if (!fs.statSync(projPath).isDirectory()) continue
        const files = fs.readdirSync(projPath)
        for (const f of files) {
          if (!f.endsWith('.jsonl')) continue
          const fp = path.join(projPath, f)
          const result = processTranscriptFile(fp, offsets, processedUuids)
          offsets = result.updatedOffsets
          total += result.newRecords
        }
      } catch { /* skip */ }
    }
    saveOffsets(offsets)
    saveProcessedUuids(processedUuids)
  } catch (e) {
    console.error('[watcher] syncAll error', e)
  }

  return total
}
