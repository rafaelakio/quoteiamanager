import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  iconBg?: string
  trend?: { value: number; label: string }
}

export function StatCard({ title, value, subtitle, icon, iconBg = 'bg-blue-500/20', trend }: Props) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-400">{title}</p>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%</span>
          <span className="text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
