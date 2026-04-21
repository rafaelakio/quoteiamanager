import { useMemo, useState, useEffect } from 'react'
import { Brain, DollarSign, Hash, TrendingUp, AlertTriangle, RotateCcw, Calendar, Clock, AlertCircle } from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ProviderStats } from '../types'
import { StatCard } from '../components/StatCard'
import { QuotaBar } from '../components/QuotaBar'
import { ResetConfiguration } from '../components/ResetConfiguration'

interface DailyRow {
  date: string
  total_tokens: number
  cost_usd: number
  request_count: number
  provider_name: string
}

interface Props {
  providerStats: ProviderStats[]
  dailyUsage: DailyRow[]
  onRefresh: () => void
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`
}

function periodLabel(stats: ProviderStats[]): string {
  if (stats.length === 0) return 'este mês'
  const types = [...new Set(stats.map(s => s.resetConfig?.resetType).filter(Boolean))]
  if (types.length === 1) {
    if (types[0] === 'daily') return 'hoje'
    if (types[0] === 'weekly') return 'esta semana'
    if (types[0] === 'monthly') return 'este mês'
  }
  return 'período atual'
}

function formatNextReset(dateString?: string, daysUntil?: number): string {
  if (!dateString) return 'Não definido'
  if (daysUntil === 0) return 'Hoje'
  if (daysUntil === 1) return 'Amanhã'
  if (daysUntil !== undefined && daysUntil <= 7) return `Em ${daysUntil} dias`
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function daysColor(days?: number): string {
  if (days === undefined) return 'text-slate-400'
  if (days <= 1) return 'text-red-400'
  if (days <= 3) return 'text-amber-400'
  if (days <= 7) return 'text-yellow-400'
  return 'text-green-400'
}

function resetTypeLabel(type: string): string {
  return { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', custom: 'Personalizado' }[type] ?? type
}

function ResetSection({ stats, onConfigure }: { stats: ProviderStats; onConfigure: () => void }) {
  const { resetConfig, nextResetDate, daysUntilReset } = stats

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span className="text-xs text-slate-400">
            {resetConfig ? `Reset ${resetTypeLabel(resetConfig.resetType)}` : 'Reset dia 1 (padrão)'}
          </span>
          {resetConfig && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              resetConfig.isActive ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-500'
            }`}>
              {resetConfig.isActive ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <button
          onClick={onConfigure}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {resetConfig ? 'Editar' : 'Configurar'}
        </button>
      </div>

      {resetConfig && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>Próximo reset</span>
          </div>
          <span className={`font-medium ${daysColor(daysUntilReset)}`}>
            {formatNextReset(nextResetDate, daysUntilReset)}
          </span>
        </div>
      )}

      {resetConfig && daysUntilReset !== undefined && daysUntilReset <= 3 && resetConfig.isActive && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-400">
            {daysUntilReset === 0 ? 'Reset executa hoje' : `Reset em ${daysUntilReset} dia${daysUntilReset > 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  )
}

export function Dashboard({ providerStats, dailyUsage, onRefresh }: Props) {
  const [showResetConfig, setShowResetConfig] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderStats | null>(null)

  const period = periodLabel(providerStats)

  const totals = useMemo(() => {
    return providerStats.reduce(
      (acc, s) => ({
        tokens: acc.tokens + s.currentPeriod.totalTokens,
        cost: acc.cost + s.currentPeriod.costUsd,
        requests: acc.requests + s.currentPeriod.requestCount,
      }),
      { tokens: 0, cost: 0, requests: 0 }
    )
  }, [providerStats])

  const lineChartData = useMemo(() => {
    const byDate: Record<string, any> = {}
    for (const row of dailyUsage) {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          date: row.date,
          label: format(parseISO(row.date), 'dd/MM', { locale: ptBR }),
        }
      }
      byDate[row.date][row.provider_name] = row.total_tokens
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [dailyUsage])

  const providerColors = useMemo(() => {
    const colors: Record<string, string> = {}
    providerStats.forEach(s => { colors[s.providerName] = s.providerColor })
    return colors
  }, [providerStats])

  const pieData = useMemo(() =>
    providerStats
      .filter(s => s.currentPeriod.totalTokens > 0)
      .map(s => ({ name: s.providerName, value: s.currentPeriod.totalTokens, color: s.providerColor })),
    [providerStats]
  )

  const alerts = providerStats.filter(s => s.isNearQuota || s.isOverQuota)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400">Resumo do {period}</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(s => (
            <div
              key={s.providerId}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                s.isOverQuota
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                <strong>{s.providerName}</strong>
                {s.isOverQuota
                  ? ` ultrapassou a cota (${s.percentUsed.toFixed(0)}%)`
                  : ` está próximo da cota (${s.percentUsed.toFixed(0)}%)`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Tokens"
          value={fmtNum(totals.tokens)}
          subtitle={period}
          icon={<Hash className="w-4 h-4 text-blue-400" />}
          iconBg="bg-blue-500/20"
        />
        <StatCard
          title="Custo Estimado"
          value={fmtCost(totals.cost)}
          subtitle={period}
          icon={<DollarSign className="w-4 h-4 text-green-400" />}
          iconBg="bg-green-500/20"
        />
        <StatCard
          title="Requisições"
          value={fmtNum(totals.requests)}
          subtitle={period}
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
          iconBg="bg-purple-500/20"
        />
      </div>

      {/* Gráfico de consumo por provider */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Consumo de tokens por provider (últimos 30 dias)</h3>
        {lineChartData.length > 0 && providerStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={v => fmtNum(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number, name: string) => [fmtNum(value), name]}
              />
              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                formatter={(value) => (
                  <span style={{ color: providerColors[value] || '#94a3b8', fontSize: 12 }}>{value}</span>
                )}
              />
              {providerStats.map((provider) => (
                <Line
                  key={provider.providerId}
                  type="monotone"
                  dataKey={provider.providerName}
                  stroke={provider.providerColor}
                  strokeWidth={2}
                  dot={{ fill: provider.providerColor, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">
            Nenhum dado de consumo disponível
          </div>
        )}
      </div>

      {/* Distribuição por provedor */}
      {pieData.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Distribuição por provedor</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                formatter={(v: number) => [fmtNum(v), 'Tokens']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cotas + Reset unificados por provedor */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Cotas dos provedores</h3>
        {providerStats.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
            <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum provedor configurado</p>
            <p className="text-xs text-slate-500 mt-1">Adicione providers na página Provedores para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {providerStats.map(s => (
              <div key={s.providerId} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.providerColor }} />
                  <span className="text-sm font-medium text-white">{s.providerName}</span>
                  <Brain className="w-3 h-3 text-slate-500 ml-auto" />
                </div>

                {/* Quota bar */}
                <QuotaBar percent={s.percentUsed} color={s.providerColor} showLabel size="md" />
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>
                    {s.quotaType === 'tokens'
                      ? fmtNum(s.currentPeriod.totalTokens)
                      : s.quotaType === 'requests'
                      ? fmtNum(s.currentPeriod.requestCount)
                      : fmtCost(s.currentPeriod.costUsd)}
                  </span>
                  <span>
                    de {s.quotaType === 'tokens'
                      ? fmtNum(s.quota)
                      : s.quotaType === 'requests'
                      ? fmtNum(s.quota)
                      : fmtCost(s.quota)}
                    {' '}{s.quotaType === 'tokens' ? 'tokens' : s.quotaType === 'requests' ? 'req' : 'USD'}
                  </span>
                </div>

                {/* Reset section — dentro do mesmo card */}
                <ResetSection
                  stats={s}
                  onConfigure={() => {
                    setSelectedProvider(s)
                    setShowResetConfig(true)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showResetConfig && selectedProvider && (
        <ResetConfiguration
          provider={{
            id: selectedProvider.providerId,
            name: selectedProvider.providerName,
            slug: '',
            color: selectedProvider.providerColor,
            icon: '',
            apiKeyHint: '',
            monthlyQuota: selectedProvider.quota,
            monthlyQuotaType: selectedProvider.quotaType,
            alertThreshold: selectedProvider.alertThreshold,
            isActive: true,
            createdAt: '',
            resetConfig: selectedProvider.resetConfig,
          }}
          onClose={() => {
            setShowResetConfig(false)
            setSelectedProvider(null)
          }}
          onSave={() => {
            setShowResetConfig(false)
            setSelectedProvider(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
