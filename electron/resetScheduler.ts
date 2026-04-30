import { app, BrowserWindow } from 'electron'
import { getResetConfigs, performReset } from './database'
import { ResetService } from './resetService'

export class ResetScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private mainWindow: BrowserWindow | null = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  start() {
    if (this.isRunning) {
      console.log('[ResetScheduler] Already running')
      return
    }

    console.log('[ResetScheduler] Starting automated reset scheduler')
    this.isRunning = true
    
    // Check immediately on start
    this.checkAndPerformResets()
    
    // Then check every minute
    this.intervalId = setInterval(() => {
      this.checkAndPerformResets()
    }, 60 * 1000) // Check every minute
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('[ResetScheduler] Stopped')
  }

  private async checkAndPerformResets() {
    try {
      const resetConfigs = getResetConfigs()
      const pendingResets = ResetService.getPendingResets(resetConfigs)
      
      if (pendingResets.length > 0) {
        console.log(`[ResetScheduler] Found ${pendingResets.length} pending resets`)
        
        for (const config of pendingResets) {
          await this.performResetWithNotification(config)
        }
      }
    } catch (error) {
      console.error('[ResetScheduler] Error checking resets:', error)
    }
  }

  private async performResetWithNotification(config: any) {
    try {
      console.log(`[ResetScheduler] Performing reset for provider ${config.providerId}`)
      
      // Perform the reset
      const resetHistory = await performReset(config.providerId, config.id)
      
      // Send notification to renderer
      this.sendNotification({
        type: 'reset-completed',
        providerId: config.providerId,
        resetHistory,
        timestamp: new Date().toISOString()
      })
      
      console.log(`[ResetScheduler] Reset completed for provider ${config.providerId}`)
    } catch (error) {
      console.error(`[ResetScheduler] Error performing reset for provider ${config.providerId}:`, error)
      
      // Send error notification
      this.sendNotification({
        type: 'reset-error',
        providerId: config.providerId,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })
    }
  }

  private sendNotification(data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('reset:scheduled', data)
    }
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('[ResetScheduler] Manual trigger requested')
    await this.checkAndPerformResets()
  }

  // Get next scheduled resets info
  getNextScheduledResets() {
    const resetConfigs = getResetConfigs()
    const activeConfigs = resetConfigs.filter(config => config.isActive)
    
    return activeConfigs.map(config => ({
      providerId: config.providerId,
      nextReset: config.nextResetAt,
      resetType: config.resetType,
      timezone: config.timezone,
      minutesUntilReset: config.nextResetAt 
        ? Math.ceil((new Date(config.nextResetAt).getTime() - new Date().getTime()) / (1000 * 60))
        : null
    })).sort((a, b) => {
      if (!a.nextReset) return 1
      if (!b.nextReset) return -1
      return new Date(a.nextReset).getTime() - new Date(b.nextReset).getTime()
    })
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextChecks: this.getNextScheduledResets(),
      lastCheck: new Date().toISOString()
    }
  }
}

// Global scheduler instance
let schedulerInstance: ResetScheduler | null = null

export function initializeResetScheduler(mainWindow: BrowserWindow) {
  if (schedulerInstance) {
    schedulerInstance.stop()
  }
  
  schedulerInstance = new ResetScheduler(mainWindow)
  schedulerInstance.start()
  
  return schedulerInstance
}

export function getResetScheduler() {
  return schedulerInstance
}

export function shutdownResetScheduler() {
  if (schedulerInstance) {
    schedulerInstance.stop()
    schedulerInstance = null
  }
}

// Handle app lifecycle
app.on('before-quit', () => {
  shutdownResetScheduler()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    shutdownResetScheduler()
  }
})