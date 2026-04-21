import { useState } from 'react'
import { Clock } from 'lucide-react'

interface DatePickerProps {
  value: string // HH:MM format
  onChange: (time: string) => void
  disabled?: boolean
  className?: string
  label?: string
}

export function DatePicker({ value, onChange, disabled = false, className = '', label = 'Hora do reset' }: DatePickerProps) {
  const [hours, setHours] = useState(value ? value.split(':')[0] : '00')
  const [minutes, setMinutes] = useState(value ? value.split(':')[1] : '00')

  const handleHoursChange = (newHours: string) => {
    const hour = parseInt(newHours)
    if (isNaN(hour) || hour < 0 || hour > 23) return
    
    setHours(newHours.padStart(2, '0'))
    onChange(`${newHours.padStart(2, '0')}:${minutes.padStart(2, '0')}`)
  }

  const handleMinutesChange = (newMinutes: string) => {
    const minute = parseInt(newMinutes)
    if (isNaN(minute) || minute < 0 || minute > 59) return
    
    setMinutes(newMinutes.padStart(2, '0'))
    onChange(`${hours.padStart(2, '0')}:${newMinutes.padStart(2, '0')}`)
  }

  const handleQuickSelect = (time: string) => {
    const [h, m] = time.split(':')
    setHours(h)
    setMinutes(m)
    onChange(time)
  }

  const quickTimes = [
    { label: 'Meia-noite', time: '00:00' },
    { label: 'Início do dia', time: '06:00' },
    { label: 'Meio-dia', time: '12:00' },
    { label: 'Fim do dia', time: '18:00' },
  ]

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={`${hours}:${minutes}`}
            onChange={(e) => {
              const time = e.target.value
              if (time.length === 5 && time.includes(':')) {
                const [h, m] = time.split(':')
                handleHoursChange(h)
                handleMinutesChange(m)
              }
            }}
            disabled={disabled}
            placeholder="00:00"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Hora
          </label>
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => handleHoursChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Minuto
          </label>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Seleção rápida
        </label>
        <div className="grid grid-cols-2 gap-2">
          {quickTimes.map((quickTime) => (
            <button
              key={quickTime.time}
              onClick={() => handleQuickSelect(quickTime.time)}
              disabled={disabled}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                value === quickTime.time
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {quickTime.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}