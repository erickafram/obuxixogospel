# 🚀 Deploy do Google News Sitemap

## ✅ O que foi implementado:
- Rota `/news-sitemap.xml` (artigos das últimas 48h)
- Meta tags Google News nos artigos
- Robots.txt atualizado com referência ao news sitemap

## 🔧 Passos para Deploy no Servidor

### 1. Conectar via SSH
```bash
ssh obuxixogospel@seu-servidor
```

### 2. Navegar para o diretório
```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
```

### 3. Puxar atualizações do GitHub
```bash
git pull origin main
```

### 4. Verificar se o arquivo foi atualizado
```bash
# Verificar se a rota existe no app.js
grep -n "news-sitemap" app.js

# Deve mostrar algo como:
# 631:app.get('/news-sitemap.xml', sitemapController.generateNewsSitemap);
```

### 5. Criar/Atualizar arquivo .env
```bash
nano .env
```

Adicione ou verifique:
```env
PORT=3000
NODE_ENV=production
SITE_URL=https://www.obuxixogospel.com.br
SESSION_SECRET=sua-chave-secreta-aqui
```

Salvar: `Ctrl+O`, `Enter`, `Ctrl+X`

### 6. Reiniciar o servidor
```bash
pm2 restart obuxixogospel
```

### 7. Verificar logs
```bash
pm2 logs obuxixogospel --lines 50
```

### 8. Testar as rotas
```bash
# Testar robots.txt
curl https://www.obuxixogospel.com.br/robots.txt

# Testar sitemap normal
curl https://www.obuxixogospel.com.br/sitemap.xml | head -20

# Testar news sitemap
curl https://www.obuxixogospel.com.br/news-sitemap.xml | head -20
```

## 🧪 Verificação

Acesse no navegador:
- https://www.obuxixogospel.com.br/robots.txt
- https://www.obuxixogospel.com.br/sitemap.xml
- https://www.obuxixogospel.com.br/news-sitemap.xml

## ⚠️ Troubleshooting

### Se ainda redirecionar para home:

1. **Verificar ordem das rotas no app.js**
   ```bash
   grep -n "app.get.*sitemap\|app.get.*/:category" app.js | head -20
   ```
   
   As rotas de sitemap DEVEM vir ANTES das rotas dinâmicas!

2. **Limpar cache do PM2**
   ```bash
   pm2 delete obuxixogospel
   pm2 start ecosystem.config.js
   # OU
   pm2 start app.js --name obuxixogospel
   ```

3. **Verificar se há proxy/nginx na frente**
   ```bash
   # Se houver nginx, verificar configuração
   sudo nano /etc/nginx/sites-available/obuxixogospel
   
   # Procurar por regras que possam estar bloqueando .xml
   ```

4. **Verificar permissões**
   ```bash
   ls -la controllers/sitemapController.js
   # Deve ter permissão de leitura
   ```

## 📋 Checklist Final

- [ ] Git pull executado
- [ ] .env configurado com SITE_URL correto
- [ ] PM2 reiniciado
- [ ] /robots.txt mostra 2 sitemaps
- [ ] /sitemap.xml funciona
- [ ] /news-sitemap.xml funciona (não redireciona)
- [ ] Artigos têm meta tags Google News

## 🎯 Próximo Passo

Após confirmar que tudo funciona, cadastrar no Google News Publisher Center:
https://publishercenter.google.com/
