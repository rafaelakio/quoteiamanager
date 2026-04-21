import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import {
  getProviders, addProvider, updateProvider, deleteProvider,
  getUsageRecords, addUsageRecord, deleteUsageRecord,
  getProviderStats, getDailyUsage,
  getSettings, updateSettings,
} from './database'
import { startTranscriptWatcher, syncAllTranscripts } from './transcriptWatcher'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── HTTP Ingest Server (Claude Code hook integration) ────────────────────────

const INGEST_PORT = 47821
let mainWindow: BrowserWindow | null = null

function startIngestServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    if (req.method !== 'POST' || req.url !== '/usage') {
      res.writeHead(404); res.end('Not found'); return
    }

    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as {
          model: string
          inputTokens: number
          outputTokens: number
          sessionId: string
          costUsd?: number
        }

        // Map model name to provider
        const providerSlug = resolveProviderSlug(payload.model)
        const providers = getProviders() as Array<{ id: number; slug: string }>
        const provider = providers.find(p => p.slug === providerSlug)
          ?? providers.find(p => p.slug === 'anthropic')

        if (provider) {
          const record = addUsageRecord({
            providerId: provider.id,
            model: payload.model,
            inputTokens: payload.inputTokens,
            outputTokens: payload.outputTokens,
            totalTokens: payload.inputTokens + payload.outputTokens,
            requestCount: 1,
            costUsd: payload.costUsd ?? estimateCost(payload.model, payload.inputTokens, payload.outputTokens),
            usedAt: new Date().toISOString(),
            notes: `Claude Code — sessão ${payload.sessionId.slice(0, 8)}`,
          })
          // Notify renderer to refresh
          mainWindow?.webContents.send('usage:new', record)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400); res.end('Bad request')
      }
    })
  })

  server.listen(INGEST_PORT, '127.0.0.1', () => {
    console.log(`[ingest] listening on http://127.0.0.1:${INGEST_PORT}`)
  })
  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code !== 'EADDRINUSE') console.error('[ingest] server error:', e.message)
  })
  return server
}

function resolveProviderSlug(model: string): string {
  const m = model.toLowerCase()
  if (m.includes('claude')) return 'anthropic'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'openai'
  if (m.includes('gemini')) return 'google'
  if (m.includes('mistral') || m.includes('mixtral') || m.includes('devstral')) return 'mistral'
  if (m.includes('llama') || m.includes('qwen') || m.includes('deepseek')) return 'groq'
  if (m.includes('command')) return 'cohere'
  return 'anthropic'
}

// Approximate pricing per 1M tokens (input/output) for common models
const PRICING: Record<string, [number, number]> = {
  'claude-opus-4':      [15, 75],
  'claude-sonnet-4':    [3, 15],
  'claude-haiku-4':     [0.8, 4],
  'claude-opus-4-5':    [15, 75],
  'claude-sonnet-4-6':  [3, 15],
  'claude-haiku-4-5':   [0.8, 4],
  'claude-3-5-sonnet':  [3, 15],
  'claude-3-5-haiku':   [0.8, 4],
  'claude-3-opus':      [15, 75],
  'gpt-4o':             [2.5, 10],
  'gpt-4o-mini':        [0.15, 0.6],
  'gpt-4-turbo':        [10, 30],
  'o1':                 [15, 60],
  'o3':                 [10, 40],
  'gemini-2.0-flash':   [0.1, 0.4],
  'gemini-1.5-pro':     [1.25, 5],
}

function estimateCost(model: string, input: number, output: number): number {
  const key = Object.keys(PRICING).find(k => model.toLowerCase().includes(k))
  if (!key) return 0
  const [inPrice, outPrice] = PRICING[key]
  return (input / 1_000_000) * inPrice + (output / 1_000_000) * outPrice
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f172a',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())
  return win
}

app.whenReady().then(() => {
  mainWindow = createWindow()
  startIngestServer()
  startTranscriptWatcher(() => mainWindow)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('db:getProviders', () => getProviders())
ipcMain.handle('db:addProvider', (_e, data) => addProvider(data))
ipcMain.handle('db:updateProvider', (_e, id, data) => updateProvider(id, data))
ipcMain.handle('db:deleteProvider', (_e, id) => deleteProvider(id))

ipcMain.handle('db:getUsageRecords', (_e, filters) => getUsageRecords(filters))
ipcMain.handle('db:addUsageRecord', (_e, data) => addUsageRecord(data))
ipcMain.handle('db:deleteUsageRecord', (_e, id) => deleteUsageRecord(id))

ipcMain.handle('db:getProviderStats', () => getProviderStats())
ipcMain.handle('db:getDailyUsage', (_e, days) => getDailyUsage(days))

ipcMain.handle('db:getSettings', () => getSettings())
ipcMain.handle('db:updateSettings', (_e, settings) => updateSettings(settings))

ipcMain.handle('app:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return fs.readFileSync(result.filePaths[0], 'utf-8')
})

ipcMain.handle('app:saveFile', async (_e, content: string, filename: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (result.canceled || !result.filePath) return false
  fs.writeFileSync(result.filePath, content, 'utf-8')
  return true
})

ipcMain.handle('app:openExternal', (_e, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('app:getIngestPort', () => INGEST_PORT)
ipcMain.handle('app:getHookScriptPath', () => {
  return path.join(app.getAppPath(), 'hook', 'claude-code-hook.js')
})
ipcMain.handle('app:syncTranscripts', () => syncAllTranscripts())
ipcMain.handle('app:getClaudeProjectsDir', () => {
  const candidates = [
    path.join(require('os').homedir(), '.claude', 'projects'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'projects') : '',
  ].filter((p): p is string => Boolean(p))
  return candidates.find(p => { try { return fs.statSync(p).isDirectory() } catch { return false } }) ?? null
})
