# Executar migrations
npx sequelize-cli db:migrate

# Executar seeds
npx sequelize-cli db:seed:all

# Desfazer última migration
npx sequelize-cli db:migrate:undo

# Desfazer seeds
npx sequelize-cli db:seed:undo:all

# Criar nova migration
npx sequelize-cli migration:generate --name nome

# Criar novo seed
npx sequelize-cli seed:generate --name nome


SUBIR PROJETO
-- SUBIR PARA GIT
git add .
git commit -m "Fix: Corrigir middleware legacyRedirect para não bloquear URLs AMP válidas"
git push -u origin main


# SUBIR PARA O SERVIDOR (PRODUÇÃO)
# Execute estes comandos no servidor via SSH

# 1. Navegar para o diretório do projeto
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 2. (Primeira vez apenas) Corrigir ownership do Git
git config --global --add safe.directory /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 3. Puxar atualizações do GitHub
git pull origin main

# 4. Instalar novas dependências (se houver)
# IMPORTANTE: Sempre rodar após git pull para pegar novas bibliotecas
npm install --production

# 5. Verificar status das migrations (com NODE_ENV=production)
NODE_ENV=production npx sequelize-cli db:migrate:status

# 6. Executar apenas migrations pendentes (com NODE_ENV=production)
NODE_ENV=production npx sequelize-cli db:migrate

# 7. Reiniciar o servidor Node.js
pm2 restart obuxixogospel

# IMPORTANTE: Sempre usar NODE_ENV=production nos comandos do Sequelize no servidor!

# 8. Ver logs para verificar se está tudo OK
pm2 logs obuxixogospel --lines 30

# 9. Verificar status do PM2
pm2 status

# 10. (Opcional) Limpar logs antigos
# pm2 flush obuxixogospel

# 11. Verificar se há novas migrations
npx sequelize-cli db:migrate:status

# 12. Se houver migrations pendentes, executá-las
npx sequelize-cli db:migrate

Para forçar o cache a ser invalidado
# 2. No servidor SSH
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
git pull origin main

# 3. Reiniciar o servidor Node.js
pm2 restart obuxixogospel



SEM MIGRATION
# Push para o GitHub
git push origin main

# No servidor
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
git checkout -- package.json  # Se houver conflito
git pull origin main
npm install --production
pm2 restart obuxixogospel

# CACHE BUSTING (forçar navegadores a baixar novos CSS/JS)
# Sempre que fizer alterações em CSS/JS, incremente a versão no package.json:
# "version": "1.0.1" -> "1.0.2"
# Isso força todos os navegadores a baixarem os arquivos atualizados!
pm2 restart obuxixogospel

# IMPORTANTE: Verificar se o arquivo .env existe no servidor
# Se não existir, criar com as credenciais corretas:
nano .env
# Copiar o conteúdo do .env local e ajustar as credenciais do banco





## Se o PM2 não reiniciar:
pm2 stop obuxixogospel
pm2 start obuxixogospel
pm2 save

## Ver logs em tempo real:
pm2 logs obuxixogospel --lines 50

## Verificar uso de memória/CPU:
pm2 monit


