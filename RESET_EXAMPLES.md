# Exemplos de Configuração de Reset Periódico

## 📋 Exemplos Práticos

### 1. Amazon Kiro - Reset Mensal
```json
{
  "providerId": 4,
  "resetType": "monthly",
  "resetDay": 1,
  "resetTime": "00:00",
  "timezone": "America/Sao_Paulo",
  "isActive": true
}
```
**Descrição**: Reseta todo dia 1 do mês à meia-noite em São Paulo.

---

### 2. GitHub Copilot - Reset Semanal
```json
{
  "providerId": 3,
  "resetType": "weekly",
  "resetDay": 1,
  "resetTime": "09:00",
  "timezone": "America/New_York",
  "isActive": true
}
```
**Descrição**: Reseta toda segunda-feira às 9h em Nova York.

---

### 3. OpenAI - Reset Diário
```json
{
  "providerId": 1,
  "resetType": "daily",
  "resetTime": "06:00",
  "timezone": "UTC",
  "isActive": true
}
```
**Descrição**: Reseta todos os dias às 6h UTC.

---

### 4. Anthropic - Reset Personalizado
```json
{
  "providerId": 2,
  "resetType": "custom",
  "resetTime": "12:00",
  "timezone": "Europe/London",
  "isActive": true
}
```
**Descrição**: Reset personalizado ao meio-dia em Londres.

---

## 🌍 Cenários de Timezone

### Empresa Global com Equipes Múltiplas

**Sede em São Paulo** (UTC-3):
```json
{
  "providerId": 1,
  "resetType": "monthly",
  "resetDay": 1,
  "resetTime": "00:00",
  "timezone": "America/Sao_Paulo",
  "isActive": true
}
```

**Equipe EUA** (UTC-5):
```json
{
  "providerId": 2,
  "resetType": "monthly",
  "resetDay": 1,
  "resetTime": "00:00",
  "timezone": "America/New_York",
  "isActive": true
}
```

**Equipe Ásia** (UTC+9):
```json
{
  "providerId": 3,
  "resetType": "monthly",
  "resetDay": 1,
  "resetTime": "00:00",
  "timezone": "Asia/Tokyo",
  "isActive": true
}
```

---

## 📅 Casos de Uso Específicos

### 1. Startup com Orçamento Diário
**Provedor**: OpenAI
**Limite**: $10/dia
**Reset**: Diário às 00:00

```json
{
  "providerId": 1,
  "resetType": "daily",
  "resetTime": "00:00",
  "timezone": "America/Sao_Paulo",
  "isActive": true
}
```

### 2. Empresa com Reset Semanal
**Provedor**: Claude
**Limite**: 1M tokens/semana
**Reset**: Todo domingo às 23:59

```json
{
  "providerId": 2,
  "resetType": "weekly",
  "resetDay": 7, // Domingo
  "resetTime": "23:59",
  "timezone": "America/Sao_Paulo",
  "isActive": true
}
```

### 3. Consultoria com Reset Mensal
**Provedor**: Amazon Kiro
**Limite**: $50/mês
**Reset**: Todo dia 15 (dia de pagamento)

```json
{
  "providerId": 4,
  "resetType": "monthly",
  "resetDay": 15,
  "resetTime": "09:00",
  "timezone": "America/Sao_Paulo",
  "isActive": true
}
```

---

## 🔄 Fluxos de Trabalho

### Desenvolvedor Individual
```
1. Configurar reset diário para controle fino
2. Monitorar uso pelo Dashboard
3. Ajustar limites conforme necessário
```

### Equipe Pequena
```
1. Reset semanal para alinhar com sprints
2. Timezone do escritório central
3. Notificações para toda equipe
```

### Empresa Grande
```
1. Reset mensal para alinhar com faturamento
2. Múltiplos timezones para equipes globais
3. Relatórios detalhados para gestão
```

---

## ⚙️ Configurações Avançadas

### Múltiplos Providers
```json
[
  {
    "providerId": 1,
    "resetType": "daily",
    "resetTime": "00:00",
    "timezone": "America/Sao_Paulo",
    "isActive": true
  },
  {
    "providerId": 2,
    "resetType": "weekly",
    "resetDay": 1,
    "resetTime": "09:00",
    "timezone": "America/New_York",
    "isActive": true
  },
  {
    "providerId": 3,
    "resetType": "monthly",
    "resetDay": 1,
    "resetTime": "00:00",
    "timezone": "UTC",
    "isActive": true
  }
]
```

### Desabilitar Temporariamente
```json
{
  "providerId": 1,
  "resetType": "monthly",
  "resetDay": 1,
  "resetTime": "00:00",
  "timezone": "America/Sao_Paulo",
  "isActive": false // Desabilitado temporariamente
}
```

---

## 📊 Métricas e Monitoramento

### KPIs para Acompanhar
1. **Frequência de Resets**: Quantos resets por mês
2. **Consumo por Período**: Tokens/custo por ciclo
3. **Alertas de Cota**: Quantos alertas antes do reset
4. **Tendências**: Crescimento/decrescimento do uso

### Relatórios Sugeridos
- Uso semanal comparativo
- Eficiência dos limites configurados
- Projeções baseadas no histórico
- Análise por timezone

---

## 🚀 Best Practices

### 1. Escolha do Timezone
- Use o timezone da sede ou maioria da equipe
- Considere equipes distribuídas
- Documente o padrão escolhido

### 2. Frequência de Reset
- **Diário**: Para controle fino e orçamentos limitados
- **Semanal**: Para alinhar com ciclos de trabalho
- **Mensal**: Para alinhar com faturamento e planejamento

### 3. Horário de Reset
- Preferir horários de baixo uso
- Considerar timezones de equipes
- Evitar horários críticos de trabalho

### 4. Monitoramento
- Configure alertas antecipados (80% da cota)
- Revise periodicamente as configurações
- Ajuste conforme padrões de uso

---

## 🔧 Troubleshooting

### Reset Não Executou
1. Verificar se `isActive: true`
2. Confirmar data/hora do servidor
3. Validar timezone configurado
4. Checar logs do scheduler

### Hora Incorreta
1. Verificar timezone do sistema
2. Confirmar timezone da configuração
3. Considerar horário de verão
4. Validar formato HH:MM

### Notificações Não Recebidas
1. Verificar se notificações estão ativas
2. Checar centro de notificações
3. Confirmar permissões do sistema
4. Validar conexão do renderer

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consultar a documentação completa
2. Verificar logs da aplicação
3. Testar com configurações simples
4. Contactar equipe de desenvolvimento