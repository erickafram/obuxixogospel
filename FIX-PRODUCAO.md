# Correção de Problemas em Produção

## Problema 1: Banco de Dados não Conecta

### Erro
```
Access denied for user 'root'@'localhost' (using password: NO)
```

### Causa
O arquivo `.env` não existe no servidor de produção ou não está sendo carregado corretamente.

### Solução

**No servidor via SSH:**

```bash
# 1. Navegar para o diretório do projeto
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 2. Verificar se o arquivo .env existe
ls -la .env

# 3. Se não existir, criar o arquivo .env
nano .env
```

**Conteúdo do arquivo `.env` em produção:**

```env
# Servidor
PORT=3000
NODE_ENV=production
SITE_URL=https://www.obuxixogospel.com.br
SESSION_SECRET=obuxixo-gospel-2025-MUDE-ISSO

# Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=obuxixogospel
DB_PASSWORD=@@2025@@Ekb
DB_NAME=obuxixogospel

# MongoDB (legado - não usado atualmente)
MONGODB_URI=mongodb://localhost:27017/globo-clone

# APIs Externas (opcional)
OPENWEATHER_API_KEY=your_api_key_here
```

**Após criar/editar o .env:**

```bash
# 4. Salvar o arquivo (Ctrl+O, Enter, Ctrl+X no nano)

# 5. Verificar permissões do arquivo
chmod 600 .env

# 6. Reiniciar o PM2
pm2 restart obuxixogospel

# 7. Verificar logs
pm2 logs obuxixogospel --lines 50
```

---

## Problema 2: Sitemap não Abre

### URLs Disponíveis

- ✅ `https://www.obuxixogospel.com.br/sitemap.xml`
- ✅ `https://www.obuxixogospel.com.br/news-sitemap.xml` (com hífen)
- ✅ `https://www.obuxixogospel.com.br/news_sitemap.xml` (com underline - adicionado)
- ✅ `https://www.obuxixogospel.com.br/robots.txt`

### Nota
O sitemap só funcionará após o banco de dados estar conectado corretamente.

---

## Checklist de Deploy

Sempre que fizer deploy em produção:

1. ✅ Fazer commit e push no GitHub
2. ✅ No servidor: `git pull origin main`
3. ✅ Instalar dependências: `npm install --production`
4. ✅ **Verificar se o .env existe e está correto**
5. ✅ Executar migrations (se houver): `npx sequelize-cli db:migrate`
6. ✅ Reiniciar PM2: `pm2 restart obuxixogospel`
7. ✅ Verificar logs: `pm2 logs obuxixogospel --lines 30`
8. ✅ Testar o site no navegador

---

## Comandos Úteis

```bash
# Ver status do PM2
pm2 status

# Ver logs em tempo real
pm2 logs obuxixogospel

# Limpar logs antigos
pm2 flush obuxixogospel

# Parar e iniciar novamente
pm2 stop obuxixogospel
pm2 start obuxixogospel

# Salvar configuração do PM2
pm2 save

# Ver variáveis de ambiente carregadas
pm2 env 0
```

---

## Verificar Conexão com Banco de Dados

```bash
# No servidor, testar conexão MySQL
mysql -u obuxixogospel -p obuxixogospel

# Se conectar, o banco está OK
# Se não conectar, verificar credenciais com o provedor de hospedagem
```
