import React, { useState, useEffect } from 'react'
import { Calendar, Clock, RotateCcw, Trash2, Save, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import { ProviderResetConfig, Provider, TimezoneInfo } from '../types'
import { useDb } from '../hooks/useDb'
import { DatePicker } from './DatePicker'
import { TimezoneSelector } from './TimezoneSelector'

interface ResetConfigurationProps {
  provider: Provider
  onClose: () => void
  onSave: (config: ProviderResetConfig) => void
}

export function ResetConfiguration({ provider, onClose, onSave }: ResetConfigurationProps) {
  const { invoke } = useDb()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Partial<ProviderResetConfig>>({
    providerId: provider.id,
    resetType: 'monthly',
    resetDay: 1,
    resetTime: '00:00',
    timezone: 'America/Sao_Paulo',
    isActive: true
  })
  const [existingConfig, setExistingConfig] = useState<ProviderResetConfig | null>(null)
  const [timezones, setTimezones] = useState<TimezoneInfo[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadExistingConfig()
    loadTimezones()
  }, [provider.id])

  const loadExistingConfig = async () => {
    try {
      const configs = await invoke('db:getResetConfigs', provider.id) as ProviderResetConfig[]
      if (configs.length > 0) {
        setExistingConfig(configs[0])
        setConfig(configs[0])
      }
    } catch (error) {
      console.error('Error loading existing config:', error)
    }
  }

  const loadTimezones = async () => {
    try {
      const zones = await invoke('db:getTimezones') as TimezoneInfo[]
      setTimezones(zones)
    } catch (error) {
      console.error('Error loading timezones:', error)
    }
  }

  const handleSave = async () => {
    if (!config.resetType || !config.resetTime || !config.timezone) {
      return
    }

    setSaving(true)
    try {
      let savedConfig: ProviderResetConfig

      if (existingConfig) {
        // Update existing config
        savedConfig = await invoke('db:updateResetConfig', existingConfig.id, {
          resetType: config.resetType,
          resetDay: config.resetDay,
          resetTime: config.resetTime,
          timezone: config.timezone,
          isActive: config.isActive
        })
      } else {
        // Create new config
        savedConfig = await invoke('db:addResetConfig', {
          providerId: provider.id,
          resetType: config.resetType,
          resetDay: config.resetDay,
          resetTime: config.resetTime,
          timezone: config.timezone,
          isActive: config.isActive
        })
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      onSave(savedConfig)
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingConfig) return

    setLoading(true)
    try {
      await invoke('db:deleteResetConfig', existingConfig.id)
      setConfig({
        providerId: provider.id,
        resetType: 'monthly',
        resetDay: 1,
        resetTime: '00:00',
        timezone: 'America/Sao_Paulo',
        isActive: true
      })
      setExistingConfig(null)
    } catch (error) {
      console.error('Error deleting config:', error)
    } finally {
      setLoading(false)
    }
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

  const getWeekDayLabel = (day: number) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    return days[day - 1] || 'Segunda'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configurar Reset Periódico
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {provider.name} - Definir quando os contadores devem ser zerados
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Configuração salva com sucesso!</span>
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Reset Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tipo de Reset
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['daily', 'weekly', 'monthly', 'custom'].map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig(prev => ({ ...prev, resetType: type as any }))}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    config.resetType === type
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{getResetTypeLabel(type)}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {type === 'daily' && 'Todos os dias'}
                    {type === 'weekly' && 'Toda semana'}
                    {type === 'monthly' && 'Todo mês'}
                    {type === 'custom' && 'Data específica'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reset Day (for weekly and monthly) */}
          {(config.resetType === 'weekly' || config.resetType === 'monthly') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {config.resetType === 'weekly' ? 'Dia da semana' : 'Dia do mês'}
              </label>
              {config.resetType === 'weekly' ? (
                <select
                  value={config.resetDay || 1}
                  onChange={(e) => setConfig(prev => ({ ...prev, resetDay: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <option key={day} value={day}>{getWeekDayLabel(day)}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={config.resetDay || 1}
                  onChange={(e) => setConfig(prev => ({ ...prev, resetDay: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}º dia</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Reset Time */}
          <DatePicker
            value={config.resetTime || '00:00'}
            onChange={(time) => setConfig(prev => ({ ...prev, resetTime: time }))}
          />

          {/* Timezone */}
          <div>
            <TimezoneSelector
              value={config.timezone || 'America/Sao_Paulo'}
              onChange={(timezone) => setConfig(prev => ({ ...prev, timezone }))}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reset Ativo
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Desative para pausar os resets automáticos temporariamente
              </p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Como funciona o reset periódico:</p>
                <ul className="space-y-1 text-xs">
                  <li>• No horário e data configurados, os contadores serão zerados automaticamente</li>
                  <li>• O histórico de uso é preservado para análise e gráficos</li>
                  <li>• Você receberá uma notificação quando o reset for executado</li>
                  <li>• A configuração pode ser alterada ou desativada a qualquer momento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {existingConfig && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remover configuração
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !config.resetType || !config.resetTime || !config.timezone}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {existingConfig ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}