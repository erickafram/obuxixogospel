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