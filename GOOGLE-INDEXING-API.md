# 🚀 Google Indexing API - Indexação Automática

## 📋 **O que é?**

A **Google Indexing API** permite notificar o Google **imediatamente** quando você publica, atualiza ou remove conteúdo.

### **Antes (sem API):**
```
Publicar artigo → Aguardar Google crawlear → 24-48 horas → Indexado
```

### **Depois (com API):**
```
Publicar artigo → API notifica Google → 2-6 horas → Indexado ⚡
```

---

## ⚙️ **Configuração (Passo a Passo)**

### **1. Criar Projeto no Google Cloud**

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Criar Projeto"**
3. Nome: `Obuxixo Gospel Indexing`
4. Clique em **"Criar"**

### **2. Ativar Google Indexing API**

1. No menu lateral: **APIs e Serviços** → **Biblioteca**
2. Buscar: `Indexing API`
3. Clicar em **"Web Search Indexing API"**
4. Clicar em **"ATIVAR"**

### **3. Criar Service Account**

1. Menu lateral: **APIs e Serviços** → **Credenciais**
2. Clicar em **"+ CRIAR CREDENCIAIS"**
3. Selecionar: **"Conta de serviço"**
4. Preencher:
   - **Nome:** `obuxixo-indexing-bot`
   - **ID:** `obuxixo-indexing-bot`
   - **Descrição:** `Bot para indexação automática de artigos`
5. Clicar em **"CRIAR E CONTINUAR"**
6. **Papel:** Selecionar `Editor` (ou criar papel customizado)
7. Clicar em **"CONCLUIR"**

### **4. Gerar Chave JSON**

1. Na lista de contas de serviço, clicar na conta criada
2. Ir para aba **"CHAVES"**
3. Clicar em **"ADICIONAR CHAVE"** → **"Criar nova chave"**
4. Selecionar formato: **JSON**
5. Clicar em **"CRIAR"**
6. Arquivo `obuxixo-indexing-bot-xxxxx.json` será baixado

### **5. Adicionar Service Account no Search Console**

1. Abrir o arquivo JSON baixado
2. Copiar o valor de `"client_email"`:
   ```json
   "client_email": "obuxixo-indexing-bot@projeto-xxxxx.iam.gserviceaccount.com"
   ```
3. Ir para: https://search.google.com/search-console
4. Selecionar propriedade: `obuxixogospel.com.br`
5. Menu lateral: **Configurações** → **Usuários e permissões**
6. Clicar em **"ADICIONAR USUÁRIO"**
7. Colar o email da service account
8. Permissão: **Proprietário**
9. Clicar em **"ADICIONAR"**

### **6. Instalar no Servidor**

#### **No seu computador:**

```bash
# 1. Copiar arquivo JSON para o projeto
# Renomear para: google-service-account.json
# Colocar em: config/google-service-account.json
```

#### **No servidor:**

```bash
# 1. Criar diretório config (se não existir)
mkdir -p /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/config

# 2. Upload do arquivo JSON
# Via FTP/SFTP ou comando scp:
scp google-service-account.json root@seu-servidor:/home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/config/

# 3. Ajustar permissões
chmod 600 /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/config/google-service-account.json

# 4. Instalar dependência
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
npm install googleapis

# 5. Reiniciar servidor
pm2 restart obuxixogospel
```

---

## 🎯 **Como Usar**

### **Indexação Automática (já configurado)**

Quando você publicar um artigo, o sistema automaticamente notifica o Google:

```javascript
// No admin ao publicar artigo
const googleIndexing = require('./services/GoogleIndexingService');
await googleIndexing.requestIndexing('https://www.obuxixogospel.com.br/noticias/titulo-do-artigo');
```

### **Indexação Manual via Script**

```bash
# Criar script de teste
node scripts/test-indexing.js
```

### **Indexação em Lote**

```javascript
const googleIndexing = require('./services/GoogleIndexingService');

const urls = [
  'https://www.obuxixogospel.com.br/noticias/artigo-1',
  'https://www.obuxixogospel.com.br/noticias/artigo-2',
  'https://www.obuxixogospel.com.br/noticias/artigo-3'
];

await googleIndexing.requestBatchIndexing(urls);
```

---

## 📊 **Limites da API**

| Tipo | Limite |
|------|--------|
| **Requisições por dia** | 200 |
| **Requisições por minuto** | 600 |
| **URLs por requisição** | 1 |

**Para seu caso:**
- 10-20 artigos por dia = OK ✅
- Bem abaixo do limite de 200/dia

---

## 🧪 **Testar Configuração**

### **Script de Teste**

Crie: `scripts/test-indexing.js`

