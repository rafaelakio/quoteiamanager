# Sistema de Reset Periódico - QuoteIA Manager

## 🎯 Visão Geral

Este documento descreve o sistema completo de reset periódico de contadores implementado no QuoteIA Manager, permitindo que os usuários configurem quando os contadores de consumo dos providers devem ser zerados automaticamente, mantendo o histórico completo para análise.

## 📋 Funcionalidades Implementadas

### ✅ Fase 1 - Backend Core
- **Atualização de Tipos**: Novas interfaces `ProviderResetConfig`, `ResetHistory`, `TimezoneInfo`
- **Banco de Dados**: Tabelas `resetConfigs` e `resetHistory` adicionadas
- **ResetService**: Lógica completa para cálculo de datas, timezones e execução de resets
- **API Endpoints**: 8 novos endpoints IPC para gerenciamento de configurações

### ✅ Fase 2 - Frontend UI
- **ResetConfiguration**: Modal completo para configuração de resets
- **DatePicker**: Componente para seleção de horário com opções rápidas
- **TimezoneSelector**: Selector com timezones populares e hora atual
- **Dashboard**: Cards de informação de reset e contagem regressiva
- **SettingsPage**: Seção dedicada para gerenciamento de resets

### ✅ Fase 3 - Automação
- **ResetScheduler**: Serviço automatizado que verifica e executa resets
- **Sistema de Notificações**: NotificationCenter com alertas de reset
- **Marcadores nos Gráficos**: Indicadores visuais de resets nos gráficos de consumo
- **Interface Mobile**: Totalmente responsiva

## 🏗️ Arquitetura

### Backend (Electron)

```
electron/
├── database.ts          # Funções de banco de dados estendidas
├── resetService.ts      # Lógica de negócio de resets
├── resetScheduler.ts    # Agendador automático
└── main.ts             # Handlers IPC atualizados
```

### Frontend (React)

```
src/
├── types/index.ts              # Tipos estendidos
├── components/
│   ├── ResetConfiguration.tsx  # Modal de configuração
│   ├── DatePicker.tsx          # Selector de data/hora
│   ├── TimezoneSelector.tsx    # Selector de timezone
│   ├── ResetInfoCard.tsx       # Card de informações
│   ├── ResetSchedulerStatus.tsx # Status do agendador
│   ├── ResetMarker.tsx         # Marcadores nos gráficos
│   └── NotificationCenter.tsx   # Sistema de notificações
├── services/notificationService.ts # Serviço de notificações
├── pages/
│   ├── Dashboard.tsx           # Atualizado com infos de reset
│   └── SettingsPage.tsx        # Nova seção de resets
└── App.tsx                     # Integração geral
```

## 📊 Tipos de Reset Suportados

### 1. **Diário**
- Executa todos os dias no horário configurado
- Ideal para serviços com limites diários

### 2. **Semanal**
- Executa uma vez por semana
- Configurável por dia (Segunda a Domingo)

### 3. **Mensal**
- Executa uma vez por mês
- Configurável por dia do mês (1-31)

### 4. **Personalizado**
- Para necessidades específicas
- Data customizada configurável

## 🌍 Timezones Suportados

- America/Sao_Paulo (UTC-3)
- America/New_York (UTC-5)
- America/Los_Angeles (UTC-8)
- Europe/London (UTC+0)
- Europe/Paris (UTC+1)
- Europe/Berlin (UTC+1)
- Asia/Tokyo (UTC+9)
- Asia/Shanghai (UTC+8)
- Asia/Dubai (UTC+4)
- Australia/Sydney (UTC+11)
- UTC

## 🔧 Configuração

### Exemplo Prático: Kiro (Amazon)

```typescript
const kiroConfig = {
  providerId: 4,
  resetType: 'monthly',
  resetDay: 1,        // Todo dia 1 do mês
  resetTime: '00:00', // Meia-noite
  timezone: 'America/Sao_Paulo',
  isActive: true
}
```

