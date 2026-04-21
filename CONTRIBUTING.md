# Contribuindo para Quote Ia Manager

Obrigado pelo seu interesse em contribuir com o Quote Ia Manager! Este documento guia você através do processo de contribuição.

## 📋 Código de Conduta

Este projeto segue nosso [Código de Conduta](./CODE_OF_CONDUCT.md). Por favor, leia e siga estas diretrizes em todas as suas interações.

## 🚀 Processo de Desenvolvimento

### 1. Setup do Ambiente

```bash
# Fork o repositório
git clone https://github.com/SEU_USERNAME/quoteIAmanager.git
cd quoteIAmanager

# Instale as dependências
npm install

# Crie uma branch para sua feature
git checkout -b feature/sua-feature
```

### 2. Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Execute os testes
npm test

# Verifique o linting
npm run lint
```

### 3. Padrões de Código

#### TypeScript

- Use **descrições claras** para variáveis e funções
- Mantenha **funções pequenas** e com responsabilidade única
- Use **TypeScript** quando disponível para type safety
- Siga o **ESLint** configurado no projeto

#### Estilo

- Use **2 espaços** para indentação
- Mantenha **linhas com menos de 80 caracteres**
- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes e componentes

#### Commits

Use o formato de [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar nova funcionalidade X
fix: corrigir bug no componente Y
docs: atualizar documentação
style: ajustar formatação do código
refactor: refatorar função Z
test: adicionar testes para W
chore: atualizar dependências
```

### 4. Processo de Pull Request

1. **Teste suas alterações**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

2. **Atualize sua branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/sua-feature
   git rebase main
   ```

3. **Crie o Pull Request**
   - Use um **título descritivo**
   - **Descreva suas alterações** no corpo
   - **Referencie issues relacionadas**
   - **Adicione screenshots** para mudanças visuais

4. **Aguarde a revisão**
   - Responda aos feedbacks rapidamente
   - Faça as alterações solicitadas
   - Mantenha o PR atualizado

## 🐛 Reportando Bugs

### Como Reportar

1. **Verifique issues existentes** antes de criar uma nova
2. **Use o template de bug report** disponível
3. **Forneça informações detalhadas**:
   - Ambiente (SO, Node.js versão, navegador)
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots quando aplicável

### Labels de Issues

- `bug`: Problemas no funcionamento
- `enhancement`: Sugestões de melhorias
- `documentation`: Problemas na documentação
- `good first issue**: Bom para iniciantes
- `help wanted**: Precisa de ajuda

## 💡 Sugestões de Funcionalidades

### Antes de Sugerir

1. **Verifique o roadmap** do projeto
2. **Procure issues relacionadas**
3. **Considere o escopo** do projeto

### Como Sugerir

1. **Abra uma issue** com label `enhancement`
2. **Descreva o problema** que sua sugestão resolve
3. **Explique a solução** proposta
4. **Considere alternativas** e trade-offs

## 🧪 Testes

### Tipos de Testes

- **Unit Tests**: Testam unidades individuais
- **Integration Tests**: Testam integração entre componentes
- **E2E Tests**: Testam fluxos completos do usuário

### Escrevendo Testes

```typescript
// Exemplo de teste
describe('ComponentName', () => {
  it('deve renderizar corretamente', () => {
    // Arrange
    const props = { /* ... */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Cobertura

- Mantenha **cobertura acima de 80%**
- Teste **casos de borda**
- Teste **fluxos de erro**

## 📖 Documentação

### Tipos de Documentação

- **Code Comments**: Explique lógica complexa
- **README.md**: Visão geral do projeto
- **API Docs**: Documentação de APIs
- **Guides**: Tutoriais e how-tos

### Escrevendo Documentação

- Use **linguagem clara e concisa**
- Inclua **exemplos práticos**
- Mantenha **documentação atualizada**
- Use **diagramas** quando útil

## 🏆 Reconhecimento

Contribuidores serão reconhecidos em:

- **README.md**: Seção de contribuidores
- **Release Notes**: Menção nas notas de versão
- **Contributors.md**: Página dedicada

## 📞 Ajuda

Se precisar de ajuda para contribuir:

- **Abra uma issue** com label `question`
- **Participe das discussões**
- **Contate os mantenedores**

---

Obrigado por contribuir! 🎉
