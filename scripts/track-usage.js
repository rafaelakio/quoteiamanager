#!/usr/bin/env node
// Track Usage Hook for QuoteIA Manager
// Registra uso de APIs após comandos exec

const fs = require('fs');
const path = require('path');

// Ler dados do hook do stdin
let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const hookData = JSON.parse(inputData);
    console.log('[QuoteIA Tracker] Analisando pós-execução...');
    
    // Detectar se foi um comando relacionado a APIs de IA
    const toolInput = hookData.tool_input || {};
    const command = toolInput.command || '';
    
    // Padrões para detectar comandos de API
    const apiPatterns = [
      /curl.*api\.openai\.com/i,
      /curl.*api\.anthropic\.com/i,
      /curl.*generativelanguage\.googleapis\.com/i,
      /openai/i,
      /anthropic/i,
      /claude/i,
      /gpt/i,
      /gemini/i,
      /copilot/i,
      /github/i,
      /vscode.*copilot/i,
      /edge.*copilot/i,
      /\/copilot/i,
      /@copilot/i,
      /devin/i,
      /cognition/i,
      /kiro/i,
      /amazon/i,
      /aws/i,
      /python.*openai/i,
      /node.*openai/i,
      /pip install.*openai/i,
      /npm install.*openai/i
    ];
    
    const isApiCommand = apiPatterns.some(pattern => pattern.test(command));
    
    if (isApiCommand) {
      console.log('[QuoteIA Tracker] Detectado comando de API de IA');
      
      // Extrair informações do comando
      const provider = detectProvider(command);
      const tokens = estimateTokensFromCommand(command);
      
      if (provider) {
        const usageRecord = {
          providerId: provider.id,
          model: extractModelFromCommand(command) || 'unknown',
          inputTokens: tokens.input,
          outputTokens: tokens.output,
          totalTokens: tokens.total,
          requestCount: 1,
          costUsd: estimateCost(provider.slug, tokens.total),
          usedAt: new Date().toISOString(),
          notes: `CLI Command: ${command.substring(0, 100)}...`
        };
        
        // Salvar no database
        saveUsageRecord(usageRecord);
        
        console.log(`[QuoteIA Tracker] Registrado: ${provider.name}, ${tokens.total} tokens, $${usageRecord.costUsd.toFixed(6)}`);
      }
    }
    
    // Verificar se há alertas de cota
    checkQuotaAlerts();
    
  } catch (error) {
    console.error('[QuoteIA Tracker] Erro:', error.message);
  }
});

function detectProvider(command) {
  const providers = {
    'openai': { id: 1, name: 'OpenAI', slug: 'openai' },
    'anthropic': { id: 2, name: 'Anthropic', slug: 'anthropic' },
    'claude': { id: 2, name: 'Anthropic', slug: 'anthropic' },
    'google': { id: 3, name: 'Google Gemini', slug: 'google' },
    'gemini': { id: 3, name: 'Google Gemini', slug: 'google' },
    'mistral': { id: 4, name: 'Mistral AI', slug: 'mistral' },
    'groq': { id: 5, name: 'Groq', slug: 'groq' },
    'cohere': { id: 6, name: 'Cohere', slug: 'cohere' },
    'xai': { id: 7, name: 'xAI (Grok)', slug: 'xai' },
    'deepseek': { id: 8, name: 'DeepSeek', slug: 'deepseek' },
    'copilot': { id: 9, name: 'GitHub Copilot', slug: 'copilot' },
    'github': { id: 9, name: 'GitHub Copilot', slug: 'copilot' },
    'vscode': { id: 9, name: 'GitHub Copilot', slug: 'copilot' },
    'edge': { id: 9, name: 'GitHub Copilot', slug: 'copilot' },
    'devin': { id: 11, name: 'Devin (Cognition)', slug: 'devin' },
    'cognition': { id: 11, name: 'Devin (Cognition)', slug: 'devin' },
    'kiro': { id: 10, name: 'Amazon Kiro', slug: 'kiro' },
    'amazon': { id: 10, name: 'Amazon Kiro', slug: 'kiro' },
    'aws': { id: 10, name: 'Amazon Kiro', slug: 'kiro' }
  };
  
  for (const [key, provider] of Object.entries(providers)) {
    if (command.toLowerCase().includes(key)) {
      return provider;
    }
  }
  
  return null;
}

