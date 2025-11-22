# 🔍 Teste de Busca de Imagens do Google

## ✅ Credenciais Configuradas

Você já tem as credenciais configuradas no `.env`:
```
GOOGLE_API_KEY=AIzaSyB_oExZBwpquG5IhJ1UldEhMkwII5XHtwA
GOOGLE_CX=d794ee53b22334fc6
```

---

## 🧪 Como Testar

### **1. Testar no Servidor (SSH):**

```bash
# Conectar no servidor
ssh root@138.68.255.122

# Ir para o diretório
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# Ver os logs em tempo real
pm2 logs obuxixogospel --lines 100
```

### **2. Testar na Interface:**

1. Acesse: https://www.obuxixogospel.com.br/dashboard/posts/novo
2. Clique em **"Biblioteca de Mídia"**
3. Clique na aba **"Buscar no Google"**
4. Digite: **"silas malafaia"**
5. Clique em **"Buscar Imagens"**

---

## 🔍 O Que Verificar nos Logs

Procure por estas mensagens:

### ✅ **Sucesso:**
```
Query limpa para Google: silas malafaia
Imagens do Google encontradas: 10
  ✅ Alta qualidade: 8
  ⚠️ Baixa qualidade (thumbnails): 2
```

### ❌ **Erro - API Key Inválida:**
```
Erro ao buscar imagens no Google: Request failed with status code 403
⚠️ Google API não configurada, usando fallback Picsum
```

### ❌ **Erro - CX Inválido:**
```
Erro ao buscar imagens no Google: Invalid Value
```

### ❌ **Erro - Quota Excedida:**
```
Erro ao buscar imagens no Google: Quota exceeded
```

---

## 🔧 Possíveis Problemas e Soluções

### **Problema 1: API Key ou CX Inválidos**

**Verificar:**
```bash
# No servidor
cat .env | grep GOOGLE
```

**Solução:**
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Verifique se a API Key está ativa
3. Verifique se a **Custom Search API** está habilitada

**Habilitar Custom Search API:**
1. https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Clique em **"Ativar"**

### **Problema 2: CX (Search Engine ID) Incorreto**

**Verificar CX:**
1. Acesse: https://programmablesearchengine.google.com/controlpanel/all
2. Clique no seu mecanismo de busca
3. Copie o **"Search engine ID"**
4. Atualize no `.env`:

```bash
# No servidor
nano .env
# Altere: GOOGLE_CX=SEU_ID_AQUI
```

### **Problema 3: Quota Excedida**

O Google Custom Search tem limite **GRATUITO**:
- **100 buscas/dia** (grátis)
- Depois disso: **$5 por 1.000 buscas**

**Verificar uso:**
https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas

**Solução Temporária:**
O código já tem fallback automático para **Picsum** (imagens genéricas).

### **Problema 4: Restrições de Domínio**

**Verificar se a API Key tem restrições:**
1. https://console.cloud.google.com/apis/credentials
2. Clique na sua API Key
3. Em **"Restrições de aplicativo"**, selecione:
   - ✅ **"Nenhuma"** (mais fácil)
   - OU **"Referenciadores HTTP"** e adicione: `*.obuxixogospel.com.br/*`

---

## 🧪 Teste Manual da API

Execute este comando no servidor para testar diretamente:

```bash
# Testar busca de imagens
curl "https://www.googleapis.com/customsearch/v1?key=AIzaSyB_oExZBwpquG5IhJ1UldEhMkwII5XHtwA&cx=d794ee53b22334fc6&q=silas%20malafaia&searchType=image&num=5"
```

### ✅ **Resposta de Sucesso:**
```json
{
  "items": [
    {
      "title": "Silas Malafaia...",
      "link": "https://exemplo.com/imagem.jpg",
      "image": {
        "thumbnailLink": "https://...",
        "contextLink": "https://..."
      }
    }
  ]
}
```

### ❌ **Resposta de Erro:**
```json
{
  "error": {
    "code": 403,
    "message": "The request is missing a valid API key."
  }
}
```

---

## 🔄 Reiniciar Após Mudanças

```bash
# Reiniciar PM2
pm2 restart obuxixogospel

# Ver logs
pm2 logs obuxixogospel --lines 50
```

---

## 📊 Monitorar Uso da API

1. Acesse: https://console.cloud.google.com/apis/dashboard
2. Selecione seu projeto
3. Veja **"Custom Search API"** → **"Quotas"**
4. Monitore quantas buscas você fez hoje

---

## 💡 Alternativas se a Quota Acabar

### **Opção 1: Usar Bing Image Search (Grátis)**
- 1.000 buscas/mês grátis
- https://www.microsoft.com/en-us/bing/apis/bing-image-search-api

### **Opção 2: Usar Unsplash API (Grátis)**
- 50 buscas/hora grátis
- https://unsplash.com/developers

### **Opção 3: Usar Pexels API (Grátis)**
- 200 buscas/hora grátis
- https://www.pexels.com/api/

---

## 🎯 Resumo do Fluxo

```
Usuário digita "silas malafaia"
         ↓
Frontend: buscarImagensGoogle()
         ↓
POST /api/ia/buscar-imagens-google
         ↓
AIService.buscarImagensGoogle(query)
         ↓
Google Custom Search API
         ↓
Retorna 10 imagens
         ↓
Exibe na interface
```

---

## ✅ Checklist de Verificação

- [ ] `.env` tem `GOOGLE_API_KEY` e `GOOGLE_CX`
- [ ] Custom Search API está habilitada no Google Cloud
- [ ] API Key não tem restrições de domínio (ou tem o domínio correto)
- [ ] Quota não foi excedida (< 100 buscas/dia)
- [ ] PM2 foi reiniciado após mudanças no `.env`
- [ ] Logs do PM2 mostram a busca sendo executada

---

**Teste agora e me avise o que aparece nos logs!** 🚀
