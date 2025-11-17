# 🏗️ Arquitetura de Rotas Dinâmicas - Obuxixo Gospel

## 📋 Visão Geral

O sistema agora usa **rotas 100% dinâmicas** baseadas nas categorias do banco de dados. Não há mais mapeamentos fixos no código!

---

## ✅ Como Funciona

### 1. **Categorias no Banco de Dados**

```sql
SELECT * FROM categories;
```

| ID | Nome | Slug | Cor |
|----|------|------|-----|
| 1 | Notícias | noticias | #3b82f6 |
| 2 | Música | musica | #8b5cf6 |
| 9 | Políticia | politicia | #ab0707 |
| 10 | Tecnologia | tecnologia | #119c3b |

### 2. **URLs Geradas Automaticamente**

```
https://obuxixogospel.com.br/{slug_categoria}/{slug_artigo}
```

**Exemplos:**
- `https://obuxixogospel.com.br/noticias/pastor-fulano-faz-algo`
- `https://obuxixogospel.com.br/musica/novo-album-lancado`
- `https://obuxixogospel.com.br/politicia/eleicoes-2026`
- `https://obuxixogospel.com.br/tecnologia/novo-app-gospel`

### 3. **Rota Universal**

```javascript
// Captura QUALQUER categoria do banco
app.get('/:categorySlug/:articleSlug', async (req, res, next) => {
  // 1. Verifica se a categoria existe no banco
  const category = await Category.findOne({
    where: { slug: categorySlug }
  });
  
  // 2. Se não existir, passa para o 404
  if (!category) return next();
  
  // 3. Busca o artigo
  const article = await Article.findOne({ 
    where: { 
      urlAmigavel: articleSlug, 
      categoria: categorySlug,
      publicado: true 
    }
  });
  
  // 4. Renderiza a página
  res.render('article', { article, related });
});
```

---

## 🚀 Adicionar Nova Categoria

### Passo 1: Inserir no Banco
```sql
INSERT INTO categories (nome, slug, cor, icone, descricao, created_at, updated_at, ordem) 
VALUES (
  'Testemunhos',           -- Nome exibido
  'testemunhos',           -- Slug para URL
  '#ff6b00',               -- Cor
  'fas fa-heart',          -- Ícone
  'Testemunhos de fé',     -- Descrição
  NOW(),
  NOW(),
  5                        -- Ordem de exibição
);
```

### Passo 2: Criar Artigo
```javascript
// No dashboard, criar artigo com categoria = 'testemunhos'
{
  titulo: "Meu Testemunho de Cura",
  categoria: "testemunhos",  // ← Slug da categoria
  urlAmigavel: "meu-testemunho-de-cura",
  publicado: true
}
```

### Passo 3: URL Funciona Automaticamente! ✨
```
https://obuxixogospel.com.br/testemunhos/meu-testemunho-de-cura
```

**Não precisa editar código!** 🎉

---

## 📂 Estrutura de Arquivos

### `app.js`
```javascript
// Helper para gerar URLs
app.locals.getArticleUrl = function(article) {
  return `/${article.categoria}/${article.urlAmigavel}`;
};

// Rota universal (linha ~1273)
app.get('/:categorySlug/:articleSlug', async (req, res, next) => {
  // Busca categoria no banco
  // Busca artigo
  // Renderiza
});
```

### `controllers/sitemapController.js`
```javascript
// Sitemap usa slug da categoria diretamente
articles.forEach(article => {
  xml += `<loc>${baseUrl}/${article.categoria}/${article.urlAmigavel}</loc>`;
});
```

### `views/` (EJS Templates)
```ejs
<!-- Gerar URL do artigo -->
<a href="<%= getArticleUrl(article) %>">
  <%= article.titulo %>
</a>

<!-- Resultado: /noticias/titulo-do-artigo -->
```

---

## 🔄 Rotas Legadas (Compatibilidade)

### `/noticia/:slug` → Redireciona
```javascript
// URLs antigas redirecionam para a categoria correta
app.get('/noticia/:slug', async (req, res) => {
  const article = await Article.findOne({ 
    where: { urlAmigavel: req.params.slug }
  });
  
  // Redireciona: /noticia/abc → /noticias/abc
  return res.redirect(301, `/${article.categoria}/${article.urlAmigavel}`);
});
```

