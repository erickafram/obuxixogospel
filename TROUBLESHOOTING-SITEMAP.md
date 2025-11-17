# 🔧 Troubleshooting: News Sitemap Redirecionando

## 🚨 Problema
Ao acessar `https://www.obuxixogospel.com.br/news-sitemap.xml`, o servidor retorna:
```
301 Moved Permanently. Redirecting to /
```

## 🔍 Diagnóstico

### 1️⃣ Verificar se o Servidor Está Atualizado
```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
git status
git log -1 --oneline
```

Se não estiver atualizado:
```bash
git pull origin main
```

### 2️⃣ Verificar Logs do PM2
```bash
pm2 logs obuxixogospel --lines 50
```

Procure por:
- ✅ `📰 Gerando Google News Sitemap...` (significa que a rota foi chamada)
- ❌ Erros de banco de dados
- ❌ Erros de variável de ambiente

### 3️⃣ Verificar Variável de Ambiente
```bash
cat .env | grep SITE_URL
```

Deve retornar:
```
SITE_URL=https://www.obuxixogospel.com.br
```

Se não existir, crie o arquivo `.env`:
```bash
nano .env
```

Cole:
```env
PORT=3000
NODE_ENV=production
SITE_URL=https://www.obuxixogospel.com.br
SESSION_SECRET=sua-chave-secreta-super-forte-aqui
```

### 4️⃣ Testar Localmente (no servidor)
```bash
# Testar diretamente no Node.js (porta 3000)
curl http://localhost:3000/news-sitemap.xml

# Testar através do Nginx/Apache (porta 80)
curl http://localhost/news-sitemap.xml
```

### 5️⃣ Verificar Configuração do Nginx/Apache

**Se usar Nginx:**
```bash
cat /etc/nginx/sites-available/www.obuxixogospel.com.br
```

Procure por regras de `rewrite` ou `return` que possam estar redirecionando `.xml`:
```nginx
# ❌ RUIM - Redireciona tudo
rewrite ^/(.*)$ / permanent;

# ✅ BOM - Permite arquivos XML
location ~ \.xml$ {
    proxy_pass http://localhost:3000;
}
```

**Se usar Apache:**
```bash
cat /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/.htaccess
```

Procure por:
```apache
# ❌ RUIM
RewriteRule ^(.*)$ / [R=301,L]

# ✅ BOM
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_URI} !\.xml$
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### 6️⃣ Verificar Configuração de Redirecionamento 404

O sistema tem uma configuração que redireciona 404 para home. Verifique no banco:

```bash
mysql -u obuxixogospel -p obuxixogospel
```

```sql
SELECT * FROM configuracoes_sistema WHERE chave LIKE '404%';
```

Se `404_redirect_enabled` estiver como `'true'`, isso pode estar causando o problema.

**Solução temporária:**
```sql
UPDATE configuracoes_sistema SET valor = 'false' WHERE chave = '404_redirect_enabled';
```

### 7️⃣ Reiniciar o Servidor
```bash
pm2 restart obuxixogospel
pm2 logs obuxixogospel --lines 20
```

### 8️⃣ Testar Novamente
```bash
curl -I https://www.obuxixogospel.com.br/news-sitemap.xml
```

Deve retornar:
```
HTTP/1.1 200 OK
Content-Type: application/xml
```

## 🎯 Soluções Comuns

### Problema: Nginx está redirecionando
**Solução:** Adicione exceção para arquivos XML no Nginx:

```nginx
location ~ \.(xml|txt)$ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Problema: Variável SITE_URL não está definida
**Solução:** Crie o arquivo `.env` conforme mostrado acima.

### Problema: Código não está atualizado
**Solução:**
```bash
git pull origin main
pm2 restart obuxixogospel
```

### Problema: Redirecionamento 404 está ativo
**Solução:** Desative temporariamente:
```sql
UPDATE configuracoes_sistema SET valor = 'false' WHERE chave = '404_redirect_enabled';
```

## 🧪 Script de Teste

Execute o script de teste para verificar a ordem das rotas:

```bash
node test-sitemap-routes.js
```

Depois teste:
```bash
curl http://localhost:3001/news-sitemap.xml
```

## 📞 Ainda Não Funciona?

Se depois de todos os passos ainda não funcionar, envie os seguintes logs:

```bash
# 1. Status do Git
git log -1 --oneline

# 2. Variáveis de ambiente
cat .env

# 3. Logs do PM2
pm2 logs obuxixogospel --lines 50

# 4. Teste local
curl -I http://localhost:3000/news-sitemap.xml

# 5. Configuração do servidor web
cat /etc/nginx/sites-available/www.obuxixogospel.com.br
# ou
cat /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/.htaccess
```

## ✅ Checklist Final

- [ ] Código atualizado com `git pull`
- [ ] Arquivo `.env` criado com `SITE_URL` correto
- [ ] PM2 reiniciado
- [ ] Teste local funciona (`curl http://localhost:3000/news-sitemap.xml`)
- [ ] Nginx/Apache não está redirecionando
- [ ] Redirecionamento 404 desativado (se necessário)
- [ ] Teste externo funciona (`curl https://www.obuxixogospel.com.br/news-sitemap.xml`)
