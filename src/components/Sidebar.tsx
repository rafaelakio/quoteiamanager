import { LayoutDashboard, List, Server, Settings, Zap } from 'lucide-react'
import type { Page } from '../store/appStore'
import type { ProviderStats } from '../types'

interface Props {
  page: Page
  onNavigate: (page: Page) => void
  providerStats: ProviderStats[]
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'usage' as Page, label: 'Uso', icon: List },
  { id: 'providers' as Page, label: 'Provedores', icon: Server },
  { id: 'settings' as Page, label: 'Configurações', icon: Settings },
]

export function Sidebar({ page, onNavigate, providerStats }: Props) {
  const alerts = providerStats.filter(s => s.isNearQuota || s.isOverQuota)

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-4 drag-region border-b border-slate-800">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Quote IA</h1>
            <p className="text-xs text-slate-400">Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {alerts.length > 0 && (
        <div className="p-3 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Alertas</p>
          <div className="space-y-1.5">
            {alerts.slice(0, 3).map(s => (
              <div key={s.providerId} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-800">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.isOverQuota ? '#ef4444' : '#f59e0b' }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{s.providerName}</p>
                  <p className={`text-xs ${s.isOverQuota ? 'text-red-400' : 'text-amber-400'}`}>
                    {(s.percentUsed * 100).toFixed(0)}% usado
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
