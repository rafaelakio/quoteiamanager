# Contribuindo para Quote Ia Manager

Obrigado pelo seu interesse em contribuir com o Quote Ia Manager! Este documento guia você através do processo de contribuição.

## 📋 Código de Conduta

Este projeto segue nosso [Código de Conduta](./CODE_OF_CONDUCT.md). Por favor, leia e siga estas diretrizes em todas as suas interações.

## 🌿 Fluxo de Trabalho GitFlow

Este projeto utiliza o modelo GitFlow para gestão de branches. Abaixo estão os fluxos padrão para diferentes tipos de trabalho.

### Criar Nova Funcionalidade (Feature)

```bash
# 1. Sincronize com a branch develop
git checkout develop
git pull origin develop

# 2. Crie uma nova branch feature
git checkout -b feature/nova-funcionalidade

# 3. Desenvolva sua funcionalidade
# ... faça suas alterações ...

# 4. Commit com mensagem convencional
git add .
git commit -m "feat: add amazing feature"

# 5. Envie para o repositório remoto
git push origin feature/nova-funcionalidade

# 6. Abra Pull Request: feature/nova-funcionalidade → develop
```

### Correção de Bug (Bugfix)

```bash
# 1. Sincronize com a branch develop
git checkout develop
git pull origin develop

# 2. Crie uma nova branch bugfix
git checkout -b bugfix/corrigir-erro

# 3. Corrija o bug
# ... faça suas correções ...

# 4. Commit com mensagem convencional
git add .
git commit -m "fix: resolve validation error"

# 5. Envie para o repositório remoto
git push origin bugfix/corrigir-erro

# 6. Abra Pull Request: bugfix/corrigir-erro → develop
```

### Hotfix em Produção

```bash
# 1. Sincronize com a branch main
git checkout main
git pull origin main

# 2. Crie uma nova branch hotfix
git checkout -b hotfix/corrigir-critico

# 3. Corrija o problema crítico
# ... faça as correções ...

# 4. Commit com mensagem convencional
git add .
git commit -m "hotfix: fix security vulnerability"

# 5. Merge em main
git checkout main
git merge --no-ff hotfix/corrigir-critico
git tag v1.2.1

# 6. Envie para produção
git push origin main --tags

# 7. Também merge em develop para não perder a correção
git checkout develop
git merge --no-ff hotfix/corrigir-critico
git push origin develop

# 8. Delete a branch hotfix
git branch -d hotfix/corrigir-critico
git push origin --delete hotfix/corrigir-critico
```

### Preparação de Release

```bash
# 1. Crie branch release a partir da develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 2. Finalize a release (atualizar versão, changelog, etc.)
# ... faça os ajustes finais ...

# 3. Commit das alterações de release
git add .
git commit -m "release: prepare version 1.2.0"

# 4. Merge em main
git checkout main
git merge --no-ff release/v1.2.0
git tag v1.2.0

# 5. Merge de volta em develop
git checkout develop
git merge --no-ff release/v1.2.0

# 6. Envie as alterações
git push origin main --tags
git push origin develop

# 7. Delete a branch release
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

## 🏷️ Padrão de Nomes de Branches

- `feature/descricao-descritiva` - Novas funcionalidades
- `bugfix/descricao-descritiva` - Correções de bugs
- `hotfix/descricao-descritiva` - Correções críticas em produção
- `release/vX.Y.Z` - Preparação de releases

### Regras:
- Use **minúsculas** e **hífens** para separar palavras
- Seja **descritivo** e **conciso**
- Use **inglês** para nomes de branches
- Inclua **número da issue** quando aplicável: `feature/123-user-auth`

## 🔄 Fluxo de Pull Requests

### Diretrizes de Merge:

1. **Feature/bugfix branches** → `develop`
   - Requer 1 aprovação
   - CI/CD deve passar
   - Merge com squash ou rebase

2. **Release branches** → `main`
   - Requer 2 aprovações
   - CI/CD deve passar
   - Merge com merge commit (--no-ff)

3. **Hotfix branches** → `main`
   - Requer 2 aprovações (urgência pode reduzir para 1)
   - CI/CD deve passar
   - Merge com merge commit (--no-ff)

### Template de Pull Request:

```markdown
## Descrição
Breve descrição das alterações.

## Tipo de Alteração
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Issue Relacionada
Fixes #123

## Testes
- [ ] Unit tests passando
- [ ] Integration tests passando
- [ ] Manual testing realizado

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Commits seguem conventional commits
- [ ] Documentação atualizada
- [ ] Tests adicionados/atualizados
```

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
