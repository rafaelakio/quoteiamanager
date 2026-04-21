# Documentação - Quote Ia Manager

Bem-vindo à documentação detalhada do Quote Ia Manager.

## 📚 Índice

- [Visão Geral](#-visão-geral)
- [Guia de Instalação](#-guia-de-instalação)
- [API Reference](#-api-reference)
- [Arquitetura](#-arquitetura)
- [Guia do Usuário](#-guia-do-usuário)
- [Troubleshooting](#-troubleshooting)

## 👁️ Visão Geral

Gerenciador de cotas de consumo de IAs

### Tecnologias Utilizadas

- **React**
- **TypeScript**
- **Vite**
- **Electron**
- **Tailwind CSS**

## 🔧 Guia de Instalação

### Requisitos Mínimos

- Node.js 18+
- npm 8+ ou yarn 1.22+

### Instalação Detalhada

```bash
# 1. Clone o repositório
git clone https://github.com/username/quoteIAmanager.git
cd quoteIAmanager

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local

# 4. Inicie o projeto
npm run dev
```

## 📖 API Reference

### Endpoints Principais

```typescript
// Exemplo de API
interface APIResponse {
  success: boolean;
  data: any;
  error?: string;
}
```

### Métodos Disponíveis

- `GET /api/items` - Listar itens
- `POST /api/items` - Criar item
- `PUT /api/items/:id` - Atualizar item
- `DELETE /api/items/:id` - Remover item

## 🏗️ Arquitetura

### Estrutura de Pastas

```
src/
├── components/     # Componentes React
├── pages/         # Páginas Next.js
├── services/      # Serviços de API
├── utils/         # Funções utilitárias
├── types/         # Tipos TypeScript
├── hooks/         # Hooks personalizados
└── styles/        # Estilos CSS
```

### Fluxo de Dados

1. **Componente** dispara uma ação
2. **Hook** processa a ação
3. **Service** faz requisição à API
4. **API** retorna dados
5. **Componente** atualiza UI

## 👤 Guia do Usuário

### Funcionalidades Principais

#### 1. Gestão de Dados

- **Criar**: Adicione novos itens através do formulário
- **Editar**: Modifique itens existentes
- **Excluir**: Remova itens não necessários
- **Buscar**: Encontre itens rapidamente

#### 2. Configurações

- **Perfil**: Personalize suas preferências
- **Notificações**: Configure alertas
- **Segurança**: Gerencie sua conta

### Dicas e Truques

- Use **Ctrl+K** para busca rápida
- **Arraste e solte** para reorganizar
- **Duplo clique** para editar rapidamente

## 🔧 Troubleshooting

### Problemas Comuns

#### Erro: "Module not found"

**Causa**: Dependência não instalada

**Solução**:
```bash
npm install
# ou
rm -rf node_modules package-lock.json
npm install
```

#### Erro: "Port already in use"

**Causa**: Porta 3000 já está em uso

**Solução**:
```bash
# Matar processo na porta 3000
npx kill-port 3000

# Ou usar outra porta
npm run dev -- -p 3001
```

#### Performance Lenta

**Causas Possíveis**:
- Muitos re-renders
- Estado não otimizado
- Imagens não otimizadas

**Soluções**:
- Use `useMemo` e `useCallback`
- Implemente virtualização
- Otimize imagens

## 📞 Suporte

Se você ainda tiver dúvidas:

- 📖 [Documentação Completa](../README.md)
- 🐛 [Reportar Bug](https://github.com/rafaelakio/quoteIAmanager/issues/new)
- 💡 [Sugestão](https://github.com/rafaelakio/quoteIAmanager/issues/new)
- 📧 Email: rafaelakio@github.com
- 💬 [Discord Community](https://discord.gg/quoteia-manager)
- 📱 [LinkedIn](https://linkedin.com/in/rafaelakio)

## 🔄 Atualizações

Fique atento às atualizações da documentação:

- **Versão 1.0**: Documentação inicial
- **Versão 1.1**: Adicionados exemplos de API
- **Versão 1.2**: Guia de troubleshooting expandido

---

Última atualização: 21/04/2026
