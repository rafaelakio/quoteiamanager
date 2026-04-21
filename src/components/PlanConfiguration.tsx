import { useState, useEffect } from 'react'
import { Settings, Check, X, Info, Star, Zap, Shield } from 'lucide-react'
import type { Provider, ProviderPlan } from '../types'

// Planos pré-definidos para cada provider
const PREDEFINED_PLANS: ProviderPlan[] = [
  // Claude Plans
  {
    id: 'claude-free',
    name: 'Free',
    provider: 'claude',
    description: 'Plano gratuito com limites básicos',
    limits: { tokens: 100000, requests: 100 },
    features: ['Acesso Claude 3.5 Sonnet', 'Suporte básico'],
  },
  {
    id: 'claude-pro',
    name: 'Pro',
    provider: 'claude',
    description: 'Para desenvolvedores individuais',
    limits: { tokens: 5000000, requests: 1000 },
    features: ['5x mais tokens', 'Prioridade no acesso', 'Contexto maior'],
    isPopular: true,
  },
  {
    id: 'claude-code-pro',
    name: 'Code Pro',
    provider: 'claude',
    description: 'Especializado para desenvolvimento',
    limits: { tokens: 10000000, requests: 5000 },
    features: ['10x mais tokens', 'Otimizado para código', 'Integração IDE'],
  },
  // OpenAI Plans
  {
    id: 'openai-free',
    name: 'Free Tier',
    provider: 'openai',
    description: 'Créditos gratuitos iniciais',
    limits: { cost: 5, tokens: 1000000 },
    features: ['Créditos de $5', 'Acesso GPT-4o', 'API básica'],
  },
  {
    id: 'openai-payg',
    name: 'Pay-as-you-go',
    provider: 'openai',
    description: 'Pague pelo que usar',
    limits: { cost: 100 },
    features: ['Sem limite fixo', 'Preço por uso', 'Todos os modelos'],
    isPopular: true,
  },
  // Gemini Plans
  {
    id: 'gemini-free',
    name: 'Free',
    provider: 'gemini',
    description: 'Uso gratuito do Gemini',
    limits: { tokens: 1500000, requests: 60 },
    features: ['Gemini 1.5 Flash', '15 req/minuto', '1M tokens/mês'],
  },
  {
    id: 'gemini-pro',
    name: 'Pro',
    provider: 'gemini',
    description: 'Para desenvolvedores',
    limits: { tokens: 15000000, requests: 1500 },
    features: ['Gemini 1.5 Pro', '15 req/minuto', '10x mais tokens'],
    isPopular: true,
  },
  // Kiro Plans
  {
    id: 'kiro-free',
    name: 'Free',
    provider: 'kiro',
    description: 'Plano gratuito Kiro',
    limits: { tokens: 50000, requests: 50 },
    features: ['Modelos básicos', 'Suporte comunitário'],
  },
  {
    id: 'kiro-starter',
    name: 'Starter',
    provider: 'kiro',
    description: 'Para começar a usar Kiro',
    limits: { tokens: 500000, requests: 500 },
    features: ['Mais tokens', 'Prioridade básica'],
    isPopular: true,
  },
  {
    id: 'kiro-pro',
    name: 'Pro',
    provider: 'kiro',
    description: 'Uso profissional',
    limits: { tokens: 2000000, requests: 2000 },
    features: ['Acesso completo', 'Suporte prioritário'],
  },
]

interface PlanConfigurationProps {
  provider: Provider
  onUpdate: (updates: Partial<Provider>) => void
  onClose: () => void
}

