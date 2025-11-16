# 📡 Documentação da API - Clone Globo.com

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 📰 Articles (Notícias)

#### 1. Listar Todas as Notícias
```http
GET /api/articles
```

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 12)

**Exemplo:**
```
GET /api/articles?page=1&limit=10
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "titulo": "Brasil registra crescimento econômico...",
      "descricao": "PIB cresce 2,5%...",
      "conteudo": "<p>...</p>",
      "imagem": "https://...",
      "categoria": "g1",
      "subcategoria": "Economia",
      "autor": "Redação Globo",
      "dataPublicacao": "2024-01-15T10:00:00.000Z",
      "tags": ["economia", "PIB"],
      "urlAmigavel": "brasil-registra-crescimento-1234567890",
      "destaque": true,
      "views": 1250
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "pages": 4
  }
}
```

#### 2. Obter Notícia por Slug
```http
GET /api/articles/:slug
```

**Exemplo:**
```
GET /api/articles/brasil-registra-crescimento-1234567890
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "titulo": "Brasil registra crescimento econômico...",
    "descricao": "PIB cresce 2,5%...",
    "conteudo": "<p>...</p>",
    "imagem": "https://...",
    "categoria": "g1",
    "views": 1251
  }
}
```

#### 3. Filtrar por Categoria
```http
GET /api/articles/categoria/:categoria
```

**Categorias disponíveis:**
- `g1` - Jornalismo
- `ge` - Esportes
- `gshow` - Entretenimento
- `quem` - Celebridades
- `valor` - Economia
- `globoplay` - Streaming

**Query Parameters:**
- `page` (opcional): Número da página
- `limit` (opcional): Itens por página

**Exemplo:**
```
GET /api/articles/categoria/g1?page=1&limit=6
```

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 6,
    "total": 18,
    "pages": 3
  }
}
```

#### 4. Buscar Notícias
```http
GET /api/articles/search
```

**Query Parameters:**
- `q` (obrigatório): Termo de busca
- `page` (opcional): Número da página
- `limit` (opcional): Itens por página

**Exemplo:**
```
GET /api/articles/search?q=economia&page=1&limit=10
```

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### 5. Obter Notícia em Destaque
```http
GET /api/articles/destaque
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "titulo": "Brasil registra crescimento econômico...",
    "destaque": true
  }
}
```

#### 6. Criar Notícia
```http
POST /api/articles
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "titulo": "Nova notícia importante",
  "descricao": "Descrição breve da notícia",
  "conteudo": "<p>Conteúdo completo em HTML</p>",
  "imagem": "https://exemplo.com/imagem.jpg",
  "categoria": "g1",
  "subcategoria": "Política",
  "autor": "João Silva",
  "tags": ["política", "brasil"],
  "destaque": false
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "titulo": "Nova notícia importante",
    "urlAmigavel": "nova-noticia-importante-1234567890",
    "dataPublicacao": "2024-01-15T14:30:00.000Z"
  }
}
```

#### 7. Atualizar Notícia
```http
PUT /api/articles/:id
```

**Body:**
```json
{
  "titulo": "Título atualizado",
  "descricao": "Nova descrição"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "titulo": "Título atualizado",
    "dataAtualizacao": "2024-01-15T15:00:00.000Z"
  }
}
```

#### 8. Deletar Notícia
```http
DELETE /api/articles/:id
```

**Resposta:**
```json
{
  "success": true,
  "message": "Notícia deletada com sucesso"
}
```

---

### 🏷️ Categories (Categorias)

#### 1. Listar Todas as Categorias
```http
GET /api/categorias
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "nome": "G1",
      "slug": "g1",
      "cor": "#C1121F",
      "icone": "📰",
      "descricao": "Jornalismo e notícias"
    },
    {
      "_id": "...",
      "nome": "GE",
      "slug": "ge",
      "cor": "#28A745",
      "icone": "⚽",
      "descricao": "Esportes"
    }
  ]
}
```

#### 2. Obter Categoria por Slug
```http
GET /api/categorias/:slug
```

**Exemplo:**
```
GET /api/categorias/g1
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "nome": "G1",
    "slug": "g1",
    "cor": "#C1121F",
    "icone": "📰",
    "descricao": "Jornalismo e notícias"
  }
}
```

---

## 🎨 Códigos de Cores das Categorias

| Categoria | Cor | Hex |
|-----------|-----|-----|
| G1 | Vermelho | #C1121F |
| GE | Verde | #28A745 |
| GShow | Laranja | #FF8C42 |
| Quem | Vinho | #8B3A62 |
| Valor | Azul | #1F4788 |
| GloboPlay | Roxo | #7B2CBF |

---

## ❌ Tratamento de Erros

### Erro 404 - Não Encontrado
```json
{
  "success": false,
  "message": "Notícia não encontrada"
}
```

### Erro 400 - Requisição Inválida
```json
{
  "success": false,
  "message": "Dados inválidos"
}
```

### Erro 500 - Erro do Servidor
```json
{
  "success": false,
  "message": "Erro interno do servidor"
}
```

---

## 🧪 Exemplos de Uso

### JavaScript (Fetch API)
```javascript
// Listar artigos
fetch('http://localhost:3000/api/articles')
  .then(res => res.json())
  .then(data => console.log(data));

