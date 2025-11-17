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
git commit -m "Implementação de questionários dinâmicos e override de competência"
git push -u origin main


# SUBIR PARA DO GIT SERVIDOR
# 1. Corrigir ownership do Git
git config --global --add safe.directory /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 2. Puxar atualizações
git pull origin main

# 3. Verificar status das migrations
npx sequelize-cli db:migrate:status

# 4. Executar apenas migrations pendentes
npx sequelize-cli db:migrate

# 5. (Opcional) Executar seed do favicon se necessário
npx sequelize-cli db:seed --seed 20251116220000-favicon-config.js

# 6. Reiniciar PM2 (já foi feito, mas pode repetir)
pm2 restart obuxixogospel

# 7. Ver logs para verificar se está tudo OK
pm2 logs obuxixogospel --lines 50


