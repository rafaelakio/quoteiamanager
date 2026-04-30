import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { exec } from 'child_process'
import net from 'net'
import {
  getProviders, addProvider, updateProvider, deleteProvider,
  getUsageRecords, addUsageRecord, deleteUsageRecord,
  getProviderStats, getDailyUsage,
  getSettings, updateSettings,
  getResetConfigs, addResetConfig, updateResetConfig, deleteResetConfig,
  getResetHistory, performReset, getTimezones, getProviderStatsWithReset
} from './database'
import { startTranscriptWatcher, syncAllTranscripts } from './transcriptWatcher'
import { startDevinWatcher, syncDevinSessions } from './devinWatcher'
import { initializeResetScheduler, getResetScheduler } from './resetScheduler'

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
  startDevinWatcher(() => mainWindow)
  
  // Initialize reset scheduler
  initializeResetScheduler(mainWindow)
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      initializeResetScheduler(mainWindow)
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

// Reset configuration handlers
ipcMain.handle('db:getResetConfigs', (_e, providerId) => getResetConfigs(providerId))
ipcMain.handle('db:addResetConfig', (_e, data) => addResetConfig(data))
ipcMain.handle('db:updateResetConfig', (_e, id, data) => updateResetConfig(id, data))
ipcMain.handle('db:deleteResetConfig', (_e, id) => deleteResetConfig(id))

// Reset history handlers
ipcMain.handle('db:getResetHistory', (_e, providerId, limit) => getResetHistory(providerId, limit))
ipcMain.handle('db:performReset', async (_e, providerId, configId) => {
  try {
    return await performReset(providerId, configId)
  } catch (error) {
    throw new Error((error as Error).message)
  }
})

// Utility handlers
ipcMain.handle('db:getTimezones', () => getTimezones())
ipcMain.handle('db:getProviderStatsWithReset', () => getProviderStatsWithReset())

// Reset scheduler handlers
ipcMain.handle('reset:getStatus', () => {
  const scheduler = getResetScheduler()
  return scheduler ? scheduler.getStatus() : { isRunning: false }
})

ipcMain.handle('reset:triggerCheck', async () => {
  const scheduler = getResetScheduler()
  if (scheduler) {
    await scheduler.triggerManualCheck()
    return { success: true }
  }
  return { success: false, error: 'Scheduler not running' }
})

ipcMain.handle('reset:getNextScheduled', () => {
  const scheduler = getResetScheduler()
  return scheduler ? scheduler.getNextScheduledResets() : []
})

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

// ─── Config Handlers ───────────────────────────────────────────────────────────

interface ConfigStatus {
  hooks: { 
    configured: boolean; 
    path?: string; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  providers: { 
    configured: boolean; 
    count: number; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  scripts: { 
    configured: boolean; 
    scripts: string[]; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  monitoring: { 
    active: boolean; 
    lastCheck: string; 
    error?: string;
    port?: number;
    endpoint?: string;
    online?: boolean;
    lastPing?: string;
  }
}

interface ConfigLog {
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

let configLogs: ConfigLog[] = []

// Helper functions for connectivity checks
function checkPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(3000)
    
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    
    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })
    
    socket.connect(port, host)
  })
}

function checkProcessRunning(processName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `tasklist | findstr "${processName}"`
      : `ps aux | grep "${processName}" | grep -v grep`
    
    exec(command, (error) => {
      resolve(!error)
    })
  })
}

function checkFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function addLog(type: ConfigLog['type'], message: string, details?: string) {
  configLogs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  })
  // Keep only last 100 logs
  if (configLogs.length > 100) configLogs = configLogs.slice(0, 100)
}

