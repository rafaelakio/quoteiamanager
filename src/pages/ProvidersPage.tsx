import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'
import { Modal } from '../components/Modal'
import { QuotaBar } from '../components/QuotaBar'
import type { Provider, ProviderStats } from '../types'
import { useDb } from '../hooks/useDb'

interface Props {
  providers: Provider[]
  providerStats: ProviderStats[]
  onRefresh: () => void
}

interface ProviderForm {
  name: string
  slug: string
  color: string
  monthlyQuota: string
  monthlyQuotaType: 'tokens' | 'requests' | 'cost'
  alertThreshold: string
}

const emptyForm: ProviderForm = {
  name: '',
  slug: '',
  color: '#6366f1',
  monthlyQuota: '1000000',
  monthlyQuotaType: 'tokens',
  alertThreshold: '80',
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function ProvidersPage({ providers, providerStats, onRefresh }: Props) {
  const { invoke } = useDb()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [form, setForm] = useState<ProviderForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (p: Provider) => {
    setEditing(p)
    setForm({
      name: p.name,
      slug: p.slug,
      color: p.color,
      monthlyQuota: String(p.monthlyQuota),
      monthlyQuotaType: p.monthlyQuotaType,
      alertThreshold: String(Math.round(p.alertThreshold * 100)),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const data = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        color: form.color,
        icon: 'cpu',
        apiKeyHint: '',
        monthlyQuota: Number(form.monthlyQuota),
        monthlyQuotaType: form.monthlyQuotaType,
        alertThreshold: Number(form.alertThreshold) / 100,
      }
      if (editing) {
        await invoke('db:updateProvider', editing.id, data)
      } else {
        await invoke('db:addProvider', data)
      }
      setShowModal(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remover "${name}" e todos os seus registros de uso?`)) return
    await invoke('db:deleteProvider', id)
    onRefresh()
  }

  const handleToggle = async (p: Provider) => {
    await invoke('db:updateProvider', p.id, { isActive: !p.isActive })
    onRefresh()
  }

  const getStats = (providerId: number) =>
    providerStats.find(s => s.providerId === providerId)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Provedores</h2>
          <p className="text-sm text-slate-400">{providers.length} provedores configurados</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo provedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {providers.map(p => {
          const stats = getStats(p.id)
          return (
            <div
              key={p.id}
              className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
                p.isActive ? 'border-slate-700/50' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: p.color + '33', border: `1px solid ${p.color}55` }}
                  >
                    <span style={{ color: p.color }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {fmtNum(p.monthlyQuota ?? 0)} {p.monthlyQuotaType === 'tokens' ? 'tokens' : p.monthlyQuotaType === 'requests' ? 'req' : 'USD'}/mês
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(p)}
                    className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    {p.isActive
                      ? <ToggleRight className="w-4 h-4 text-green-400" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {stats && (
                <div className="space-y-2">
                  <QuotaBar percent={stats.percentUsed} color={p.color} showLabel size="sm" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-white">{fmtNum(stats.currentPeriod.totalTokens)}</p>
                      <p className="text-xs text-slate-500">tokens</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-white">{stats.currentPeriod.requestCount}</p>
                      <p className="text-xs text-slate-500">req.</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-white">${stats.currentPeriod.costUsd.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">custo</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between text-xs text-slate-400">
                <span>Alerta em {Math.round(p.alertThreshold * 100)}%</span>
                {(() => {
                  const s = getStats(p.id)
                  if (!s?.resetConfig || !s.daysUntilReset === undefined) return null
                  const days = s.daysUntilReset
                  const color = days === undefined ? '' : days <= 1 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-slate-400'
                  return (
                    <span className={`flex items-center gap-1 ${color}`}>
                      <RotateCcw className="w-3 h-3" />
                      {days === 0 ? 'Reset hoje' : days === 1 ? 'Reset amanhã' : `Reset em ${days}d`}
                    </span>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Editar Provedor' : 'Novo Provedor'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome *</label>
                <input
                  type="text"
                  placeholder="ex: OpenAI"
                  value={form.name}
                  onChange={e => setForm(f => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slug || slugify(e.target.value),
                  }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Slug</label>
                <input
                  type="text"
                  placeholder="ex: openai"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cor</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-800 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cota mensal</label>
                <input
                  type="number"
                  value={form.monthlyQuota}
                  onChange={e => setForm(f => ({ ...f, monthlyQuota: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de cota</label>
                <select
                  value={form.monthlyQuotaType}
                  onChange={e => setForm(f => ({ ...f, monthlyQuotaType: e.target.value as 'tokens' | 'requests' | 'cost' }))}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="tokens">Tokens</option>
                  <option value="requests">Requisições</option>
                  <option value="cost">Custo (USD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Alerta em {form.alertThreshold}% da cota
              </label>
              <input
                type="range"
                min={50}
                max={99}
                value={form.alertThreshold}
                onChange={e => setForm(f => ({ ...f, alertThreshold: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
