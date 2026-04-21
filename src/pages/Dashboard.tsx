import { useMemo } from 'react'
import { Brain, DollarSign, Hash, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ProviderStats } from '../types'
import { StatCard } from '../components/StatCard'
import { QuotaBar } from '../components/QuotaBar'

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
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function fmtCost(n: number): string {
  return `$${n.toFixed(2)}`
}

export function Dashboard({ providerStats, dailyUsage }: Props) {
  const totals = useMemo(() => {
    return providerStats.reduce(
      (acc, s) => ({
        tokens: acc.tokens + s.currentMonth.totalTokens,
        cost: acc.cost + s.currentMonth.costUsd,
        requests: acc.requests + s.currentMonth.requestCount,
      }),
      { tokens: 0, cost: 0, requests: 0 }
    )
  }, [providerStats])

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; tokens: number; cost: number; requests: number }> = {}
    for (const row of dailyUsage) {
      if (!byDate[row.date]) {
        byDate[row.date] = { date: row.date, tokens: 0, cost: 0, requests: 0 }
      }
      byDate[row.date].tokens += row.total_tokens
      byDate[row.date].cost += row.cost_usd
      byDate[row.date].requests += row.request_count
    }
    return Object.values(byDate).map(d => ({
      ...d,
      label: format(parseISO(d.date), 'dd/MM', { locale: ptBR }),
    }))
  }, [dailyUsage])

  const pieData = useMemo(() =>
    providerStats
      .filter(s => s.currentMonth.totalTokens > 0)
      .map(s => ({ name: s.providerName, value: s.currentMonth.totalTokens, color: s.providerColor })),
    [providerStats]
  )

  const alerts = providerStats.filter(s => s.isNearQuota || s.isOverQuota)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400">Resumo do mês atual</p>
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
                  ? ` ultrapassou a cota mensal (${(s.percentUsed * 100).toFixed(0)}%)`
                  : ` está próximo da cota (${(s.percentUsed * 100).toFixed(0)}%)`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Tokens"
          value={fmtNum(totals.tokens)}
          subtitle="este mês"
          icon={<Hash className="w-4 h-4 text-blue-400" />}
          iconBg="bg-blue-500/20"
        />
        <StatCard
          title="Custo Estimado"
          value={fmtCost(totals.cost)}
          subtitle="este mês"
          icon={<DollarSign className="w-4 h-4 text-green-400" />}
          iconBg="bg-green-500/20"
        />
        <StatCard
          title="Requisições"
          value={fmtNum(totals.requests)}
          subtitle="este mês"
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
          iconBg="bg-purple-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Tokens por dia (últimos 30 dias)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickFormatter={v => fmtNum(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#3b82f6' }}
                  formatter={(v: number) => [fmtNum(v), 'Tokens']}
                />
                <Area type="monotone" dataKey="tokens" stroke="#3b82f6" fill="url(#tokenGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Distribuição por provedor</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: number) => [fmtNum(v), 'Tokens']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Cotas dos provedores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providerStats.map(s => (
            <div key={s.providerId} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.providerColor }} />
                <span className="text-sm font-medium text-white">{s.providerName}</span>
                <Brain className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <QuotaBar percent={s.percentUsed} color={s.providerColor} showLabel size="md" />
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>
                  {s.quotaType === 'tokens'
                    ? fmtNum(s.currentMonth.totalTokens)
                    : s.quotaType === 'requests'
                    ? fmtNum(s.currentMonth.requestCount)
                    : fmtCost(s.currentMonth.costUsd)}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
