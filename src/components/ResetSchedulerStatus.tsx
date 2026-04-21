import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, Play, Pause, RefreshCw } from 'lucide-react'
import { useDb } from '../hooks/useDb'

interface SchedulerStatus {
  isRunning: boolean
  nextChecks: Array<{
    providerId: number
    nextReset: string
    resetType: string
    timezone: string
    minutesUntilReset: number | null
  }>
  lastCheck: string
}

export function ResetSchedulerStatus() {
  const { invoke } = useDb()
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string>('')

  useEffect(() => {
    loadStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const schedulerStatus = await invoke('reset:getStatus')
      setStatus(schedulerStatus as SchedulerStatus)
    } catch (error) {
      console.error('Error loading scheduler status:', error)
    }
  }

  const handleTriggerCheck = async () => {
    setLoading(true)
    try {
      const result = await invoke('reset:triggerCheck') as { success: boolean; error?: string }
      if (result.success) {
        setLastAction('Verificação manual acionada com sucesso')
        setTimeout(() => setLastAction(''), 3000)
        await loadStatus()
      } else {
        setLastAction(`Erro: ${result.error}`)
        setTimeout(() => setLastAction(''), 5000)
      }
    } catch (error) {
      setLastAction('Erro ao acionar verificação manual')
      setTimeout(() => setLastAction(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const formatNextReset = (nextReset: string, minutesUntil: number | null) => {
    if (!nextReset) return 'Não agendado'
    
    const date = new Date(nextReset)

    if (minutesUntil !== null) {
      if (minutesUntil <= 0) return 'Atrasado'
      if (minutesUntil <= 60) return `Em ${minutesUntil} minutos`
      if (minutesUntil <= 1440) return `Em ${Math.floor(minutesUntil / 60)} horas`
      return `Em ${Math.floor(minutesUntil / 1440)} dias`
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getResetTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Diário'
      case 'weekly': return 'Semanal'
      case 'monthly': return 'Mensal'
      case 'custom': return 'Personalizado'
      default: return type
    }
  }

  if (!status) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
          <span className="text-sm text-slate-400">Carregando status do scheduler...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Agendador de Resets</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
              status.isRunning 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {status.isRunning ? (
                <>
                  <Play className="w-3 h-3" />
                  Executando
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  Parado
                </>
              )}
            </div>
            <button
              onClick={handleTriggerCheck}
              disabled={loading}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title="Verificar manualmente"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {lastAction && (
          <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
            lastAction.includes('Erro') 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
          }`}>
            {lastAction.includes('Erro') ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            {lastAction}
          </div>
        )}

        <div className="text-xs text-slate-400">
          Última verificação: {new Date(status.lastCheck).toLocaleTimeString('pt-BR')}
        </div>

        {status.nextChecks.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-300">Próximos resets agendados:</h4>
            <div className="space-y-2">
              {status.nextChecks.slice(0, 5).map((check, index) => (
                <div key={`${check.providerId}-${index}`} className="bg-slate-900/50 border border-slate-700 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-xs text-white">Provider #{check.providerId}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-300">{getResetTypeLabel(check.resetType)}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-white">
                        {formatNextReset(check.nextReset, check.minutesUntilReset)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {check.timezone.split('/')[1]?.replace('_', ' ') || check.timezone}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {status.nextChecks.length > 5 && (
              <div className="text-xs text-slate-400 text-center">
                Mais {status.nextChecks.length - 5} agendamentos...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
            <p className="text-xs text-slate-400">
              {status.isRunning ? 'Nenhum reset agendado' : 'Agendador não está executando'}
            </p>
          </div>
        )}

        <div className="text-xs text-slate-500 bg-slate-900/30 rounded-lg p-2">
          <p className="font-medium mb-1">Como funciona:</p>
          <ul className="space-y-1">
            <li>• Verifica automaticamente a cada minuto</li>
            <li>• Executa resets na data/hora configurada</li>
            <li>• Preserva histórico completo de uso</li>
            <li>• Envia notificações quando executado</li>
          </ul>
        </div>
      </div>
    </div>
  )
}