#!/usr/bin/env node
// Monitor API Usage Hook for QuoteIA Manager
// Monita chamadas a APIs de IA via MCP e registra consumo

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
    console.log('[QuoteIA Monitor] Analisando chamada de API...');
    
    // Detectar se é uma chamada de API de IA
    const toolInput = hookData.tool_input || {};
    const serverName = toolInput.server_name || '';
    const toolName = toolInput.tool_name || '';
    
    // Mapeamento de servidores MCP para providers do QuoteIA
    const providerMap = {
      'openai': { id: 1, name: 'OpenAI', slug: 'openai' },
      'anthropic': { id: 2, name: 'Anthropic', slug: 'anthropic' },
      'google': { id: 3, name: 'Google Gemini', slug: 'google' },
      'mistral': { id: 4, name: 'Mistral AI', slug: 'mistral' },
      'groq': { id: 5, name: 'Groq', slug: 'groq' },
      'cohere': { id: 6, name: 'Cohere', slug: 'cohere' },
      'xai': { id: 7, name: 'xAI (Grok)', slug: 'xai' },
      'deepseek': { id: 8, name: 'DeepSeek', slug: 'deepseek' },
      'copilot': { id: 9, name: 'GitHub Copilot', slug: 'copilot' },
      'kiro': { id: 10, name: 'Amazon Kiro', slug: 'kiro' },
      'devin': { id: 11, name: 'Devin (Cognition)', slug: 'devin' }
    };
    
    const provider = providerMap[serverName.toLowerCase()];
    
    if (provider && (toolName.includes('completion') || toolName.includes('chat') || toolName.includes('generate'))) {
      console.log(`[QuoteIA Monitor] Detectada chamada à API ${provider.name}`);
      
      // Estimar tokens baseado no conteúdo
      const arguments_str = JSON.stringify(toolInput.arguments || {});
      const estimatedTokens = Math.ceil(arguments_str.length / 4); // Estimativa simples
      
      // Criar registro de uso
      const usageRecord = {
        providerId: provider.id,
        model: extractModel(toolInput) || 'unknown',
        inputTokens: estimatedTokens,
        outputTokens: 0, // Será atualizado após a resposta
        totalTokens: estimatedTokens,
        requestCount: 1,
        costUsd: estimateCost(provider.slug, estimatedTokens),
        usedAt: new Date().toISOString(),
        notes: `MCP Call: ${serverName}.${toolName}`
      };
      
      // Salvar no database do QuoteIA Manager
      saveUsageRecord(usageRecord);
      
      console.log(`[QuoteIA Monitor] Registro criado: ${estimatedTokens} tokens, $${usageRecord.costUsd.toFixed(6)}`);
    }
    
    // Retornar aprovação
    console.log(JSON.stringify({ decision: 'approve', reason: 'API call monitored' }));
    
  } catch (error) {
    console.error('[QuoteIA Monitor] Erro:', error.message);
    console.log(JSON.stringify({ decision: 'approve', reason: 'Monitoring failed but allowed' }));
  }
});

function extractModel(toolInput) {
  const args = toolInput.arguments || {};
  return args.model || args.engine || args.model_id || null;
}

function estimateCost(providerSlug, tokens) {
  // Custos aproximados por 1M tokens (input)
  const costs = {
    'openai': 0.005,      // GPT-4
    'anthropic': 0.003,   // Claude
    'google': 0.001,      // Gemini
    'mistral': 0.0008,    // Mistral
    'groq': 0.0005,       // Groq
    'cohere': 0.0015,     // Cohere
    'xai': 0.002,         // xAI
    'deepseek': 0.0003,   // DeepSeek
    'copilot': 0.01,      // Por request
    'kiro': 0.02,         // Por request
    'devin': 0.01         // Por request
  };
  
  const costPerToken = (costs[providerSlug] || 0.001) / 1000000;
  return tokens * costPerToken;
}

function saveUsageRecord(record) {
  try {
    const userDataPath = process.env.APPDATA || path.join(process.env.HOME, 'AppData', 'Roaming');
    const dbPath = path.join(userDataPath, 'quote-ia-manager', 'quoteiamanager.json');
    
    if (!fs.existsSync(dbPath)) {
      console.log('[QuoteIA Monitor] Database não encontrado, criando registro temporário...');
      return;
    }
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    // Adicionar registro de uso
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
    
    console.log('[QuoteIA Monitor] Registro salvo com sucesso');
    
  } catch (error) {
    console.error('[QuoteIA Monitor] Erro ao salvar registro:', error.message);
  }
}