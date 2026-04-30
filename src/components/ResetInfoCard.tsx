import { RotateCcw, Clock, Calendar, AlertCircle } from 'lucide-react'
import { ProviderStats } from '../types'

interface ResetInfoCardProps {
  stats: ProviderStats
  onConfigureReset?: () => void
}

export function ResetInfoCard({ stats, onConfigureReset }: ResetInfoCardProps) {
  const { resetConfig, nextResetDate, daysUntilReset } = stats

  if (!resetConfig) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Reset Mensal Padrão
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reseta todo dia 1 do mês
              </p>
            </div>
          </div>
          {onConfigureReset && (
            <button
              onClick={onConfigureReset}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Configurar
            </button>
          )}
        </div>
      </div>
    )
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

  const getResetTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return '📅'
      case 'weekly': return '📆'
      case 'monthly': return '🗓️'
      case 'custom': return '⚙️'
      default: return '🔄'
    }
  }

  const formatNextReset = (dateString?: string) => {
    if (!dateString) return 'Não definido'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Atrasado'
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Amanhã'
    if (diffDays <= 7) return `Em ${diffDays} dias`
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDaysColor = (days?: number) => {
    if (!days) return 'text-gray-500'
    if (days <= 1) return 'text-red-600'
    if (days <= 3) return 'text-orange-600'
    if (days <= 7) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className={`rounded-lg p-4 border ${
      resetConfig.isActive 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            resetConfig.isActive 
              ? 'bg-blue-200 dark:bg-blue-800' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            <span className="text-lg">{getResetTypeIcon(resetConfig.resetType)}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Reset {getResetTypeLabel(resetConfig.resetType)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {resetConfig.resetTime} • {resetConfig.timezone.split('/')[1]?.replace('_', ' ') || resetConfig.timezone}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 text-xs rounded-full ${
          resetConfig.isActive 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {resetConfig.isActive ? 'Ativo' : 'Inativo'}
        </div>
      </div>

      <div className="space-y-2">
        {/* Next Reset Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Próximo reset:
            </span>
          </div>
          <span className={`text-xs font-medium ${getDaysColor(daysUntilReset)}`}>
            {formatNextReset(nextResetDate)}
          </span>
        </div>

        {/* Days Until Reset */}
        {daysUntilReset !== undefined && daysUntilReset > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Dias restantes:
              </span>
            </div>
            <span className={`text-xs font-medium ${getDaysColor(daysUntilReset)}`}>
              {daysUntilReset} dias
            </span>
          </div>
        )}

        {/* Last Reset Info */}
        {resetConfig.lastResetAt && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Último reset:
              </span>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(resetConfig.lastResetAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </div>

      {/* Warning for imminent resets */}
      {daysUntilReset !== undefined && daysUntilReset <= 3 && resetConfig.isActive && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            <span className="text-xs text-yellow-700 dark:text-yellow-400">
              {daysUntilReset === 0 
                ? 'O reset será executado hoje!' 
                : `O reset será executado em ${daysUntilReset} dia${daysUntilReset > 1 ? 's' : ''}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Configure Button */}
      {onConfigureReset && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onConfigureReset}
            className="w-full text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            {resetConfig ? 'Editar configuração' : 'Configurar reset personalizado'}
          </button>
        </div>
      )}
    </div>
  )
}