function extractModelFromCommand(command) {
  const modelPatterns = [
    /model["\s:]+([^"\s,}]+)/i,
    /gpt-([0-9])/i,
    /claude-([0-9])/i,
    /gemini-([a-z0-9]+)/i,
    /copilot-([a-z0-9-]+)/i,
    /devin-([a-z0-9-]+)/i,
    /cognition-([a-z0-9-]+)/i,
    /kiro-([a-z0-9-]+)/i,
    /gpt4o?/i,
    /gpt-3\.5/i
  ];
  
  for (const pattern of modelPatterns) {
    const match = command.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function estimateTokensFromCommand(command) {
  // Estimativa simples baseada no tamanho do comando
  const commandLength = command.length;
  const inputTokens = Math.ceil(commandLength / 4);
  const outputTokens = Math.ceil(inputTokens * 0.3); // Estimativa de 30% do input
  
  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens
  };
}

function estimateCost(providerSlug, tokens) {
  const costs = {
    'openai': 0.005,
    'anthropic': 0.003,
    'google': 0.001,
    'mistral': 0.0008,
    'groq': 0.0005,
    'cohere': 0.0015,
    'xai': 0.002,
    'deepseek': 0.0003
  };
  
  const costPerToken = (costs[providerSlug] || 0.001) / 1000000;
  return tokens * costPerToken;
}

function getDbPath() {
  const platform = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE;
  
  if (platform === 'win32') {
    return path.join(process.env.APPDATA, 'quote-ia-manager', 'quoteiamanager.json');
  } else if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'quote-ia-manager', 'quoteiamanager.json');
  } else {
    // Linux e outros baseados em XDG
    const configHome = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
    return path.join(configHome, 'quote-ia-manager', 'quoteiamanager.json');
  }
}

function saveUsageRecord(record) {
  try {
    const dbPath = getDbPath();
    
    if (!fs.existsSync(dbPath)) {
      console.log('[QuoteIA Tracker] Database não encontrado');
      return;
    }
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    const newRow = {
      id: db.nextUsageId++,
      provider_id: record.providerId,
      model: record.model,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      total_tokens: record.totalTokens,
      request_count: record.requestCount,
      cost_usd: record.costUsd,
      used_at: record.usedAt,
      notes: record.notes
    };
    
    db.usage.push(newRow);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    console.log('[QuoteIA Tracker] Registro salvo com sucesso');
    
  } catch (error) {
    console.error('[QuoteIA Tracker] Erro ao salvar registro:', error.message);
  }
}

function checkQuotaAlerts() {
  try {
    const dbPath = getDbPath();
    
    if (!fs.existsSync(dbPath)) return;
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    for (const provider of db.providers.filter(p => p.is_active)) {
      const monthlyUsage = db.usage.filter(u => 
        u.provider_id === provider.id && u.used_at >= startOfMonth
      );
      
      const totalTokens = monthlyUsage.reduce((sum, u) => sum + u.total_tokens, 0);
      const totalRequests = monthlyUsage.reduce((sum, u) => sum + u.request_count, 0);
      const totalCost = monthlyUsage.reduce((sum, u) => sum + u.cost_usd, 0);
      
      const currentValue = provider.monthly_quota_type === 'tokens' ? totalTokens :
                          provider.monthly_quota_type === 'requests' ? totalRequests :
                          totalCost;
      
      const percentUsed = provider.monthly_quota > 0 ? currentValue / provider.monthly_quota : 0;
      
      if (percentUsed >= provider.alert_threshold) {
        console.log(`⚠️  [QuoteIA Alert] ${provider.name}: ${Math.round(percentUsed * 100)}% da cota utilizada!`);
      }
    }
    
  } catch (error) {
    console.error('[QuoteIA Tracker] Erro ao verificar alertas:', error.message);
  }
}