ipcMain.handle('config:getStatus', async () => {
  const status: ConfigStatus = {
    hooks: { configured: false },
    providers: { configured: false, count: 0 },
    scripts: { configured: false, scripts: [] },
    monitoring: { active: false, lastCheck: '', port: INGEST_PORT, endpoint: `http://127.0.0.1:${INGEST_PORT}` }
  }

  try {
    const currentTimestamp = new Date().toISOString()
    
    // Check hooks — look in ~/.claude/settings.json where Claude Code reads them
    const homeDir = require('os').homedir()
    const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json')
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'))
        const stopHooks = claudeSettings?.hooks?.Stop
        const hasOurHook = Array.isArray(stopHooks) && stopHooks.some((h: any) =>
          Array.isArray(h.hooks) && h.hooks.some((hh: any) =>
            typeof hh.command === 'string' && hh.command.includes('claude-code-hook.js')
          )
        )
        if (hasOurHook) {
          status.hooks.configured = true
          status.hooks.path = claudeSettingsPath
          status.hooks.online = true
          status.hooks.lastPing = currentTimestamp
        }
      } catch { /* ignore parse errors */ }
    }

    // Check providers
    const providers = getProviders()
    status.providers.configured = providers.length > 0
    status.providers.count = providers.length
    status.providers.online = providers.length > 0
    status.providers.lastPing = currentTimestamp

    // Check scripts
    const scriptsDir = path.join(__dirname, '../scripts')
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'))
      status.scripts.configured = scripts.length > 0
      status.scripts.scripts = scripts
      status.scripts.online = scripts.length > 0
      status.scripts.lastPing = currentTimestamp
    }

    // Check monitoring with real connectivity tests
    status.monitoring.active = true // If app is running, monitoring is active
    status.monitoring.lastCheck = currentTimestamp
    
    // Test if ingest server port is actually accessible
    try {
      const portAccessible = await checkPort(INGEST_PORT)
      status.monitoring.online = portAccessible
      status.monitoring.lastPing = portAccessible ? currentTimestamp : undefined
    } catch (error) {
      status.monitoring.online = false
      addLog('warning', 'Porta do servidor de ingestão não acessível', `Porta ${INGEST_PORT}`)
    }

    // Additional connectivity checks
    try {
      // Check if Node.js processes are running
      const nodeRunning = await checkProcessRunning('node')
      if (!nodeRunning) {
        addLog('warning', 'Nenhum processo Node.js ativo detectado', 'Isso pode afetar o monitoramento')
      }
    } catch (error) {
      addLog('error', 'Erro ao verificar processos Node.js', String(error))
    }

  } catch (error) {
    addLog('error', 'Erro ao verificar status da configuração', String(error))
  }

  return status
})

