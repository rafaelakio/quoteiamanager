interface Props {
  percent: number
  color: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function QuotaBar({ percent, color, showLabel = false, size = 'md' }: Props) {
  const clamped = Math.min(percent, 1)
  const isOver = percent >= 1
  const isNear = percent >= 0.8 && percent < 1

  const barColor = isOver ? '#ef4444' : isNear ? '#f59e0b' : color

  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">Uso mensal</span>
          <span className={`text-xs font-medium ${isOver ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-slate-300'}`}>
            {(percent * 100).toFixed(1)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped * 100}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  )
}
