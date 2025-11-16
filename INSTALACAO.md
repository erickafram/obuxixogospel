# 📋 Guia de Instalação - Clone Globo.com

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** v14 ou superior ([Download](https://nodejs.org/))
- **MongoDB** v4.4 ou superior ([Download](https://www.mongodb.com/try/download/community))
- **Git** (opcional)

## Passo a Passo

### 1. Verificar Instalações

Abra o terminal/PowerShell e verifique:

```bash
node --version
npm --version
```

### 2. Instalar MongoDB

#### Windows:
1. Baixe o MongoDB Community Server
2. Instale com as configurações padrão
3. O MongoDB será instalado como serviço do Windows

#### Verificar MongoDB:
```bash
# No PowerShell como Administrador
net start MongoDB
```

Ou inicie manualmente:
```bash
mongod
```

### 3. Instalar Dependências do Projeto

No diretório do projeto (`c:\wamp\www\globo`):

```bash
npm install
```

Isso instalará:
- express
- mongoose
- ejs
- dotenv
- body-parser
- cors
- morgan
- slugify
- axios

### 4. Configurar Variáveis de Ambiente

O arquivo `.env` já está criado. Verifique se está correto:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/globo-clone
NODE_ENV=development
OPENWEATHER_API_KEY=your_api_key_here
```

### 5. Popular o Banco de Dados

Execute o script de seed para criar dados de exemplo:

```bash
npm run seed
```

Você verá:
```
✅ MongoDB conectado!
🗑️  Banco de dados limpo
✅ Categorias inseridas
✅ Artigos inseridos
🎉 Seed concluído com sucesso!
```

### 6. Iniciar o Servidor

#### Modo Desenvolvimento (com auto-reload):
```bash
npm run dev
```

#### Modo Produção:
```bash
npm start
```

### 7. Acessar a Aplicação

Abra seu navegador e acesse:

```
http://localhost:3000
```

## 🎯 Estrutura de URLs

- **Home**: `http://localhost:3000/`
- **Categoria G1**: `http://localhost:3000/categoria/g1`
- **Categoria GE**: `http://localhost:3000/categoria/ge`
- **Categoria GShow**: `http://localhost:3000/categoria/gshow`
- **Categoria Quem**: `http://localhost:3000/categoria/quem`
- **Categoria Valor**: `http://localhost:3000/categoria/valor`
- **Busca**: `http://localhost:3000/busca?q=termo`
- **API Articles**: `http://localhost:3000/api/articles`
- **API Categorias**: `http://localhost:3000/api/categorias`

## 🔧 Solução de Problemas

### MongoDB não conecta

**Erro**: `MongoNetworkError: connect ECONNREFUSED`

**Solução**:
```bash
# Windows - Iniciar serviço MongoDB
net start MongoDB

# Ou executar manualmente
mongod --dbpath C:\data\db
```

### Porta 3000 já em uso

**Erro**: `EADDRINUSE: address already in use :::3000`

**Solução**: Altere a porta no arquivo `.env`:
```env
PORT=3001
```

### Dependências não instaladas

**Erro**: `Cannot find module 'express'`

**Solução**:
```bash
npm install
```

### Banco de dados vazio

**Solução**: Execute o seed novamente:
```bash
npm run seed
```

## 📡 Testando a API

### Usando o navegador:
```
http://localhost:3000/api/articles
http://localhost:3000/api/articles/destaque
http://localhost:3000/api/categorias
```

### Usando curl (PowerShell):
```powershell
# Listar artigos
curl http://localhost:3000/api/articles

# Buscar
curl "http://localhost:3000/api/articles/search?q=brasil"

# Por categoria
curl http://localhost:3000/api/articles/categoria/g1
```

## 🚀 Próximos Passos

1. **Personalizar dados**: Edite `config/seed.js` e execute `npm run seed`
2. **Adicionar autenticação**: Implemente JWT para rotas administrativas
3. **Integrar API de clima**: Adicione sua chave no `.env`
4. **Deploy**: Configure para Heroku, Vercel ou AWS

## 📞 Suporte

Se encontrar problemas:

1. Verifique se MongoDB está rodando
2. Confirme que todas as dependências foram instaladas
3. Verifique os logs no console
4. Certifique-se de estar no diretório correto

## 🎉 Pronto!

Seu clone do Globo.com está funcionando! Explore as funcionalidades:

✅ Home page com notícias em destaque
✅ Páginas de categorias
✅ Sistema de busca
✅ Páginas de artigos completos
✅ Layout responsivo
✅ API REST completa
