import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  RefreshCw, 
  Terminal,
  Database,
  FileCode,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Wifi,
  WifiOff,
  Loader2,
  Clock,
  Zap,
  Shield,
  Globe
} from 'lucide-react'
import { useDb } from '../hooks/useDb'

interface ConfigStatus {
  hooks: { 
    configured: boolean; 
    path?: string; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  providers: { 
    configured: boolean; 
    count: number; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  scripts: { 
    configured: boolean; 
    scripts: string[]; 
    error?: string;
    online?: boolean;
    lastPing?: string;
  }
  monitoring: { 
    active: boolean; 
    lastCheck: string; 
    error?: string;
    port?: number;
    endpoint?: string;
    online?: boolean;
    lastPing?: string;
  }
}

interface ConfigLog {
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

interface ValidationResult {
  hooks: { valid: boolean; details: string; online?: boolean }
  providers: { valid: boolean; details: string; online?: boolean }
  scripts: { valid: boolean; details: string; online?: boolean }
  database: { valid: boolean; details: string; online?: boolean }
  network?: { valid: boolean; details: string; online?: boolean }
  allValid?: boolean
  allOnline?: boolean
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export function ConfigurationCenter() {
  const { invoke } = useDb()
  const [status, setStatus] = useState<ConfigStatus | null>(null)
  const [logs, setLogs] = useState<ConfigLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [connectivityTests, setConnectivityTests] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadStatus()
    loadLogs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadStatus()
      loadLogs()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast = { ...toast, id, duration: toast.duration || 5000 }
    setToasts(prev => [...prev, newToast])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, newToast.duration)
  }

  const loadStatus = async () => {
    try {
      const configStatus = await invoke<ConfigStatus>('config:getStatus')
      setStatus(configStatus)
    } catch (error) {
      console.error('Erro ao carregar status:', error)
      addToast({
        type: 'error',
        title: 'Erro ao carregar status',
        message: 'Não foi possível obter o status atual da configuração'
      })
    }
  }

  const loadLogs = async () => {
    try {
      const configLogs = await invoke<ConfigLog[]>('config:getLogs')
      setLogs(configLogs)
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    }
  }

  const forceConfig = async (type: 'hooks' | 'providers' | 'scripts') => {
    setLoading(true)
    setLoadingAction(type)
    
    try {
      addToast({
        type: 'info',
        title: `Configurando ${type}...`,
        message: `Iniciando configuração automática de ${type}`
      })
      
      const result = await invoke(`config:force${type.charAt(0).toUpperCase() + type.slice(1)}`) as any
      
      if (result.success) {
        addToast({
          type: 'success',
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} configurados com sucesso`,
          message: result.verified ? 'Configuração verificada e ativa' : 'Configuração concluída'
        })
        await loadStatus()
        await loadLogs()
      } else {
        addToast({
          type: 'error',
          title: `Falha ao configurar ${type}`,
          message: result.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      console.error(`Erro ao configurar ${type}:`, error)
      addToast({
        type: 'error',
        title: `Erro ao configurar ${type}`,
        message: 'Ocorreu um erro inesperado durante a configuração'
      })
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const validateAll = async () => {
    setLoading(true)
    setLoadingAction('validate')

    try {
      addToast({ type: 'info', title: 'Validando configuração...', message: 'Verificando todos os componentes do sistema' })

      const results = await invoke<ValidationResult>('config:validateAll')
      setValidationResults(results)
      await loadLogs()

      if (results.allValid && results.allOnline) {
        addToast({ type: 'success', title: 'Configuração perfeita!', message: 'Todos os componentes estão configurados e online' })
      } else if (results.allValid) {
        addToast({ type: 'warning', title: 'Configuração válida com alertas', message: 'Componentes configurados mas alguns estão offline' })
      } else {
        const failing = Object.entries(results)
          .filter(([k, v]) => k !== 'allValid' && k !== 'allOnline' && typeof v === 'object' && v !== null && !(v as any).valid)
          .map(([k, v]) => `${k}: ${(v as any).details}`)
          .join(' | ')
        addToast({ type: 'error', title: 'Configuração incompleta', message: failing || 'Alguns componentes precisam ser configurados' })
      }
    } catch (error) {
      console.error('Erro na validação:', error)
      addToast({ type: 'error', title: 'Erro na validação', message: String(error) })
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const testConnectivity = async () => {
    setLoading(true)
    setLoadingAction('connectivity')
    
    try {
      addToast({
        type: 'info',
        title: 'Testando conectividade...',
        message: 'Verificando portas e processos ativos'
      })
      
      const result = await invoke('config:testConnectivity') as any
      setConnectivityTests(result)
      
      if (result.success) {
        const { successCount, totalTests } = result
        if (successCount === totalTests) {
          addToast({
            type: 'success',
            title: 'Conectividade perfeita',
            message: `${successCount}/${totalTests} testes bem-sucedidos`
          })
        } else {
          addToast({
            type: 'warning',
            title: 'Problemas de conectividade',
            message: `${successCount}/${totalTests} testes bem-sucedidos`
          })
        }
      }
    } catch (error) {
      console.error('Erro nos testes de conectividade:', error)
      addToast({
        type: 'error',
        title: 'Erro nos testes',
        message: 'Não foi possível realizar os testes de conectividade'
      })
    } finally {
      setLoading(false)
      setLoadingAction(null)
    }
  }

  const getStatusIcon = (configured: boolean, online?: boolean) => {
    if (!configured) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    
    if (online === false) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    }
    
    return <CheckCircle className="w-5 h-5 text-green-500" />
  }

  const getOnlineStatusIcon = (online?: boolean) => {
    if (online === undefined) return null
    
    return online ? (
      <Wifi className="w-4 h-4 text-green-500" />
    ) : (
      <WifiOff className="w-4 h-4 text-red-500" />
    )
  }

  const getLoadingSpinner = (action: string) => {
    return loadingAction === action ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : null
  }

  const getLogIcon = (type: ConfigLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const formatLastPing = (lastPing?: string) => {
    if (!lastPing) return 'Nunca'
    
    const now = new Date()
    const ping = new Date(lastPing)
    const diffMs = now.getTime() - ping.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins} min atrás`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} h atrás`
    
    return formatTimestamp(lastPing)
  }

  const ConfigCard = ({ 
    title, 
    icon: Icon, 
    configured, 
    online,
    port,
    endpoint,
    lastPing,
    details, 
    onForceConfig, 
    forceLabel,
    actionType,
    children 
  }: {
    title: string
    icon: any
    configured: boolean
    online?: boolean
    port?: number
    endpoint?: string
    lastPing?: string
    details: string
    onForceConfig: () => void
    forceLabel: string
    actionType: string
    children?: React.ReactNode
  }) => {
    const isExpanded = expandedSection === title
    const isActionLoading = loadingAction === actionType
    
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold text-white">{title}</h3>
              {getStatusIcon(configured, online)}
              {getOnlineStatusIcon(online)}
            </div>
            <div className="flex items-center gap-2">
              {lastPing && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatLastPing(lastPing)}
                </div>
              )}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : title)}
                className="p-1 rounded hover:bg-slate-700 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 mb-3">
            <p className="text-sm text-slate-400">{details}</p>
            
            {(port || endpoint) && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {port && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Porta: {port}
                  </span>
                )}
                {endpoint && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {endpoint}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={onForceConfig}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {forceLabel}
          </button>
          
          {isExpanded && children && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              {children}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border max-w-sm animate-pulse ${
              toast.type === 'success' ? 'bg-green-900 border-green-700 text-green-100' :
              toast.type === 'error' ? 'bg-red-900 border-red-700 text-red-100' :
              toast.type === 'warning' ? 'bg-yellow-900 border-yellow-700 text-yellow-100' :
              'bg-blue-900 border-blue-700 text-blue-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {getLogIcon(toast.type)}
              <div>
                <h4 className="font-semibold">{toast.title}</h4>
                {toast.message && <p className="text-sm opacity-90">{toast.message}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Central de Configuração</h2>
          <p className="text-slate-400">
            Configure automaticamente todos os componentes do QuoteIA Manager
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testConnectivity}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {getLoadingSpinner('connectivity') || <Shield className="w-4 h-4" />}
            Testar Conectividade
          </button>
          <button
            onClick={validateAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {getLoadingSpinner('validate') || <RefreshCw className="w-4 h-4" />}
            Validar Tudo
          </button>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading && !loadingAction ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Auto-refresh
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resultados da Validação
            {validationResults.allValid && validationResults.allOnline && (
              <span className="text-xs bg-green-600 px-2 py-1 rounded-full">Perfeito</span>
            )}
            {validationResults.allValid && !validationResults.allOnline && (
              <span className="text-xs bg-yellow-600 px-2 py-1 rounded-full">Parcial</span>
            )}
            {!validationResults.allValid && (
              <span className="text-xs bg-red-600 px-2 py-1 rounded-full">Incompleto</span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(validationResults)
              .filter(([key, result]) => key !== 'allValid' && key !== 'allOnline' && typeof result === 'object' && result !== null)
              .map(([key, result]) => {
                const r = result as { valid: boolean; details: string; online?: boolean }
                return (
                  <div key={key} className="flex items-start gap-2 text-sm">
                    {r.valid ? (
                      r.online === false ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      )
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-slate-300 capitalize font-medium">{key}: </span>
                      <span className="text-slate-400">{r.details}</span>
                    </div>
                    {r.online !== undefined && (
                      <span className="shrink-0">{getOnlineStatusIcon(r.online)}</span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Connectivity Tests */}
      {connectivityTests && connectivityTests.success && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Testes de Conectividade
            <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
              {connectivityTests.successCount}/{connectivityTests.totalTests} OK
            </span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(connectivityTests.tests).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {value ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-slate-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className={value ? 'text-green-400' : 'text-red-400'}>
                  {value ? 'OK' : 'Falha'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfigCard
          title="Hooks do Sistema"
          icon={Terminal}
          configured={status.hooks.configured}
          online={status.hooks.online}
          lastPing={status.hooks.lastPing}
          details={status.hooks.configured 
            ? `Configurado em: ${status.hooks.path || 'Desconhecido'}`
            : 'Hooks não configurados no shell'
          }
          onForceConfig={() => forceConfig('hooks')}
          forceLabel="Force Config Hooks"
          actionType="hooks"
        >
          <div className="space-y-2 text-sm text-slate-400">
            <p>• Configura automaticamente hooks no shell (.bashrc/.zshrc)</p>
            <p>• Adiciona variáveis de ambiente necessárias</p>
            <p>• Configura monitoramento em tempo real</p>
            <p>• Requer reinicialização do terminal após configuração</p>
            {status.hooks.path && (
              <p className="text-xs text-slate-500 mt-2">
                Arquivo: {status.hooks.path}
              </p>
            )}
          </div>
        </ConfigCard>

        <ConfigCard
          title="Providers de IA"
          icon={Database}
          configured={status.providers.configured}
          online={status.providers.online}
          lastPing={status.providers.lastPing}
          details={`${status.providers.count} providers configurados`}
          onForceConfig={() => forceConfig('providers')}
          forceLabel="Force Config Providers"
          actionType="providers"
        >
          <div className="space-y-2 text-sm text-slate-400">
            <p>• OpenAI, Anthropic, Google Gemini</p>
            <p>• Amazon Kiro, Devin, xAI, DeepSeek</p>
            <p>• GitHub Copilot, Groq, Cohere</p>
            <p>• Mistral AI e outros providers</p>
            {status.providers.count > 0 && (
              <p className="text-xs text-green-400 mt-2">
                ✓ {status.providers.count} providers ativos
              </p>
            )}
          </div>
        </ConfigCard>

        <ConfigCard
          title="Scripts de Monitoramento"
          icon={FileCode}
          configured={status.scripts.configured}
          online={status.scripts.online}
          lastPing={status.scripts.lastPing}
          details={`${status.scripts.scripts.length} scripts encontrados`}
          onForceConfig={() => forceConfig('scripts')}
          forceLabel="Force Config Scripts"
          actionType="scripts"
        >
          <div className="space-y-2 text-sm text-slate-400">
            <p>• track-usage.js: Monitoramento de comandos</p>
            <p>• session-start.js: Inicialização de sessão</p>
            <p>• monitor-api-usage.js: Monitoramento de APIs</p>
            <p>• Configura permissões de execução</p>
            {status.scripts.scripts.length > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                Scripts: {status.scripts.scripts.join(', ')}
              </div>
            )}
          </div>
        </ConfigCard>

        <ConfigCard
          title="Monitoramento Ativo"
          icon={Activity}
          configured={status.monitoring.active}
          online={status.monitoring.online}
          port={status.monitoring.port}
          endpoint={status.monitoring.endpoint}
          lastPing={status.monitoring.lastPing}
          details={`Última verificação: ${formatTimestamp(status.monitoring.lastCheck)}`}
          onForceConfig={() => {}}
          forceLabel="Monitoramento Ativo"
          actionType="monitoring"
        >
          <div className="space-y-2 text-sm text-slate-400">
            <p>• Servidor de ingestão HTTP na porta {status.monitoring.port}</p>
            <p>• Captura automática de uso de APIs</p>
            <p>• Sincronização com Claude Code</p>
            <p>• Monitoramento em tempo real</p>
            {status.monitoring.online && (
              <p className="text-xs text-green-400 mt-2">
                ✓ Servidor online e acessível
              </p>
            )}
            {!status.monitoring.online && status.monitoring.active && (
              <p className="text-xs text-yellow-400 mt-2">
                ⚠ Servidor ativo mas não acessível
              </p>
            )}
          </div>
        </ConfigCard>
      </div>

      {/* Logs */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Logs de Configuração
          </h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              Nenhum log de configuração encontrado
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {logs.map((log, index) => (
                <div key={index} className="p-3 flex items-start gap-3">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white capitalize">
                        {log.type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}