**Exemplos:**
- `/noticia/pastor-fulano` → `/noticias/pastor-fulano` (301)
- `/musica/novo-album` → `/musica/novo-album` (direto)

---

## 📊 Fluxo de Requisição

```
1. Usuário acessa: /noticias/pastor-fulano
                    ↓
2. Rota universal captura: /:categorySlug/:articleSlug
                    ↓
3. Verifica se categoria 'noticias' existe no banco
                    ↓
4. Busca artigo com urlAmigavel='pastor-fulano' e categoria='noticias'
                    ↓
5. Renderiza página do artigo
```

---

## 🛠️ Manutenção

### ✅ O que FAZER:
- ✅ Adicionar categorias no banco via dashboard
- ✅ Criar artigos com `categoria = slug_da_categoria`
- ✅ Confiar no sistema de rotas dinâmicas

### ❌ O que NÃO fazer:
- ❌ Adicionar mapeamentos fixos no código
- ❌ Criar rotas específicas para cada categoria
- ❌ Hardcodar nomes de categorias

---

## 🔍 Troubleshooting

### Problema: "Categoria não aparece"
**Solução:**
1. Verifique se a categoria existe no banco:
```sql
SELECT * FROM categories WHERE slug = 'nome-categoria';
```
2. Verifique se o artigo tem a categoria correta:
```sql
SELECT categoria FROM articles WHERE id = 123;
```

### Problema: "URL não funciona"
**Solução:**
1. Verifique se o slug está correto (sem espaços, acentos)
2. Verifique se `publicado = true`
3. Teste a URL: `/:categoria/:slug`

### Problema: "Sitemap não atualiza"
**Solução:**
1. Acesse: `https://obuxixogospel.com.br/sitemap.xml`
2. Verifique se as URLs estão corretas
3. Reenvie no Google Search Console

---

## 📈 Benefícios

### Antes (Rotas Fixas):
```javascript
const categoryRoutes = {
  'noticias': 'noticia',
  'musica': 'musica',
  'politicia': 'noticia',  // ← Tinha que adicionar manualmente
  'tecnologia': 'noticia'   // ← Tinha que adicionar manualmente
};
```

❌ Problema: Toda nova categoria = editar código

### Agora (Rotas Dinâmicas):
```javascript
// Busca categoria do banco automaticamente
const category = await Category.findOne({
  where: { slug: categorySlug }
});
```

✅ Solução: Nova categoria = funciona automaticamente!

---

## 🎯 Exemplos de Uso

### Adicionar Categoria "Eventos"
```sql
INSERT INTO categories (nome, slug, cor, created_at, updated_at, ordem) 
VALUES ('Eventos', 'eventos', '#10b981', NOW(), NOW(), 6);
```

### Criar Artigo
```javascript
{
  titulo: "Congresso Gospel 2025",
  categoria: "eventos",
  urlAmigavel: "congresso-gospel-2025",
  publicado: true
}
```

### URL Gerada
```
https://obuxixogospel.com.br/eventos/congresso-gospel-2025
```

### No Sitemap
```xml
<url>
  <loc>https://obuxixogospel.com.br/eventos/congresso-gospel-2025</loc>
  <lastmod>2025-11-17T12:00:00.000Z</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

---

## 📝 Checklist de Nova Categoria

- [ ] Inserir categoria no banco com slug único
- [ ] Definir cor e ícone
- [ ] Criar artigos com a nova categoria
- [ ] Testar URL: `/:slug-categoria/:slug-artigo`
- [ ] Verificar sitemap: `/sitemap.xml`
- [ ] Reenviar sitemap no Google Search Console

---

## 🔗 Arquivos Relacionados

| Arquivo | Responsabilidade |
|---------|------------------|
| `app.js` | Rota universal e helper de URL |
| `controllers/sitemapController.js` | Geração do sitemap |
| `models/Category.js` | Model de categorias |
| `models/Article.js` | Model de artigos |
| `views/article.ejs` | Template do artigo |

---

**Última Atualização:** 17/11/2025  
**Versão:** 2.0 - Rotas Dinâmicas  
**Status:** ✅ Produção