```javascript
const googleIndexing = require('../services/GoogleIndexingService');

async function test() {
  console.log('🧪 Testando Google Indexing API...\n');
  
  // Inicializar
  const initialized = await googleIndexing.initialize();
  
  if (!initialized) {
    console.log('❌ Falha ao inicializar');
    return;
  }
  
  // Testar com URL de exemplo
  const testUrl = 'https://www.obuxixogospel.com.br/';
  console.log(`📤 Solicitando indexação de: ${testUrl}\n`);
  
  const result = await googleIndexing.requestIndexing(testUrl);
  
  if (result.success) {
    console.log('✅ Sucesso!');
    console.log('Resposta:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Erro:', result.error);
  }
}

test();
```

**Rodar:**
```bash
node scripts/test-indexing.js
```

**Resultado esperado:**
```
🧪 Testando Google Indexing API...
✅ Google Indexing API inicializada
📤 Solicitando indexação de: https://www.obuxixogospel.com.br/
✅ Indexação solicitada: https://www.obuxixogospel.com.br/
✅ Sucesso!
```

---

## 🔧 **Integração com Sistema de Artigos**

Vou modificar o controller de artigos para usar a API automaticamente:

### **Quando Publicar Artigo:**

```javascript
// controllers/articleController.js
const googleIndexing = require('../services/GoogleIndexingService');

// Após salvar artigo
if (article.publicado) {
  const articleUrl = `${process.env.SITE_URL}/${article.categoria}/${article.urlAmigavel}`;
  
  // Solicitar indexação (não bloqueia)
  googleIndexing.requestIndexing(articleUrl).catch(err => {
    console.error('Erro ao solicitar indexação:', err);
  });
}
```

### **Quando Deletar Artigo:**

```javascript
// Antes de deletar
const articleUrl = `${process.env.SITE_URL}/${article.categoria}/${article.urlAmigavel}`;

// Notificar remoção
await googleIndexing.notifyUrlDeleted(articleUrl);

// Depois deletar
await article.destroy();
```

---

## 📈 **Monitoramento**

### **Ver Logs:**

```bash
pm2 logs obuxixogospel | grep "Indexação"
```

**Exemplo de logs:**
```
✅ Indexação solicitada: https://www.obuxixogospel.com.br/noticias/artigo-novo
✅ Indexação solicitada: https://www.obuxixogospel.com.br/noticias/artigo-atualizado
```

### **Verificar no Search Console:**

1. https://search.google.com/search-console
2. **Cobertura** → Ver URLs indexadas
3. Tempo de indexação deve diminuir de 24-48h para 2-6h

---

## ⚠️ **Importante**

### **Segurança:**

1. ✅ **NUNCA** commitar `google-service-account.json` no Git
2. ✅ Adicionar ao `.gitignore`:
   ```
   config/google-service-account.json
   ```
3. ✅ Permissões do arquivo: `chmod 600`

### **Backup:**

```bash
# Fazer backup do arquivo JSON
cp config/google-service-account.json config/google-service-account.json.backup
```

### **Renovação:**

- Chaves não expiram
- Mas recomenda-se renovar a cada 90 dias
- Criar nova chave e substituir arquivo

---

## 🎯 **Checklist de Instalação**

- [ ] Criar projeto no Google Cloud
- [ ] Ativar Indexing API
- [ ] Criar Service Account
- [ ] Baixar arquivo JSON
- [ ] Adicionar Service Account no Search Console
- [ ] Upload arquivo para servidor
- [ ] Instalar `googleapis`: `npm install googleapis`
- [ ] Testar com script
- [ ] Verificar logs
- [ ] Publicar artigo de teste
- [ ] Verificar indexação no Search Console (2-6h)

---

## 🐛 **Troubleshooting**

### **Erro: "Credenciais não encontradas"**

```bash
# Verificar se arquivo existe
ls -la config/google-service-account.json

# Se não existir, fazer upload novamente
```

### **Erro: "Permission denied"**

```bash
# Verificar se Service Account foi adicionada no Search Console
# Email deve ser: obuxixo-indexing-bot@projeto-xxxxx.iam.gserviceaccount.com
```

### **Erro: "API not enabled"**

```bash
# Verificar se API está ativada:
# https://console.cloud.google.com/apis/library/indexing.googleapis.com
```

### **Erro: "Quota exceeded"**

```bash
# Limite: 200 requisições/dia
# Aguardar 24h ou solicitar aumento de quota
```

---

## 📚 **Recursos**

- [Google Indexing API Docs](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
- [Search Console Help](https://support.google.com/webmasters/answer/9012289)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts)

---

## 💰 **Custos**

**Google Indexing API é GRATUITA!** 🎉

- ✅ 0 custo
- ✅ 200 requisições/dia grátis
- ✅ Suficiente para seu caso

---

**Criado em:** 17/11/2025  
**Versão:** 1.0  
**Status:** 📝 Aguardando configuração
