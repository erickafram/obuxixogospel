# Troubleshooting - Problemas Conhecidos e Soluções

## 1. ✅ RESOLVIDO: Imagens do Google sendo rejeitadas

### Problema
```
⚠️ URL ignorada (não é imagem direta): https://encrypted-tbn0.gstatic.com/images?q=...
Imagens do Google encontradas: 0
```

### Causa
A validação de URLs estava muito restritiva e rejeitava URLs de thumbnails do Google (`gstatic.com`).

### Solução
Adicionado `gstatic.com` à lista de domínios confiáveis em `AIService.js`:

```javascript
const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(imageUrl) || 
                        imageUrl.includes('googleusercontent.com') ||
                        imageUrl.includes('ggpht.com') ||
                        imageUrl.includes('gstatic.com'); // ✅ ADICIONADO
```

### Status
✅ **CORRIGIDO** - Commit: `08d68a9`

---

## 2. ⚠️ EM ANDAMENTO: Vídeos do Instagram não transcrevem em Produção

### Problema
```
❌ Método 1 (instagram-url-direct) falhou: Request failed with status code 401
❌ Método 3 (insta-fetcher) falhou: Request failed with status code 403
⚠️ Não foi possível transcrever vídeo
```

### Causa
Instagram está bloqueando requisições do servidor de produção com erros 401/403:
- **401 Unauthorized**: Falta de autenticação/cookies válidos
- **403 Forbidden**: IP do servidor pode estar bloqueado ou detectado como bot

### Por que funciona local mas não em produção?
1. **IP diferente**: Instagram pode ter bloqueado o IP do servidor
2. **Headers diferentes**: Servidor pode estar enviando headers suspeitos
3. **Rate limiting**: Muitas requisições do mesmo IP

### Soluções Possíveis

#### Opção 1: Usar serviço de proxy (RECOMENDADO)
Adicionar um serviço de terceiros que baixa vídeos do Instagram:
- **Cobalt API** (já implementado, mas pode estar falhando)
- **RapidAPI Instagram Downloader**
- **Instaloader** (biblioteca Python via subprocess)

#### Opção 2: Melhorar headers e cookies
```javascript
headers: {
  'User-Agent': 'Instagram 123.0.0.21.114 Android',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'X-IG-App-ID': '936619743392459',
  'X-ASBD-ID': '198387',
  'X-IG-WWW-Claim': '0',
  'Origin': 'https://www.instagram.com',
  'Referer': 'https://www.instagram.com/'
}
```

#### Opção 3: Fallback manual (ATUAL)
Sistema já mostra mensagem para usuário colar texto manualmente:
```
⚠️ Não foi possível transcrever vídeo (pode ser apenas foto): 
Não foi possível baixar o vídeo do Instagram. 
Por favor, cole o texto manualmente.
```

### Workaround Temporário
**Use o campo "Cole o Texto da Postagem"** para adicionar manualmente a transcrição do vídeo quando o download automático falhar.

### Status
⚠️ **EM INVESTIGAÇÃO** - Funciona local, falha em produção

---

## 3. ✅ RESOLVIDO: API Key do Google inválida em Produção

### Problema
```
❌ Erro ao buscar imagens: Request failed with status code 400
API key not valid. Please pass a valid API key.
```

### Causa
O `.env` de produção tinha:
- Espaços ao redor do `=`
- Aspas simples nas chaves
- Credenciais antigas e inválidas

```bash
# ❌ ERRADO
GOOGLE_API_KEY = 'AIzaSyBpOqTvPxzKwYLDqpfFkHvCLqKvPDVEaOw'

# ✅ CORRETO
GOOGLE_API_KEY=AIzaSyB_oExZBwpquG5IhJ1UldEhMkwII5XHtwA
```

### Solução
Corrigir o `.env` de produção:

```bash
# 1. Backup
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# 2. Remover linhas antigas
sed -i '/GOOGLE_API_KEY/d' .env
sed -i '/GOOGLE_CX/d' .env

# 3. Adicionar corretas (SEM ESPAÇOS, SEM ASPAS)
echo "GOOGLE_API_KEY=AIzaSyB_oExZBwpquG5IhJ1UldEhMkwII5XHtwA" >> .env
echo "GOOGLE_CX=d794ee53b22334fc6" >> .env

# 4. Reiniciar PM2
pm2 restart obuxixogospel --update-env

# 5. Testar
node test-google-images.js
```

### Status
⏳ **AGUARDANDO CORREÇÃO NO SERVIDOR**

---

## 4. Comandos Úteis para Diagnóstico

### Verificar variáveis de ambiente
```bash
# Ver todas as variáveis do Google
cat .env | grep GOOGLE

# Ver variáveis carregadas no PM2
pm2 env 0
```

### Testar APIs
```bash
# Testar Google Custom Search
node test-google-images.js

# Ver logs em tempo real
pm2 logs obuxixogospel --lines 50
```

### Reiniciar serviço
```bash
# Reiniciar com reload de env
pm2 restart obuxixogospel --update-env

# Ou parar e iniciar
pm2 stop obuxixogospel
pm2 start app.js --name obuxixogospel
```

---

## 5. Checklist de Deploy

Ao fazer deploy de atualizações:

- [ ] Fazer backup do `.env` atual
- [ ] Puxar atualizações: `git pull origin main`
- [ ] Instalar dependências: `npm install --production`
- [ ] Verificar `.env` (sem espaços, sem aspas)
- [ ] Reiniciar PM2: `pm2 restart obuxixogospel --update-env`
- [ ] Testar APIs: `node test-google-images.js`
- [ ] Verificar logs: `pm2 logs obuxixogospel --lines 50`
- [ ] Testar criação de matéria no dashboard

---

## 6. Contato e Suporte

Se encontrar novos problemas:
1. Verificar logs: `pm2 logs obuxixogospel`
2. Testar localmente primeiro
3. Comparar `.env` local vs produção
4. Verificar se as APIs externas estão funcionando
