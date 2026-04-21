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

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

### Build

```bash
# Build para produção
npm run build
```

## 🏗️ Arquitetura

```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação
├── services/      # Lógica de negócio
├── utils/         # Utilitários
├── types/         # Definições de TypeScript
└── styles/        # Estilos globais
```

## 📚 Documentação

- [Documentação Completa](./docs/README.md)
- [API Reference](./docs/api.md)
- [Guia de Contribuição](./CONTRIBUTING.md)
- [Código de Conduta](./CODE_OF_CONDUCT.md)

## 🌿 GitFlow

Este projeto segue o modelo [GitFlow](docs/GITFLOW.md) para gestão de branches:

- 🏷️ **main**: Produção (protegida)
- 🌿 **develop**: Integração (protegida)
- ✨ **feature/***: Novas funcionalidades
- 🐛 **bugfix/***: Correções de bugs
- 🔥 **hotfix/***: Correções críticas
- 📦 **release/***: Preparação de releases

### Como Contribuir:
1. Fork o repositório
2. Crie branch: `git checkout -b feature/sua-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/sua-feature`
5. Abra PR para `develop`

## 🤝 Como Contribuir

Contribuições são sempre bem-vindas! Por favor, leia nosso [Guia de Contribuição](./CONTRIBUTING.md) para detalhes sobre nosso código de conduta e o processo para enviar pull requests.

## 🐛 Reportando Bugs

Se você encontrou um bug, por favor:

1. Verifique se já existe uma [issue aberta](https://github.com/username/quoteIAmanager/issues)
2. Se não, [abra uma nova issue](https://github.com/username/quoteIAmanager/issues/new) descrevendo:
   - O problema encontrado
   - Passos para reproduzir
   - Comportamento esperado
   - Ambiente (SO, Node.js versão, etc.)

## 💡 Sugestões de Funcionalidades

Temos sugestões para melhorar o projeto? [Abra uma issue](https://github.com/username/quoteIAmanager/issues/new) com a label "enhancement".

## 🗺️ Roadmap

- [ ] Versão 1.1 - Melhorias de performance
- [ ] Versão 1.2 - Novas funcionalidades
- [ ] Versão 2.0 - Refatoração completa

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](./LICENSE) para detalhes.

## 👥 Autores

- **Contribuidores** - *Desenvolvimento inicial* - [GitHub](https://github.com/username)

## 🙏 Agradecimentos

- A toda comunidade open source que torna este projeto possível
- Aos contribuidores que ajudam a melhorar o código diariamente

## 📞 Contato

- **Email**: contato@exemplo.com
- **GitHub**: https://github.com/username/quoteIAmanager
- **Issues**: https://github.com/username/quoteIAmanager/issues

---

⭐ Se este projeto te ajudou, por favor considere deixar uma estrela!
