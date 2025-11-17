# 🔧 Fix Production - Category is not defined

## ❌ Erro Atual
```
TypeError: Cannot read properties of undefined (reading 'findOne')
at /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel/app.js:1201:49
```

## ✅ Solução

Execute estes comandos **NO SERVIDOR** via SSH:

```bash
# 1. Navegar para o diretório
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 2. Verificar se o código está atualizado
grep "Category" app.js | head -3
# Deve mostrar: const { sequelize, Article, User, Media, SystemConfig, Page, Category } = require('./models');

# 3. PARAR o PM2 completamente
pm2 stop obuxixogospel

# 4. DELETAR o processo (força recarregar tudo)
pm2 delete obuxixogospel

# 5. INICIAR novamente (recarrega todo o código)
pm2 start app.js --name obuxixogospel

# 6. Salvar configuração
pm2 save

# 7. Ver logs para confirmar
pm2 logs obuxixogospel --lines 30
```

## 🔍 Verificar se Funcionou

1. Acesse: https://www.obuxixogospel.com.br/noticias/evangelicos-chegam-a-26-9-da-populacao-brasileira-em-2025-1763355775947

2. Se ainda der erro, execute:
```bash
# Ver linha 14 do app.js
sed -n '14p' app.js
```

Deve mostrar:
```javascript
const { sequelize, Article, User, Media, SystemConfig, Page, Category } = require('./models');
```

## 🚨 Se AINDA não funcionar

O problema pode ser cache do Node. Execute:

```bash
# 1. Parar PM2
pm2 stop obuxixogospel

# 2. Limpar cache
rm -rf node_modules/.cache

# 3. Reinstalar dependências
npm install --production

# 4. Deletar e recriar processo
pm2 delete obuxixogospel
pm2 start app.js --name obuxixogospel
pm2 save

# 5. Ver logs
pm2 logs obuxixogospel --lines 30
```

## 📊 Status Esperado

Após executar, você deve ver nos logs:
```
✅ Conexão com MySQL estabelecida com sucesso!
🚀 Servidor rodando em http://localhost:3000
```

E **NÃO** deve ver:
```
❌ Category is not defined
❌ Cannot read properties of undefined
```

## 🎯 Teste Final

```bash
# Testar a URL problemática
curl -I https://www.obuxixogospel.com.br/noticias/evangelicos-chegam-a-26-9-da-populacao-brasileira-em-2025-1763355775947
```

Deve retornar:
```
HTTP/1.1 200 OK
```

E **NÃO**:
```
HTTP/1.1 500 Internal Server Error
```

---

**Criado em:** 17/11/2025  
**Erro:** Category is not defined  
**Solução:** pm2 delete + pm2 start (hard restart)
