#!/usr/bin/env node
// Session Start Hook for QuoteIA Manager
// Inicializa sessão com contexto do quoteiamanager

const fs = require('fs');
const path = require('path');

console.log('🚀 [QuoteIA Manager] Inicializando sessão com monitoramento de cotas...');

// Ler dados do hook do stdin
let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(inputData);
    console.log('[QuoteIA Session] Sessão iniciada - Carregando contexto do projeto...');
    
    // Carregar informações do projeto
    const projectInfo = loadProjectInfo();
    
    // Verificar status das cotas
    const quotaStatus = checkQuotaStatus();
    
    // Exibir resumo
    console.log('\n📊 [QuoteIA Manager] Resumo de Consumo:');
    console.log('=====================================');
    
    if (quotaStatus.providers.length > 0) {
      for (const provider of quotaStatus.providers) {
        const status = provider.isOverQuota ? '🔴 Esgotado' :
                      provider.isNearQuota ? '🟡 Próximo ao limite' : '🟢 OK';
        console.log(`${status} ${provider.providerName}: ${Math.round(provider.percentUsed * 100)}% (${provider.currentMonth.totalTokens.toLocaleString()} tokens / ${provider.quota.toLocaleString()})`);
      }
    } else {
      console.log('ℹ️  Nenhum provider ativo configurado');
    }
    
    console.log('\n💡 [QuoteIA Manager] Dicas:');
    console.log('- Use /hooks para verificar configuração');
    console.log('- Chamadas a APIs serão monitoradas automaticamente');
    console.log('- Alertas aparecerão quando approaching limites');
    console.log('- Dados são salvos em tempo real no QuoteIA Manager');
    
    // Definir variáveis de ambiente para o projeto
    process.env.QUOTEIA_PROJECT_ROOT = 'C:\\dev\\quoteIAmanager';
    process.env.QUOTEIA_SESSION_ID = hookData.session_id || 'unknown';
    
    console.log('\n✅ [QuoteIA Manager] Monitoramento ativo!');
    
  } catch (error) {
    console.error('[QuoteIA Session] Erro na inicialização:', error.message);
  }
});

function loadProjectInfo() {
  try {
    const packagePath = 'C:\\dev\\quoteIAmanager\\package.json';
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description
      };
    }
  } catch (error) {
    console.error('[QuoteIA Session] Erro ao ler package.json:', error.message);
  }
  
  return {
    name: 'quote-ia-manager',
    version: '1.0.0',
    description: 'Gerenciador de cotas de consumo de IAs'
  };
}

function checkQuotaStatus() {
  try {
    const userDataPath = process.env.APPDATA || path.join(process.env.HOME, 'AppData', 'Roaming');
    const dbPath = path.join(userDataPath, 'quote-ia-manager', 'quoteiamanager.json');
    
    if (!fs.existsSync(dbPath)) {
      console.log('[QuoteIA Session] Database não encontrado - Use o QuoteIA Manager para configurar providers');
      return { providers: [] };
    }
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const providers = db.providers
      .filter(p => p.is_active)
      .map(p => {
        const monthlyUsage = db.usage.filter(u => 
          u.provider_id === p.id && u.used_at >= startOfMonth
        );
        
        const agg = monthlyUsage.reduce(
          (acc, u) => ({
            totalTokens: acc.totalTokens + u.total_tokens,
            inputTokens: acc.inputTokens + u.input_tokens,
            outputTokens: acc.outputTokens + u.output_tokens,
            requestCount: acc.requestCount + u.request_count,
            costUsd: acc.costUsd + u.cost_usd,
          }),
          { totalTokens: 0, inputTokens: 0, outputTokens: 0, requestCount: 0, costUsd: 0 }
        );
        
        const currentValue =
          p.monthly_quota_type === 'tokens' ? agg.totalTokens :
          p.monthly_quota_type === 'requests' ? agg.requestCount :
          agg.costUsd;
        
        const percentUsed = p.monthly_quota > 0 ? currentValue / p.monthly_quota : 0;
        
        return {
          providerId: p.id,
          providerName: p.name,
          providerColor: p.color,
          currentMonth: agg,
          quota: p.monthly_quota,
          quotaType: p.monthly_quota_type,
          alertThreshold: p.alert_threshold,
          percentUsed,
          isOverQuota: percentUsed >= 1,
          isNearQuota: percentUsed >= p.alert_threshold && percentUsed < 1,
        };
      });
    
    return { providers };
    
  } catch (error) {
    console.error('[QuoteIA Session] Erro ao verificar status:', error.message);
    return { providers: [] };
  }
}

// Exportar funções para uso em outros scripts
if (require.main === module) {
  // Se executado diretamente, mostrar status atual
  console.log('📊 [QuoteIA Manager] Status Atual das Cotas:');
  console.log('==========================================');
  
  const quotaStatus = checkQuotaStatus();
  
  if (quotaStatus.providers.length > 0) {
    for (const provider of quotaStatus.providers) {
      const status = provider.isOverQuota ? '🔴 Esgotado' :
                    provider.isNearQuota ? '🟡 Próximo ao limite' : '🟢 OK';
      console.log(`${status} ${provider.providerName}: ${Math.round(provider.percentUsed * 100)}%`);
      console.log(`   Tokens: ${provider.currentMonth.totalTokens.toLocaleString()} / ${provider.quota.toLocaleString()}`);
      console.log(`   Custo: $${provider.currentMonth.costUsd.toFixed(4)}`);
      console.log('');
    }
  } else {
    console.log('ℹ️  Nenhum provider ativo configurado');
    console.log('💡 Abra o QuoteIA Manager para configurar seus providers de IA');
  }
}