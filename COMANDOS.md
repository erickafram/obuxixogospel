# 🎯 Comandos Úteis - Clone Globo.com

## 📦 NPM Scripts

### Instalar Dependências
```bash
npm install
```

### Iniciar Servidor (Desenvolvimento)
```bash
npm run dev
```

### Iniciar Servidor (Produção)
```bash
npm start
```

### Popular Banco de Dados
```bash
npm run seed
```

## 🗄️ MongoDB

### Iniciar MongoDB (Windows)
```powershell
net start MongoDB
```

### Parar MongoDB
```powershell
net stop MongoDB
```

### Acessar MongoDB Shell
```bash
mongosh
```

### Comandos MongoDB Shell
```javascript
use globo-clone
show collections
db.articles.find().pretty()
db.articles.countDocuments()
db.articles.find({ categoria: "g1" }).pretty()
db.articles.findOne({ destaque: true })
db.articles.deleteMany({})
db.categories.deleteMany({})
db.dropDatabase()
```

## 🔍 Testando a API

### Listar Artigos
```powershell
curl http://localhost:3000/api/articles
```

### Buscar
```powershell
curl "http://localhost:3000/api/articles/search?q=brasil"
```

### Por Categoria
```powershell
curl http://localhost:3000/api/articles/categoria/g1
```

### Criar Artigo
```powershell
curl -X POST http://localhost:3000/api/articles -H "Content-Type: application/json" -d "{\"titulo\":\"Teste\",\"descricao\":\"Desc\",\"conteudo\":\"<p>Conteudo</p>\",\"imagem\":\"https://via.placeholder.com/800\",\"categoria\":\"g1\"}"
```

## 🚀 Deploy

### Heroku
```bash
heroku create globo-clone
heroku addons:create mongolab
git push heroku main
```

### Vercel
```bash
vercel
```

## 🛠️ Desenvolvimento

### Limpar node_modules
```bash
rm -r node_modules
npm install
```

### Verificar Portas em Uso (Windows)
```powershell
netstat -ano | findstr :3000
```

### Matar Processo na Porta 3000
```powershell
taskkill /PID NUMERO_PID /F
```
