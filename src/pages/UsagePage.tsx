import { useState } from 'react'
import { Plus, Trash2, Filter, Download, Upload } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Modal } from '../components/Modal'
import type { Provider, UsageRecord } from '../types'
import { useDb } from '../hooks/useDb'

interface Props {
  usageRecords: UsageRecord[]
  providers: Provider[]
  onRefresh: () => void
}

interface AddForm {
  providerId: string
  model: string
  inputTokens: string
  outputTokens: string
  requestCount: string
  costUsd: string
  usedAt: string
  notes: string
}

const emptyForm: AddForm = {
  providerId: '',
  model: '',
  inputTokens: '0',
  outputTokens: '0',
  requestCount: '1',
  costUsd: '0',
  usedAt: new Date().toISOString().slice(0, 16),
  notes: '',
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function UsagePage({ usageRecords, providers, onRefresh }: Props) {
  const { invoke } = useDb()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddForm>(emptyForm)
  const [filterProvider, setFilterProvider] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = filterProvider
    ? usageRecords.filter(r => r.providerId === Number(filterProvider))
    : usageRecords

  const handleAdd = async () => {
    if (!form.providerId || !form.model) return
    setSaving(true)
    try {
      const input = Number(form.inputTokens) || 0
      const output = Number(form.outputTokens) || 0
      await invoke('db:addUsageRecord', {
        providerId: Number(form.providerId),
        model: form.model,
        inputTokens: input,
        outputTokens: output,
        totalTokens: input + output,
        requestCount: Number(form.requestCount) || 1,
        costUsd: Number(form.costUsd) || 0,
        usedAt: new Date(form.usedAt).toISOString(),
        notes: form.notes,
      })
      setShowAdd(false)
      setForm(emptyForm)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este registro?')) return
    await invoke('db:deleteUsageRecord', id)
    onRefresh()
  }

  const handleExport = async () => {
    const rows = [
      ['Data', 'Provedor', 'Modelo', 'Tokens Entrada', 'Tokens Saída', 'Total Tokens', 'Requisições', 'Custo USD', 'Notas'],
      ...filtered.map(r => [
        r.usedAt,
        r.providerName || '',
        r.model,
        r.inputTokens,
        r.outputTokens,
        r.totalTokens,
        r.requestCount,
        r.costUsd,
        r.notes || '',
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    await invoke('app:saveFile', csv, 'uso-ia.csv')
  }

  const handleImport = async () => {
    const csv = await invoke<string | null>('app:openFile')
    if (!csv) return
    const lines = csv.split('\n').slice(1)
    for (const line of lines) {
      const [usedAt, , model, inputTokens, outputTokens, , requestCount, costUsd, notes] = line.split(',')
      const prov = providers.find(p => p.name === line.split(',')[1])
      if (!prov || !model) continue
      await invoke('db:addUsageRecord', {
        providerId: prov.id,
        model: model.trim(),
        inputTokens: Number(inputTokens) || 0,
        outputTokens: Number(outputTokens) || 0,
        totalTokens: (Number(inputTokens) || 0) + (Number(outputTokens) || 0),
        requestCount: Number(requestCount) || 1,
        costUsd: Number(costUsd) || 0,
        usedAt: usedAt?.trim() || new Date().toISOString(),
        notes: notes?.trim() || '',
      })
    }
    onRefresh()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Registros de Uso</h2>
          <p className="text-sm text-slate-400">{filtered.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => { setForm(emptyForm); setShowAdd(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterProvider}
          onChange={e => setFilterProvider(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os provedores</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Provedor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Modelo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Tokens</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Req.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Custo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  Nenhum registro encontrado. Adicione seu primeiro registro de uso.
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-slate-300">
                    {format(parseISO(r.usedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: r.providerColor || '#6366f1' }}
                      />
                      <span className="text-slate-300">{r.providerName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.model}</td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    <span title={`Entrada: ${fmtNum(r.inputTokens)} / Saída: ${fmtNum(r.outputTokens)}`}>
                      {fmtNum(r.totalTokens)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.requestCount}</td>
                  <td className="px-4 py-3 text-right text-slate-300">${r.costUsd.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Adicionar Registro de Uso" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Provedor *</label>
                <select
                  value={form.providerId}
                  onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Modelo *</label>
                <input
                  type="text"
                  placeholder="ex: gpt-4o, claude-3-5-sonnet"
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tokens Entrada</label>
                <input
                  type="number"
                  value={form.inputTokens}
                  onChange={e => setForm(f => ({ ...f, inputTokens: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tokens Saída</label>
                <input
                  type="number"
                  value={form.outputTokens}
                  onChange={e => setForm(f => ({ ...f, outputTokens: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Requisições</label>
                <input
                  type="number"
                  value={form.requestCount}
                  onChange={e => setForm(f => ({ ...f, requestCount: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Custo (USD)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.costUsd}
                  onChange={e => setForm(f => ({ ...f, costUsd: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Data/Hora</label>
                <input
                  type="datetime-local"
                  value={form.usedAt}
                  onChange={e => setForm(f => ({ ...f, usedAt: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notas</label>
              <input
                type="text"
                placeholder="Descrição opcional..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.providerId || !form.model}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