## 📱 Fluxo de Usuário

1. **Acesso**: Dashboard ou Settings > Reset Periódico
2. **Seleção**: Escolher o provider desejado
3. **Configuração**: Definir tipo, dia, horário e timezone
4. **Ativação**: Habilitar o reset automático
5. **Monitoramento**: Acompanhar pelo Dashboard e NotificationCenter

## 🔄 Fluxo de Execução

1. **Agendamento**: ResetScheduler verifica a cada minuto
2. **Validação**: Confirma se está na hora/data correta
3. **Execução**: Realiza o reset e salva histórico
4. **Notificação**: Envia alerta para o usuário
5. **Atualização**: Atualiza interface com novos dados

## 📈 Histórico e Análise

- **Preservação Completa**: Todo histórico é mantido
- **ResetHistory**: Registro detalhado de cada reset
- **Análise de Tendências**: Possível comparar períodos
- **Gráficos**: Marcadores visuais nos pontos de reset

## 🔔 Sistema de Notificações

### Tipos de Notificações

1. **Reset Executado**: Sucesso na execução automática
2. **Erro no Reset**: Falha na execução
3. **Alerta de Cota**: Aproximando do limite
4. **Cota Excedida**: Limite atingido

### Centro de Notificações

- Badge com contador de não lidas
- Dropdown com lista completa
- Actions contextuais
- Auto-dismiss para success

## 🎨 Componentes UI

### ResetConfiguration
- Modal completo e responsivo
- Validação em tempo real
- Feedback visual de sucesso
- Suporte a edição e remoção

### ResetInfoCard
- Informações do período atual
- Contagem regressiva
- Status do agendamento
- Acesso rápido à configuração

### ResetSchedulerStatus
- Status do agendador
- Próximos agendamentos
- Trigger manual
- Logs de execução

## 🧪 Testes e Validação

### Casos de Teste

1. **Timezones**: Verificação em diferentes fusos horários
2. **Edge Cases**: Mudança de horário de verão, meses com 31/30/28 dias
3. **Concorrência**: Múltiplos resets simultâneos
4. **Performance**: Impacto na performance da aplicação
5. **Persistência**: Sobrevivência a reinicializações

### Validação Manual

- Testar cada tipo de reset
- Verificar precisão dos horários
- Confirmar preservação de dados
- Validar notificações

## 📊 Performance

- **Verificação Minutal**: Impacto mínimo (< 1ms)
- **Banco de Dados**: Queries otimizadas com índices
- **UI**: Renderização condicional e lazy loading
- **Memória**: Cleanup automático de notificações antigas

## 🔮 Melhorias Futuras

1. **Reset por API**: Endpoint HTTP para integração externa
2. **Relatórios**: Exportação de históricos em CSV/PDF
3. **Regras Avançadas**: Condições complexas de reset
4. **Integração**: Webhooks para sistemas externos
5. **Analytics**: Dashboard avançado de tendências

## 🚀 Deploy

### Build
```bash
npm run build
npm run electron:build
```

### Variáveis de Ambiente
```env
RESET_SCHEDULER_ENABLED=true
RESET_CHECK_INTERVAL=60000
NOTIFICATION_RETENTION_DAYS=30
```

## 📝 Considerações Técnicas

### Segurança
- Validação de inputs no backend
- Sanitização de datas e timezones
- Prevenção de race conditions

### Escalabilidade
- Arquitetura modular para fácil extensão
- Banco de dados preparado para volume
- Scheduler assíncrono e não bloqueante

### Manutenibilidade
- Código bem documentado
- Tipagem TypeScript completa
- Separação clara de responsabilidades

---

## 🎉 Conclusão

O sistema de reset periódico foi implementado com sucesso, fornecendo uma solução robusta, flexível e intuitiva para gerenciamento automático de contadores no QuoteIA Manager. A arquitetura modular garante facilidade de manutenção e expansão futura.