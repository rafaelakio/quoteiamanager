# QuoteIA Manager

Gerenciador de cotas de consumo de APIs de IA - Aplicação desktop para monitorar e controlar seu uso de serviços como OpenAI, Anthropic, Google Gemini e outros.

## 🚀 Recursos

- **Monitoramento em tempo real** do consumo de APIs de IA
- **Dashboard interativo** com gráficos e estatísticas
- **Alertas automáticos** quando approaching limites de cota
- **Suporte múltiplos providers** (OpenAI, Anthropic, Google, Mistral, Groq, Cohere, xAI, DeepSeek, GitHub Copilot, Amazon Kiro, Devin)
- **Integração com Devin CLI** via hooks automáticos
- **Armazenamento local** em JSON (sem dependência de SQLite)
- **Interface moderna** com Tailwind CSS e Lucide React

## 📋 Pré-requisitos

- **Node.js** 18+ 
- **npm** ou **yarn**
- **Windows/Linux/Mac** (compatibilidade multiplataforma)

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd quoteIAmanager
```

2. Instale as dependências:
```bash
npm install
```

## 🚀 Executando a Aplicação

### Modo Desenvolvimento

Para iniciar a aplicação em modo desenvolvimento com hot reload:

```bash
npm run electron:dev
```

Este comando irá:
- Iniciar o servidor de desenvolvimento Vite (porta 5173)
- Aguardar o servidor estar pronto
- Iniciar o Electron automaticamente
- Recarregar automaticamente quando houver alterações nos arquivos

### Apenas o Frontend (Web)

Se quiser testar apenas a interface web sem o Electron:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🏗️ Build da Aplicação

### Build para Produção

Para criar uma versão otimizada para distribuição:

```bash
npm run electron:build
```

Este processo:
- Compila o TypeScript
- Build do frontend com Vite
- Aplica patches necessários no Electron Builder
- Gera executáveis na pasta `release/`

### Build Apenas do Frontend

Para build apenas dos arquivos web (sem empacotar Electron):

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`

## 📁 Estrutura do Projeto

```
quoteIAmanager/
├── src/                    # Código React/TypeScript
│   ├── components/         # Componentes reutilizáveis
│   ├── pages/             # Páginas da aplicação
│   ├── hooks/             # Hooks customizados React
│   ├── store/             # Estado global
│   └── types/             # Definições TypeScript
├── electron/               # Código do processo principal
│   ├── main.ts            # Janela principal e IPC
│   ├── preload.ts         # Context bridge
│   └── database.ts        # Camada de dados (JSON)
├── scripts/               # Scripts de build e hooks
│   ├── patch-builder.js   # Patch para Windows
│   ├── monitor-api-usage.js    # Hook Devin - Monitor API
│   ├── track-usage.js          # Hook Devin - Track Usage
│   └── session-start.js        # Hook Devin - Session Start
├── .devin/                # Configuração hooks Devin
│   └── hooks.v1.json     # Hooks para monitoramento
├── public/                # Arquivos estáticos
└── release/               # Executáveis gerados (pós-build)
```

## 🔧 Configuração

### Variáveis de Ambiente

O projeto não requer variáveis de ambiente específicas, mas você pode configurar:

- **DEVIN_PROJECT_ROOT**: Diretório raiz do projeto (automático)
- **DEVIN_SESSION_ID**: ID da sessão atual (automático)

### Configuração de Hooks Devin

O projeto inclui hooks automáticos para o Devin CLI que monitoram o consumo de APIs:

1. **Monitoramento de Chamadas MCP**: Detecta automaticamente chamadas a APIs via MCP
2. **Rastreamento de Comandos**: Monitora comandos curl/CLI que envolvem APIs
3. **Alertas de Cota**: Notifica quando approaching limites configurados
4. **Contexto Automático**: Injeta informações sobre consumo durante o desenvolvimento

Os hooks são ativados automaticamente ao iniciar uma sessão Devin no diretório do projeto.

## 📊 Armazenamento de Dados

A aplicação utiliza armazenamento em JSON local:

- **Windows**: `%APPDATA%\quote-ia-manager\quoteiamanager.json`
- **Linux**: `~/.config/quote-ia-manager/quoteiamanager.json`
- **Mac**: `~/Library/Application Support/quote-ia-manager/quoteiamanager.json`

### Backup dos Dados

Para backup, simplesmente copie o arquivo JSON mencionado acima.

## 🐛 Troubleshooting

### Problemas Comuns

**1. Erro "Visual Studio Build Tools required"**
- Solução: O projeto usa JSON em vez de SQLite justamente para evitar este problema no Windows

**2. Porta 5173 já está em uso**
- Solução: Feche outras aplicações ou altere a porta no Vite config

**3. Electron não inicia**
- Solução: Verifique se o servidor Vite está rodando antes de iniciar o Electron

**4. Hooks não funcionam**
- Solução: Verifique se está no diretório do projeto e use `/hooks` no Devin para verificar configuração

### Logs e Debug

- Logs do Electron: Console do processo principal
- Logs do Renderer: F12 na aplicação
- Logs dos Hooks: Terminal onde o Devin está rodando

## 🔄 Desenvolvimento

### Scripts Disponíveis

```bash
npm run electron:dev      # Modo dev completo
npm run electron:build    # Build para produção
npm run dev              # Apenas frontend dev
npm run build            # Apenas frontend build
npm run preview          # Preview do build
npm run postinstall      # Patch automático (pós npm install)
```

### Adicionando Novos Providers

1. Edite `electron/database.ts`
2. Adicione o provider no array `seedProviders` ou `newProviders`
3. Defina quota, tipo e cor
4. Reinicie a aplicação

### Personalizando Tema

O tema é configurável via interface:
- Light/Dark/System
- Cores seguindo Tailwind CSS
- Respeita configuração do sistema operacional

## 📦 Distribuição

### Windows

Executável gerado em `release/quote-ia-manager-x.x.x.exe` (portable)

### Linux

AppImage gerado em `release/quote-ia-manager-x.x.x.AppImage`

### Mac

DMG gerado em `release/quote-ia-manager-x.x.x.dmg`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## 📄 Licença

MIT License - veja arquivo LICENSE para detalhes

## 🔗 Links Úteis

- [Documentação Electron](https://www.electronjs.org/docs)
- [Documentação Vite](https://vitejs.dev/)
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)
- [Documentação Devin CLI](https://cli.devin.ai/docs)

## 📈 Suporte

Se encontrar problemas:

1. Verifique os logs conforme seção Troubleshooting
2. Confirme se Node.js 18+ está instalado
3. Tente limpar node_modules e reinstalar: `rm -rf node_modules && npm install`
4. Abra uma issue no repositório com detalhes do erro

---

**Desenvolvido com ❤️ para ajudar você a controlar seu consumo de APIs de IA!**