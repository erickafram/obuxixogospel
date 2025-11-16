# 🚀 Comandos para Subir o Projeto no GitHub

## 📋 Pré-requisitos

1. Ter o Git instalado: https://git-scm.com/downloads
2. Ter uma conta no GitHub
3. Repositório criado: https://github.com/erickafram/obuxixogospel

---

## 🔧 Comandos para Executar

### 1️⃣ Inicializar Git (se ainda não foi feito)

```bash
cd c:\wamp\www\globo
git init
```

### 2️⃣ Adicionar todos os arquivos

```bash
git add .
```

### 3️⃣ Fazer o primeiro commit

```bash
git commit -m "🎉 Primeiro commit: Portal O Buxixo Gospel completo com IA"
```

### 4️⃣ Adicionar o repositório remoto

```bash
git remote add origin https://github.com/erickafram/obuxixogospel.git
```

### 5️⃣ Verificar se o remote foi adicionado

```bash
git remote -v
```

Deve mostrar:
```
origin  https://github.com/erickafram/obuxixogospel.git (fetch)
origin  https://github.com/erickafram/obuxixogospel.git (push)
```

### 6️⃣ Criar branch main (se necessário)

```bash
git branch -M main
```

### 7️⃣ Fazer o push para o GitHub

```bash
git push -u origin main
```

Se pedir autenticação, use seu **Personal Access Token** do GitHub (não a senha).

---

## 🔑 Como Gerar Personal Access Token

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" → "Generate new token (classic)"
3. Dê um nome: "O Buxixo Gospel"
4. Marque: `repo` (acesso total aos repositórios)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (você não verá novamente!)
7. Use o token como senha quando o Git pedir

---

## ✅ Verificar se Subiu

Acesse: https://github.com/erickafram/obuxixogospel

Você deve ver todos os arquivos!

---

## 📝 Commits Futuros

Sempre que fizer alterações:

```bash
# Ver o que mudou
git status

# Adicionar arquivos modificados
git add .

# Fazer commit
git commit -m "Descrição da alteração"

# Enviar para GitHub
git push
```

---

## 🎯 Exemplo de Mensagens de Commit

```bash
git commit -m "✨ Adiciona nova funcionalidade X"
git commit -m "🐛 Corrige bug na extração do Instagram"
git commit -m "📝 Atualiza documentação"
git commit -m "🎨 Melhora layout do dashboard"
git commit -m "⚡ Otimiza busca de imagens"
git commit -m "🔒 Melhora segurança das sessões"
```

---

## ⚠️ Arquivos que NÃO Serão Enviados

O `.gitignore` já está configurado para excluir:
- ✅ `node_modules/` (dependências)
- ✅ `.env` (variáveis de ambiente sensíveis)
- ✅ `*.log` (logs)
- ✅ `public/uploads/*` (uploads de usuários)
- ✅ `.vscode/` (configurações do editor)

---

## 🎊 Pronto!

Seu projeto está no GitHub! 🚀

Agora outras pessoas podem:
- ⭐ Dar estrela no projeto
- 🍴 Fazer fork
- 📥 Clonar e usar
- 🤝 Contribuir com Pull Requests