ipcMain.handle('config:forceHooks', async () => {
  try {
    addLog('info', 'Configurando hook Stop no Claude Code...')

    const homeDir = require('os').homedir()
    const claudeDir = path.join(homeDir, '.claude')
    const claudeSettingsPath = path.join(claudeDir, 'settings.json')
    const hookScriptPath = path.join(app.getAppPath(), 'hook', 'claude-code-hook.js')

    if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true })

    let settings: any = {}
    if (fs.existsSync(claudeSettingsPath)) {
      try { settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8')) } catch { settings = {} }
    }

    if (!settings.hooks) settings.hooks = {}
    settings.hooks.Stop = [
      { hooks: [{ type: 'command', command: `node "${hookScriptPath}"` }] }
    ]

    fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8')

    const written = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'))
    const verified = written?.hooks?.Stop?.[0]?.hooks?.[0]?.command?.includes('claude-code-hook.js') === true

    if (verified) {
      addLog('success', 'Hook Stop configurado com sucesso', `Arquivo: ${claudeSettingsPath}`)
      return { success: true, file: claudeSettingsPath, verified: true }
    } else {
      addLog('error', 'Falha na verificação do hook', 'Hook não encontrado após escrita')
      return { success: false, error: 'Falha na verificação do hook' }
    }
  } catch (error) {
    addLog('error', 'Falha ao configurar hook', String(error))
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('config:forceProviders', async () => {
  try {
    addLog('info', 'Verificando providers...')

    const providers = getProviders()

    if (providers.length === 0) {
      addLog('warning', 'Nenhum provider encontrado', 'Reinicie o app para recriar os providers padrão')
      return { success: false, error: 'Nenhum provider encontrado. Reinicie o aplicativo para recriar os providers padrão.' }
    }

    const dbPath = path.join(app.getPath('userData'), 'quoteiamanager.json')
    addLog('success', 'Providers verificados', `${providers.length} providers em ${dbPath}`)
    return { success: true, count: providers.length, verified: true }
  } catch (error) {
    addLog('error', 'Falha ao verificar providers', String(error))
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('config:forceScripts', async () => {
  try {
    addLog('info', 'Configurando scripts de monitoramento...')
    
    const scriptsDir = path.join(__dirname, '../scripts')
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true })
      addLog('info', 'Diretório de scripts criado', `Caminho: ${scriptsDir}`)
    }

    // Ensure essential scripts exist
    const essentialScripts = {
      'track-usage.js': fs.readFileSync(path.join(__dirname, '../scripts/track-usage.js'), 'utf-8'),
      'session-start.js': fs.readFileSync(path.join(__dirname, '../scripts/session-start.js'), 'utf-8'),
      'monitor-api-usage.js': fs.readFileSync(path.join(__dirname, '../scripts/monitor-api-usage.js'), 'utf-8')
    }

    let successCount = 0
    for (const [scriptName, content] of Object.entries(essentialScripts)) {
      try {
        const scriptPath = path.join(scriptsDir, scriptName)
        fs.writeFileSync(scriptPath, content, 'utf-8')
        
        // Make executable on Unix systems
        if (process.platform !== 'win32') {
          fs.chmodSync(scriptPath, '755')
        }
        
        // Verify script was written correctly
        if (fs.existsSync(scriptPath) && fs.readFileSync(scriptPath, 'utf-8').length > 0) {
          successCount++
          addLog('info', `Script configurado: ${scriptName}`, `Caminho: ${scriptPath}`)
        } else {
          addLog('error', `Falha ao verificar script: ${scriptName}`, 'Arquivo não encontrado ou vazio')
        }
      } catch (error) {
        addLog('error', `Falha ao configurar script: ${scriptName}`, String(error))
      }
    }

    if (successCount === Object.keys(essentialScripts).length) {
      addLog('success', 'Todos os scripts configurados com sucesso', `Scripts: ${Object.keys(essentialScripts).join(', ')}`)
      return { success: true, scripts: Object.keys(essentialScripts), verified: true }
    } else {
      addLog('warning', 'Scripts configurados com avisos', `${successCount}/${Object.keys(essentialScripts).length} scripts bem-sucedidos`)
      return { success: true, scripts: Object.keys(essentialScripts), verified: false, successCount }
    }

  } catch (error) {
    addLog('error', 'Falha ao configurar scripts', String(error))
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('config:validateAll', async () => {
  try {
    addLog('info', 'Iniciando validação completa da configuração...')
    
    const results = {
      hooks: { valid: false, details: '', online: false },
      providers: { valid: false, details: '', online: false },
      scripts: { valid: false, details: '', online: false },
      database: { valid: false, details: '', online: false },
      network: { valid: false, details: '', online: false }
    }

    // Validate hooks — check ~/.claude/settings.json
    const homeDir = require('os').homedir()
    const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json')
    let hookConfigured = false
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'))
        const stopHooks = claudeSettings?.hooks?.Stop
        hookConfigured = Array.isArray(stopHooks) && stopHooks.some((h: any) =>
          Array.isArray(h.hooks) && h.hooks.some((hh: any) =>
            typeof hh.command === 'string' && hh.command.includes('claude-code-hook.js')
          )
        )
      } catch { /* ignore */ }
    }
    if (hookConfigured) {
      results.hooks.valid = true
      results.hooks.details = `Hook Stop configurado em: ${claudeSettingsPath}`
      results.hooks.online = true
    } else {
      results.hooks.details = 'Hook Stop não configurado em ~/.claude/settings.json'
      results.hooks.online = false
    }

    // Validate providers
    const providers = getProviders()
    if (providers.length > 0) {
      results.providers.valid = true
      results.providers.details = `${providers.length} providers configurados`
      results.providers.online = true
    } else {
      results.providers.details = 'Nenhum provider encontrado'
      results.providers.online = false
    }

    // Validate scripts
    const scriptsDir = path.join(__dirname, '../scripts')
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'))
      if (scripts.length >= 3) {
        results.scripts.valid = true
        results.scripts.details = `${scripts.length} scripts encontrados`
        results.scripts.online = true
      } else {
        results.scripts.details = `Apenas ${scripts.length} scripts encontrados (mínimo: 3)`
        results.scripts.online = false
      }
    } else {
      results.scripts.details = 'Diretório de scripts não encontrado'
      results.scripts.online = false
    }

    // Validate database
    const dbPath = path.join(app.getPath('userData'), 'quoteiamanager.json')
    if (fs.existsSync(dbPath)) {
      try {
        const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
        if (dbContent.providers && dbContent.usage && dbContent.settings) {
          results.database.valid = true
          results.database.details = `Banco de dados válido com ${dbContent.providers.length} providers`
          results.database.online = true
        } else {
          results.database.details = 'Banco de dados com estrutura inválida'
          results.database.online = false
        }
      } catch (e) {
        results.database.details = 'Banco de dados corrompido ou inválido'
        results.database.online = false
      }
    } else {
      results.database.details = 'Banco de dados não encontrado'
      results.database.online = false
    }

    // Validate network connectivity
    try {
      const portAccessible = await checkPort(INGEST_PORT)
      if (portAccessible) {
        results.network.valid = true
        results.network.details = `Servidor de ingestão acessível na porta ${INGEST_PORT}`
        results.network.online = true
      } else {
        results.network.details = `Servidor de ingestão não acessível na porta ${INGEST_PORT}`
        results.network.online = false
      }
    } catch (error) {
      results.network.details = `Erro ao testar conectividade: ${String(error)}`
      results.network.online = false
    }

    const allValid = Object.values(results).every(r => r.valid)
    const allOnline = Object.values(results).every(r => r.online)
    
    addLog(allValid && allOnline ? 'success' : 'warning', 
           'Validação concluída', 
           `Status: ${allValid && allOnline ? 'Configuração completa e online' : allValid ? 'Configuração válida mas com problemas de conectividade' : 'Configuração incompleta'}`)

    return { ...results, allValid, allOnline }

  } catch (error) {
    addLog('error', 'Falha na validação', String(error))
    throw error
  }
})

ipcMain.handle('config:getLogs', () => {
  return configLogs
})

// Additional IPC handlers for enhanced connectivity monitoring
ipcMain.handle('config:testConnectivity', async () => {
  try {
    addLog('info', 'Iniciando testes de conectividade...')
    
    const tests = {
      portIngest: await checkPort(INGEST_PORT),
      port3000: await checkPort(3000), // Common API port
      port8000: await checkPort(8000), // Alternative API port
      nodeProcess: await checkProcessRunning('node'),
      electronProcess: await checkProcessRunning('electron'),
      dbAccessible: checkFileExists(path.join(app.getPath('userData'), 'quoteiamanager.json')),
      scriptsAccessible: checkFileExists(path.join(__dirname, '../scripts'))
    }
    
    const successCount = Object.values(tests).filter(Boolean).length
    const totalTests = Object.keys(tests).length
    
    addLog('info', 'Testes de conectividade concluídos', 
           `${successCount}/${totalTests} testes bem-sucedidos`)
    
    return { success: true, tests, successCount, totalTests }
    
  } catch (error) {
    addLog('error', 'Falha nos testes de conectividade', String(error))
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('config:refreshStatus', async () => {
  try {
    addLog('info', 'Atualizando status da configuração...')
    
    // Directly call the getStatus function instead of using ipcMain.handle
    const status: ConfigStatus = {
      hooks: { configured: false },
      providers: { configured: false, count: 0 },
      scripts: { configured: false, scripts: [] },
      monitoring: { active: false, lastCheck: '', port: INGEST_PORT, endpoint: `http://127.0.0.1:${INGEST_PORT}` }
    }

    const currentTimestamp = new Date().toISOString()
    
    // Check hooks — look in ~/.claude/settings.json where Claude Code reads them
    const homeDir = require('os').homedir()
    const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json')
    if (fs.existsSync(claudeSettingsPath)) {
      try {
        const claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf-8'))
        const stopHooks = claudeSettings?.hooks?.Stop
        const hasOurHook = Array.isArray(stopHooks) && stopHooks.some((h: any) =>
          Array.isArray(h.hooks) && h.hooks.some((hh: any) =>
            typeof hh.command === 'string' && hh.command.includes('claude-code-hook.js')
          )
        )
        if (hasOurHook) {
          status.hooks.configured = true
          status.hooks.path = claudeSettingsPath
          status.hooks.online = true
          status.hooks.lastPing = currentTimestamp
        }
      } catch { /* ignore parse errors */ }
    }

    // Check providers
    const providers = getProviders()
    status.providers.configured = providers.length > 0
    status.providers.count = providers.length
    status.providers.online = providers.length > 0
    status.providers.lastPing = currentTimestamp

    // Check scripts
    const scriptsDir = path.join(__dirname, '../scripts')
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'))
      status.scripts.configured = scripts.length > 0
      status.scripts.scripts = scripts
      status.scripts.online = scripts.length > 0
      status.scripts.lastPing = currentTimestamp
    }

    // Check monitoring
    status.monitoring.active = true
    status.monitoring.lastCheck = currentTimestamp
    
    try {
      const portAccessible = await checkPort(INGEST_PORT)
      status.monitoring.online = portAccessible
      status.monitoring.lastPing = portAccessible ? currentTimestamp : undefined
    } catch (error) {
      status.monitoring.online = false
    }
    
    return { success: true, status }
  } catch (error) {
    addLog('error', 'Falha ao atualizar status', String(error))
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('app:getIngestPort', () => INGEST_PORT)
ipcMain.handle('app:getHookScriptPath', () => {
  return path.join(app.getAppPath(), 'hook', 'claude-code-hook.js')
})
ipcMain.handle('app:syncTranscripts', () => syncAllTranscripts())
ipcMain.handle('app:syncDevin', () => syncDevinSessions())
ipcMain.handle('app:getClaudeProjectsDir', () => {
  const candidates = [
    path.join(require('os').homedir(), '.claude', 'projects'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'projects') : '',
  ].filter((p): p is string => Boolean(p))
  return candidates.find(p => { try { return fs.statSync(p).isDirectory() } catch { return false } }) ?? null
})
