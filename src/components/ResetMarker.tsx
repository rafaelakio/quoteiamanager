import { RotateCcw } from 'lucide-react'

interface ResetMarkerProps {
  x?: number
  y?: number
  timestamp: string
  type: string
  tooltip?: boolean
}

export function ResetMarker({ x = 0, y = 0, timestamp, type, tooltip = true }: ResetMarkerProps) {
  const formatResetType = (resetType: string) => {
    switch (resetType) {
      case 'daily': return 'Reset Diário'
      case 'weekly': return 'Reset Semanal'
      case 'monthly': return 'Reset Mensal'
      case 'custom': return 'Reset Personalizado'
      default: return 'Reset'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <g>
      {/* Vertical line */}
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={y}
        stroke="#ef4444"
        strokeWidth={1}
        strokeDasharray="4 2"
        opacity={0.6}
      />
      
      {/* Reset icon */}
      <circle
        cx={x}
        cy={y}
        r={12}
        fill="#ef4444"
        opacity={0.9}
      />
      <RotateCcw 
        x={x - 6} 
        y={y - 6} 
        width={12} 
        height={12} 
        color="white"
      />
      
      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect
            x={x - 60}
            y={y + 15}
            width={120}
            height={40}
            fill="#1f2937"
            stroke="#374151"
            strokeWidth={1}
            rx={4}
            opacity={0.95}
          />
          <text
            x={x}
            y={y + 30}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="medium"
          >
            {formatResetType(type)}
          </text>
          <text
            x={x}
            y={y + 45}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={9}
          >
            {formatDateTime(timestamp)}
          </text>
        </g>
      )}
    </g>
  )
}

// Customized tooltip for reset events
export function ResetTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    
    if (data.isReset) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white">Reset Executado</span>
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>Tipo: {data.resetType}</div>
            <div>Data: {new Date(data.resetAt).toLocaleString('pt-BR')}</div>
            {data.totalTokens && (
              <div>Período: {data.totalTokens.toLocaleString()} tokens</div>
            )}
          </div>
        </div>
      )
    }
  }
  return null
}