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

## 2. ✅ IMPLEMENTADO: Sistema de Download de Vídeos com 4 Métodos

### Problema Original
```
❌ Método 1 (Cobalt) falhou: Request failed with status code 403
❌ Método 2 (instagram-url-direct) falhou: Request failed with status code 401
❌ Método 3 (insta-fetcher) falhou: Request failed with status code 403
⚠️ Não foi possível transcrever vídeo
```

### Causa
Instagram está bloqueando requisições do servidor de produção com erros 401/403:
- **401 Unauthorized**: Falta de autenticação/cookies válidos
- **403 Forbidden**: IP do servidor pode estar bloqueado ou detectado como bot

### Solução Implementada

O sistema agora tenta **4 métodos diferentes** em sequência:

#### Método 1: Cobalt API (Multi-instâncias)
Tenta 5 instâncias públicas do Cobalt:
- `https://api.cobalt.tools/api/json`
- `https://cobalt.api.wuk.sh/api/json`
- `https://api.server.cobalt.tools/api/json`
- `https://co.wuk.sh/api/json`
- `https://cobalt.tools/api/json`

#### Método 2: instagram-url-direct
Biblioteca Node.js que acessa diretamente a API do Instagram.

#### Método 3: insta-fetcher
Biblioteca alternativa para scraping do Instagram.

#### Método 4: yt-dlp (NOVO - Mais Robusto) ✨
**Último recurso** - Baixa e executa o binário do `yt-dlp` automaticamente:
- Baixa o binário Linux do GitHub na primeira execução
- Salva em `./bin/yt-dlp` (não commitado no Git)
- Executa `yt-dlp -g` para obter URL direta do vídeo
- **Muito mais resiliente** a bloqueios do Instagram

### Como Funciona o yt-dlp

1. **Primeira execução**: Sistema baixa automaticamente o binário do GitHub
2. **Execuções seguintes**: Usa o binário já baixado
3. **Sem dependências**: Binário estático, não precisa instalar nada
4. **Atualização automática**: Pode ser configurado para atualizar periodicamente

### Logs Esperados

```bash
🔄 Tentando método 1: Cobalt API (Multi-instâncias)
   ❌ Todas as instâncias Cobalt falharam
🔄 Tentando método 2: instagram-url-direct
   ❌ Método 2 falhou: Request failed with status code 401
🔄 Tentando método 3: insta-fetcher
   ❌ Método 3 falhou: Request failed with status code 403
🔄 Tentando método 4: yt-dlp
   📦 Baixando yt-dlp... (primeira vez)
   ✅ yt-dlp instalado com sucesso
   🔧 Executando: /path/to/bin/yt-dlp -g --no-warnings "https://instagram.com/..."
   ✅ URL do vídeo obtida
   ✅ Vídeo salvo via yt-dlp
   ✅ Áudio extraído com sucesso
   ✅ Transcrição concluída
```

### Fallback Manual
Se todos os 4 métodos falharem, o sistema mostra:
```
⚠️ Não foi possível transcrever vídeo
Por favor, cole o texto manualmente
```

### Status
✅ **IMPLEMENTADO** - 4 métodos de fallback, incluindo yt-dlp como último recurso

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