// Buscar
fetch('http://localhost:3000/api/articles/search?q=brasil')
  .then(res => res.json())
  .then(data => console.log(data));

// Criar artigo
fetch('http://localhost:3000/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    titulo: 'Nova notícia',
    descricao: 'Descrição',
    conteudo: '<p>Conteúdo</p>',
    imagem: 'https://...',
    categoria: 'g1'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL (PowerShell)
```powershell
# GET
curl http://localhost:3000/api/articles

# POST
curl -X POST http://localhost:3000/api/articles `
  -H "Content-Type: application/json" `
  -d '{\"titulo\":\"Nova notícia\",\"descricao\":\"Teste\",\"conteudo\":\"<p>Conteúdo</p>\",\"imagem\":\"https://...\",\"categoria\":\"g1\"}'

# PUT
curl -X PUT http://localhost:3000/api/articles/ID `
  -H "Content-Type: application/json" `
  -d '{\"titulo\":\"Título atualizado\"}'

# DELETE
curl -X DELETE http://localhost:3000/api/articles/ID
```

### Axios (Node.js)
```javascript
const axios = require('axios');

// GET
const articles = await axios.get('http://localhost:3000/api/articles');
console.log(articles.data);

// POST
const newArticle = await axios.post('http://localhost:3000/api/articles', {
  titulo: 'Nova notícia',
  descricao: 'Descrição',
  conteudo: '<p>Conteúdo</p>',
  imagem: 'https://...',
  categoria: 'g1'
});
console.log(newArticle.data);
```

---

## 🔐 Autenticação

**Nota**: Atualmente a API não possui autenticação implementada. Para produção, recomenda-se:

1. Implementar JWT (JSON Web Tokens)
2. Proteger rotas POST, PUT, DELETE
3. Adicionar middleware de autenticação
4. Criar sistema de usuários e permissões

---

## 📊 Rate Limiting

**Nota**: Não há rate limiting implementado. Para produção, considere:

- Usar `express-rate-limit`
- Limitar requisições por IP
- Implementar cache com Redis

---

## 🚀 Performance

**Dicas**:
- Use paginação sempre que possível
- Implemente cache para endpoints frequentes
- Otimize queries do MongoDB com índices
- Use CDN para imagens

---

## 📝 Changelog

### v1.0.0 (2024)
- ✅ CRUD completo de artigos
- ✅ Listagem de categorias
- ✅ Sistema de busca
- ✅ Paginação
- ✅ Filtro por categoria
- ✅ Notícias em destaque
