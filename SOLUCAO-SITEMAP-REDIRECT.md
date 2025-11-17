# ✅ SOLUÇÃO: News Sitemap Redirecionando

## 🎯 Problema Identificado

O handler 404 (linha 1262 do `app.js`) está redirecionando `/news-sitemap.xml` para `/` porque:

1. A configuração `404_redirect_enabled` está como `'true'` no banco
2. O handler 404 captura QUALQUER rota não encontrada
3. As rotas de sitemap estão corretas, mas o banco pode não ter sido atualizado

## ✅ Solução Definitiva

Execute estes comandos **NO SERVIDOR DE PRODUÇÃO**:

### 1️⃣ Conectar via SSH
```bash
ssh root@seu-servidor
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
```

### 2️⃣ Atualizar o Código
```bash
git pull origin main
```

### 3️⃣ Criar Arquivo .env
```bash
nano .env
```

Cole:
```env
PORT=3000
NODE_ENV=production
SITE_URL=https://www.obuxixogospel.com.br
SESSION_SECRET=obuxixo-gospel-2025-MUDE-ISSO-PARA-ALGO-SEGURO
```

Salve: `Ctrl+O`, Enter, `Ctrl+X`

### 4️⃣ Desativar Redirecionamento 404

```bash
mysql -u obuxixogospel -p
```

Digite a senha e execute:
```sql
USE obuxixogospel;

-- Verificar configuração atual
SELECT chave, valor FROM configuracoes_sistema WHERE chave LIKE '404%';

-- Desativar redirecionamento
UPDATE configuracoes_sistema SET valor = 'false' WHERE chave = '404_redirect_enabled';

-- Confirmar
SELECT chave, valor FROM configuracoes_sistema WHERE chave = '404_redirect_enabled';

exit;
```

### 5️⃣ Reiniciar PM2
```bash
pm2 restart obuxixogospel
pm2 logs obuxixogospel --lines 20
```

### 6️⃣ Testar
```bash
# Teste 1: Local (Node.js direto)
curl http://localhost:3000/news-sitemap.xml

# Teste 2: Externo (através do Nginx/Apache)
curl https://www.obuxixogospel.com.br/news-sitemap.xml
```

## 📊 Resultado Esperado

Você deve ver um XML assim:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://www.obuxixogospel.com.br/noticias/titulo-artigo</loc>
    <news:news>
      <news:publication>
        <news:name>Obuxixo Gospel</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>2025-11-17T22:00:00.000Z</news:publication_date>
      <news:title>Título do Artigo</news:title>
    </news:news>
  </url>
</urlset>
```

## 🔍 Verificação Adicional

### Se Ainda Redirecionar, Verifique o Nginx/Apache

**Nginx:**
```bash
cat /etc/nginx/sites-available/www.obuxixogospel.com.br
```

Deve ter algo assim:
```nginx
server {
    listen 80;
    server_name www.obuxixogospel.com.br obuxixogospel.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Apache (.htaccess):**
```bash
cat .htaccess
```

Deve ter:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
</IfModule>
```

## 🚀 Após Funcionar

### 1. Cadastrar no Google News Publisher Center
1. Acesse: https://publishercenter.google.com/
2. Clique em "Adicionar publicação"
3. Digite: `www.obuxixogospel.com.br`
4. Em "Sitemaps", adicione: `https://www.obuxixogospel.com.br/news-sitemap.xml`
5. Aguarde aprovação (2-4 semanas)

### 2. Adicionar no Google Search Console
1. Acesse: https://search.google.com/search-console
2. Vá em "Sitemaps"
3. Adicione: `https://www.obuxixogospel.com.br/news-sitemap.xml`
4. Clique em "Enviar"

### 3. Verificar Robots.txt
```bash
curl https://www.obuxixogospel.com.br/robots.txt
```

Deve mostrar:
```txt
User-agent: *
Allow: /

Sitemap: https://www.obuxixogospel.com.br/sitemap.xml
Sitemap: https://www.obuxixogospel.com.br/news-sitemap.xml

# Disallow admin areas
Disallow: /dashboard/
Disallow: /login
Disallow: /api/
```

## 🎯 Benefícios Após Configurar

✅ **Indexação Ultra-Rápida**: Artigos aparecem no Google em minutos  
✅ **Visibilidade no Google News**: Aparece na aba "Notícias"  
✅ **Top Stories**: Chance de aparecer nos destaques  
✅ **Tráfego Qualificado**: Leitores interessados em notícias gospel  
✅ **Credibilidade**: Ser listado no Google News aumenta autoridade  

## 📈 Monitoramento

Depois de configurar, monitore:

```bash
# Ver quantos artigos estão no news sitemap
curl https://www.obuxixogospel.com.br/news-sitemap.xml | grep -c "<url>"

# Ver logs de acesso ao sitemap
pm2 logs obuxixogospel | grep "news-sitemap"

# Verificar no Google Search Console
# https://search.google.com/search-console
# Sitemaps > news-sitemap.xml > Ver detalhes
```

## 🔧 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| 301 Redirect | Desativar `404_redirect_enabled` no banco |
| 404 Not Found | Verificar se código foi atualizado (`git pull`) |
| 500 Error | Verificar logs (`pm2 logs obuxixogospel`) |
| XML vazio | Verificar se há artigos publicados nas últimas 48h |
| URL errada no XML | Verificar `SITE_URL` no `.env` |

## ✅ Checklist Final

- [ ] Código atualizado com `git pull origin main`
- [ ] Arquivo `.env` criado com `SITE_URL=https://www.obuxixogospel.com.br`
- [ ] Configuração `404_redirect_enabled` = `false` no banco
- [ ] PM2 reiniciado com `pm2 restart obuxixogospel`
- [ ] Teste local funciona: `curl http://localhost:3000/news-sitemap.xml`
- [ ] Teste externo funciona: `curl https://www.obuxixogospel.com.br/news-sitemap.xml`
- [ ] Sitemap cadastrado no Google Search Console
- [ ] Site cadastrado no Google News Publisher Center

## 🎉 Pronto!

Seu site agora está 100% configurado para Google News! 🚀

Artigos novos serão indexados automaticamente em minutos após a publicação.
