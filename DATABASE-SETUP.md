# 🗄️ Configuração do Banco de Dados MySQL

## 📋 Pré-requisitos

- WAMP/XAMPP instalado e rodando
- MySQL ativo na porta 3306
- Node.js instalado

## 🚀 Passo a Passo

### 1. Criar o Banco de Dados

Abra o phpMyAdmin ou MySQL Workbench e execute:

```sql
CREATE DATABASE obuxixo_gospel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ou via linha de comando:

```bash
mysql -u root -p
CREATE DATABASE obuxixo_gospel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

### 2. Configurar Credenciais

Edite o arquivo `config/config.json` se necessário:

```json
{
  "development": {
    "username": "root",
    "password": "",  // Sua senha do MySQL
    "database": "obuxixo_gospel",
    "host": "127.0.0.1",
    "port": 3306,
    "dialect": "mysql"
  }
}
```

### 3. Executar Migrations

As migrations criam as tabelas no banco de dados:

```bash
npx sequelize-cli db:migrate
```

**Resultado esperado:**
```
Sequelize CLI [Node: 22.15.0, CLI: 6.6.3, ORM: 6.37.7]

Loaded configuration file "config\config.json".
Using environment "development".
== 20251116044241-create-articles: migrating =======
== 20251116044241-create-articles: migrated (0.123s)
```

### 4. Executar Seeds (Dados de Exemplo)

Os seeds populam o banco com dados de teste:

```bash
npx sequelize-cli db:seed:all
```

**Resultado esperado:**
```
Sequelize CLI [Node: 22.15.0, CLI: 6.6.3, ORM: 6.37.7]

Loaded configuration file "config\config.json".
Using environment "development".
== 20251116044453-demo-articles: seeding =======
== 20251116044453-demo-articles: seeded (0.089s)
```

### 5. Verificar no Banco

Abra o phpMyAdmin e verifique:
- Tabela `articles` criada ✅
- 10 artigos inseridos ✅
- Índices criados ✅

## 📊 Estrutura da Tabela Articles

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | Chave primária (auto increment) |
| titulo | VARCHAR(255) | Título da notícia |
| descricao | TEXT | Descrição curta |
| conteudo | LONGTEXT | Conteúdo completo (HTML) |
| imagem | VARCHAR(500) | URL da imagem |
| categoria | VARCHAR(50) | g1, ge, gshow, quem, valor |
| subcategoria | VARCHAR(100) | Subcategoria opcional |
| url_amigavel | VARCHAR(300) | Slug único para URL |
| autor | VARCHAR(100) | Nome do autor |
| visualizacoes | INT | Contador de views |
| destaque | BOOLEAN | Notícia em destaque |
| publicado | BOOLEAN | Status de publicação |
| data_publicacao | DATETIME | Data de publicação |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Data de atualização |

## 🔄 Comandos Úteis

### Desfazer última migration
```bash
npx sequelize-cli db:migrate:undo
```

### Desfazer todas as migrations
```bash
npx sequelize-cli db:migrate:undo:all
```

### Desfazer seeds
```bash
npx sequelize-cli db:seed:undo:all
```

### Criar nova migration
```bash
npx sequelize-cli migration:generate --name nome-da-migration
```

### Criar novo seed
```bash
npx sequelize-cli seed:generate --name nome-do-seed
```

## 🔧 Atualizar app.js

Agora você precisa atualizar o `app.js` para usar o Sequelize ao invés do MongoDB.

### Remover MongoDB
```javascript
// REMOVER estas linhas:
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/globo', {...});
```

### Adicionar Sequelize
```javascript
// ADICIONAR no topo:
const { sequelize } = require('./models');

// ADICIONAR antes de app.listen:
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexão com MySQL estabelecida!');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com MySQL:', err);
  });
```

### Atualizar Rotas

**Antes (MongoDB):**
```javascript
const Article = require('./models/Article');
const articles = await Article.find({ categoria: 'g1' });
```

**Depois (Sequelize):**
```javascript
const { Article } = require('./models');
const articles = await Article.findAll({ 
  where: { categoria: 'g1' },
  order: [['dataPublicacao', 'DESC']]
});
```

## 📝 Exemplos de Queries Sequelize

### Buscar todos os artigos
```javascript
const articles = await Article.findAll();
```

### Buscar por categoria
```javascript
const g1Articles = await Article.findAll({
  where: { categoria: 'g1', publicado: true },
  order: [['dataPublicacao', 'DESC']],
  limit: 10
});
```

### Buscar artigo em destaque
```javascript
const destaque = await Article.findOne({
  where: { destaque: true, publicado: true },
  order: [['dataPublicacao', 'DESC']]
});
```

### Buscar por URL amigável
```javascript
const article = await Article.findOne({
  where: { urlAmigavel: 'titulo-da-noticia-123456' }
});
```

### Incrementar visualizações
```javascript
await article.incrementViews();
// ou
await article.increment('visualizacoes');
```

### Criar novo artigo
```javascript
const newArticle = await Article.create({
  titulo: 'Título da Notícia',
  descricao: 'Descrição curta',
  conteudo: '<p>Conteúdo completo</p>',
  imagem: 'https://exemplo.com/imagem.jpg',
  categoria: 'g1',
  subcategoria: 'Eventos',
  autor: 'Redação Obuxixo Gospel'
});
```

### Atualizar artigo
```javascript
await article.update({
  titulo: 'Novo Título',
  descricao: 'Nova descrição'
});
```

### Deletar artigo
```javascript
await article.destroy();
```

## 🎯 Vantagens do MySQL + Sequelize

✅ **Performance**: MySQL é mais rápido para queries complexas
✅ **Relações**: Facilita relacionamentos entre tabelas
✅ **Integridade**: Constraints e validações no banco
✅ **Migrations**: Versionamento do schema
✅ **Seeds**: Dados de teste fáceis
✅ **Índices**: Otimização automática de queries
✅ **Backup**: Ferramentas maduras (mysqldump)
✅ **Hospedagem**: Mais opções de hosting

## 🐛 Troubleshooting

### Erro: "Access denied for user 'root'"
- Verifique a senha no `config/config.json`
- Teste a conexão no phpMyAdmin

### Erro: "Unknown database 'obuxixo_gospel'"
- Execute: `CREATE DATABASE obuxixo_gospel;`

### Erro: "SequelizeConnectionError"
- Verifique se o MySQL está rodando
- Confirme a porta 3306

### Tabela não criada
- Execute: `npx sequelize-cli db:migrate`
- Verifique logs de erro

## 📚 Documentação

- [Sequelize Docs](https://sequelize.org/docs/v6/)
- [Sequelize CLI](https://github.com/sequelize/cli)
- [MySQL Docs](https://dev.mysql.com/doc/)

## ✅ Checklist de Migração

- [ ] MySQL instalado e rodando
- [ ] Banco `obuxixo_gospel` criado
- [ ] Migrations executadas
- [ ] Seeds executados
- [ ] app.js atualizado
- [ ] Rotas atualizadas para Sequelize
- [ ] Testes realizados
- [ ] MongoDB removido (opcional)

Pronto! Seu banco de dados MySQL está configurado! 🎉