export function PlanConfiguration({ provider, onUpdate, onClose }: PlanConfigurationProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(provider.planType || 'custom')
  const [customLimits, setCustomLimits] = useState({
    tokens: provider.customLimits?.tokens || provider.monthlyQuota,
    requests: provider.customLimits?.requests || 0,
    cost: provider.customLimits?.cost || 0,
  })

  const availablePlans = PREDEFINED_PLANS.filter(plan => plan.provider === provider.slug)
  const isCustomPlan = selectedPlan === 'custom'

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    
    if (planId !== 'custom') {
      const plan = PREDEFINED_PLANS.find(p => p.id === planId)
      if (plan) {
        setCustomLimits({
          tokens: plan.limits.tokens || 0,
          requests: plan.limits.requests || 0,
          cost: plan.limits.cost || 0,
        })
      }
    }
  }

  const handleSave = () => {
    const updates: Partial<Provider> = {
      planType: selectedPlan,
      customLimits: isCustomPlan ? customLimits : undefined,
    }

    // Atualizar quota principal baseado no plano selecionado
    if (selectedPlan !== 'custom') {
      const plan = PREDEFINED_PLANS.find(p => p.id === selectedPlan)
      if (plan) {
        if (plan.limits.tokens) {
          updates.monthlyQuota = plan.limits.tokens
          updates.monthlyQuotaType = 'tokens'
        } else if (plan.limits.cost) {
          updates.monthlyQuota = plan.limits.cost
          updates.monthlyQuotaType = 'cost'
        } else if (plan.limits.requests) {
          updates.monthlyQuota = plan.limits.requests
          updates.monthlyQuotaType = 'requests'
        }
      }
    } else {
      // Para plano personalizado, usar o maior valor definido
      const { tokens, requests, cost } = customLimits
      if (tokens > 0) {
        updates.monthlyQuota = tokens
        updates.monthlyQuotaType = 'tokens'
      } else if (cost > 0) {
        updates.monthlyQuota = cost
        updates.monthlyQuotaType = 'cost'
      } else if (requests > 0) {
        updates.monthlyQuota = requests
        updates.monthlyQuotaType = 'requests'
      }
    }

    onUpdate(updates)
    onClose()
  }

  const formatLimit = (type: string, value: number) => {
    if (value === 0) return 'Não limitado'
    switch (type) {
      case 'tokens':
        return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M tokens` : `${value.toLocaleString()} tokens`
      case 'requests':
        return `${value.toLocaleString()} requisições`
      case 'cost':
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value)
      default:
        return value.toString()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${provider.color}20` }}>
                <Settings className="w-5 h-5" style={{ color: provider.color }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Configurar Plano - {provider.name}</h2>
                <p className="text-slate-400 text-sm">Escolha um plano ou defina limites personalizados</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Planos Disponíveis */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Planos Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Opção Personalizada */}
              <div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  isCustomPlan
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => handlePlanSelect('custom')}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">Personalizado</span>
                  {isCustomPlan && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-slate-400 text-sm mb-3">Defina seus próprios limites</p>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">• Limites flexíveis</div>
                  <div className="text-xs text-slate-500">• Controle total</div>
                </div>
              </div>

              {/* Planos Pré-definidos */}
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-all relative ${
                    selectedPlan === plan.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Popular
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">{plan.name}</span>
                    {selectedPlan === plan.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{plan.description}</p>
                  <div className="space-y-1 mb-3">
                    {plan.limits.tokens && (
                      <div className="text-xs text-slate-500">• {formatLimit('tokens', plan.limits.tokens)}</div>
                    )}
                    {plan.limits.requests && (
                      <div className="text-xs text-slate-500">• {formatLimit('requests', plan.limits.requests)}</div>
                    )}
                    {plan.limits.cost && (
                      <div className="text-xs text-slate-500">• {formatLimit('cost', plan.limits.cost)}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.slice(0, 2).map((feature, idx) => (
                      <span key={idx} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuração Personalizada */}
          {isCustomPlan && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Limites Personalizados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Limite de Tokens
                  </label>
                  <input
                    type="number"
                    value={customLimits.tokens || ''}
                    onChange={(e) => setCustomLimits(prev => ({ ...prev, tokens: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 = ilimitado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Limite de Requisições
                  </label>
                  <input
                    type="number"
                    value={customLimits.requests || ''}
                    onChange={(e) => setCustomLimits(prev => ({ ...prev, requests: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 = ilimitado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Limite de Custo (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customLimits.cost || ''}
                    onChange={(e) => setCustomLimits(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 = ilimitado"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Informações do Plano Selecionado */}
          {selectedPlan !== 'custom' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium mb-2">Detalhes do Plano</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(() => {
                      const plan = PREDEFINED_PLANS.find(p => p.id === selectedPlan)
                      return plan ? (
                        <>
                          {plan.limits.tokens && (
                            <div>
                              <span className="text-slate-400 text-sm">Tokens:</span>
                              <span className="text-white ml-2">{formatLimit('tokens', plan.limits.tokens)}</span>
                            </div>
                          )}
                          {plan.limits.requests && (
                            <div>
                              <span className="text-slate-400 text-sm">Requisições:</span>
                              <span className="text-white ml-2">{formatLimit('requests', plan.limits.requests)}</span>
                            </div>
                          )}
                          {plan.limits.cost && (
                            <div>
                              <span className="text-slate-400 text-sm">Custo:</span>
                              <span className="text-white ml-2">{formatLimit('cost', plan.limits.cost)}</span>
                            </div>
                          )}
                        </>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Salvar Configuração
          </button>
        </div>
      </div>
    </div>
  )
}