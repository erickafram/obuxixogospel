# 🔧 Correção: News Sitemap Redirecionando para Home

## 🚨 Problema Identificado

Quando você acessa `https://www.obuxixogospel.com.br/news-sitemap.xml`, recebe:
```
301 Moved Permanently. Redirecting to /
```

## 🎯 Causa Provável

O sistema tem um **handler 404 com redirecionamento automático** que está capturando a requisição antes de chegar na rota do sitemap.

## ✅ Solução Rápida (5 minutos)

### Passo 1: Conectar no Servidor via SSH
```bash
ssh root@seu-servidor
```

### Passo 2: Ir para o Diretório do Projeto
```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
```

### Passo 3: Atualizar o Código
```bash
git pull origin main
```

### Passo 4: Criar/Verificar o Arquivo .env
```bash
# Verificar se existe
cat .env

# Se não existir, criar
nano .env
```

Cole este conteúdo:
```env
PORT=3000
NODE_ENV=production
SITE_URL=https://www.obuxixogospel.com.br
SESSION_SECRET=obuxixo-gospel-secret-2025-MUDE-PARA-ALGO-MAIS-SEGURO
```

Salve com `Ctrl+O`, Enter, `Ctrl+X`

### Passo 5: Desativar Redirecionamento 404 (Temporário)

Conecte no MySQL:
```bash
mysql -u obuxixogospel -p obuxixogospel
```

Execute:
```sql
-- Ver configuração atual
SELECT * FROM configuracoes_sistema WHERE chave LIKE '404%';

-- Desativar redirecionamento 404
UPDATE configuracoes_sistema 
SET valor = 'false' 
WHERE chave = '404_redirect_enabled';

-- Confirmar
SELECT * FROM configuracoes_sistema WHERE chave = '404_redirect_enabled';

-- Sair
exit;
```

### Passo 6: Reiniciar o PM2
```bash
pm2 restart obuxixogospel
pm2 logs obuxixogospel --lines 20
```

### Passo 7: Testar
```bash
# Teste local (deve retornar XML)
curl http://localhost:3000/news-sitemap.xml

# Teste externo (deve retornar XML)
curl https://www.obuxixogospel.com.br/news-sitemap.xml
```

## 🔍 Verificação Detalhada

### 1. Verificar se a Rota Está Registrada

Adicione logs temporários no `app.js`:

```bash
nano app.js
```

Procure pela linha 631 e adicione um log:
```javascript
app.get('/news-sitemap.xml', (req, res, next) => {
  console.log('🎯 Rota /news-sitemap.xml foi chamada!');
  sitemapController.generateNewsSitemap(req, res, next);
});
```

Salve, reinicie e teste:
```bash
pm2 restart obuxixogospel
curl http://localhost:3000/news-sitemap.xml
pm2 logs obuxixogospel --lines 10
```

Se você ver `🎯 Rota /news-sitemap.xml foi chamada!`, a rota está funcionando!

### 2. Verificar Nginx/Apache

**Se usar Nginx:**
```bash
cat /etc/nginx/sites-available/www.obuxixogospel.com.br | grep -A 10 "location"
```

Procure por regras que possam estar redirecionando:
```nginx
# ❌ PROBLEMA: Redireciona tudo
location / {
    return 301 https://www.obuxixogospel.com.br/;
}

# ✅ SOLUÇÃO: Permitir proxy para Node.js
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Se usar Apache (.htaccess):**
```bash
cat .htaccess
```

Procure por:
```apache
# ❌ PROBLEMA
RewriteRule ^(.*)$ / [R=301,L]

# ✅ SOLUÇÃO
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### 3. Verificar Ordem das Rotas no app.js

As rotas devem estar nesta ordem:

1. **Rotas específicas** (linha 631)
   ```javascript
   app.get('/news-sitemap.xml', ...)
   ```

2. **Rotas dinâmicas** (linha 1145)
   ```javascript
   app.get('/:categorySlug/:articleSlug', ...)
   ```

3. **Handler 404** (linha 1221)
   ```javascript
   app.use((req, res) => { ... })
   ```

## 🎯 Teste Final

Execute todos os testes:

```bash
# 1. Teste direto no Node.js
curl -I http://localhost:3000/news-sitemap.xml
# Esperado: HTTP/1.1 200 OK

# 2. Teste através do Nginx/Apache
curl -I http://localhost/news-sitemap.xml
# Esperado: HTTP/1.1 200 OK

# 3. Teste externo
curl -I https://www.obuxixogospel.com.br/news-sitemap.xml
# Esperado: HTTP/1.1 200 OK

# 4. Ver o conteúdo
curl https://www.obuxixogospel.com.br/news-sitemap.xml | head -20
# Esperado: XML do Google News Sitemap
```

## 📊 Resultado Esperado

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://www.obuxixogospel.com.br/noticias/titulo-do-artigo</loc>
    <news:news>
      <news:publication>
        <news:name>Obuxixo Gospel</news:name>
        <news:language>pt</news:language>
      </news:publication>
      ...
    </news:news>
  </url>
</urlset>
```

## 🚀 Próximos Passos

Depois que funcionar:

1. **Cadastrar no Google News Publisher Center**
   - https://publishercenter.google.com/
   - Adicione: `https://www.obuxixogospel.com.br/news-sitemap.xml`

2. **Verificar no Google Search Console**
   - https://search.google.com/search-console
   - Envie o sitemap: `https://www.obuxixogospel.com.br/news-sitemap.xml`

3. **Reativar Redirecionamento 404 (Opcional)**
   ```sql
   UPDATE configuracoes_sistema 
   SET valor = 'true' 
   WHERE chave = '404_redirect_enabled';
   ```

## 📞 Suporte

Se ainda não funcionar, envie:
```bash
# Logs completos
pm2 logs obuxixogospel --lines 100 > logs.txt

# Configuração do servidor
cat /etc/nginx/sites-available/www.obuxixogospel.com.br > nginx.txt
# ou
cat .htaccess > apache.txt

# Variáveis de ambiente
cat .env > env.txt

# Status do Git
git log -5 --oneline > git.txt
```

## ✅ Checklist

- [ ] Código atualizado (`git pull`)
- [ ] Arquivo `.env` criado com `SITE_URL` correto
- [ ] Redirecionamento 404 desativado
- [ ] PM2 reiniciado
- [ ] Teste local funciona (porta 3000)
- [ ] Teste externo funciona (HTTPS)
- [ ] XML é retornado corretamente
- [ ] Cadastrado no Google News Publisher Center
