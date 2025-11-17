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
# 1. Navegar para o diretório do projeto
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel

# 2. Puxar atualizações do GitHub
git pull origin main

# 3. Instalar novas dependências (caso tenha adicionado pacotes novos)
npm install

# 4. Executar migrations (criar tabelas/campos novos)
npx sequelize-cli db:migrate

# 5. (Opcional) Executar seeds apenas se necessário
# npx sequelize-cli db:seed:all

# 6. Reiniciar o servidor Node.js
pm2 restart obuxixogospel
# OU se usar outro gerenciador:
# systemctl restart obuxixogospel


