import React, { useState, useEffect } from 'react'
import { Clock, Globe } from 'lucide-react'
import { TimezoneInfo } from '../types'

interface TimezoneSelectorProps {
  value: string
  onChange: (timezone: string) => void
  disabled?: boolean
  className?: string
}

export function TimezoneSelector({ value, onChange, disabled = false, className = '' }: TimezoneSelectorProps) {
  const [timezones, setTimezones] = useState<TimezoneInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadTimezones()
  }, [])

  const loadTimezones = async () => {
    try {
      const { invoke } = (window as any).electronAPI || {}
      if (invoke) {
        const zones = await invoke('db:getTimezones')
        setTimezones(zones)
      }
    } catch (error) {
      console.error('Error loading timezones:', error)
      // Fallback to common timezones
      setTimezones([
        { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00', currentTime: '' },
        { value: 'America/New_York', label: 'New York', offset: '-05:00', currentTime: '' },
        { value: 'Europe/London', label: 'London', offset: '+00:00', currentTime: '' },
        { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00', currentTime: '' },
        { value: 'UTC', label: 'UTC', offset: '+00:00', currentTime: '' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredTimezones = timezones.filter(tz =>
    tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tz.value.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedTimezone = timezones.find(tz => tz.value === value)

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-500">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Selecione um timezone</option>
        {timezones.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label} (UTC{tz.offset})
          </option>
        ))}
      </select>
      
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <Globe className="w-4 h-4 text-gray-400" />
      </div>

      {selectedTimezone && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Hora atual: {selectedTimezone.currentTime || 'Carregando...'}
        </div>
      )}
    </div>
  )
}