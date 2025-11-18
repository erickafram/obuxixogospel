# 🎯 SEO Dinâmico - Configurações do Banco de Dados

## ✅ O que foi implementado:

### 1. **Meta Tags Dinâmicas**
As meta tags SEO da home agora vêm do banco de dados (`configuracoes_sistema`):

- `site_title` → `<title>` e Open Graph title
- `site_description` → `<meta name="description">` e Open Graph description  
- `site_keywords` → `<meta name="keywords">`

### 2. **Arquivos Modificados**

#### `app.js` (linha ~800)
```javascript
// Buscar configurações SEO do banco
const seoConfig = await SystemConfig.findAll({
  where: {
    chave: {
      [sequelize.Sequelize.Op.in]: ['site_title', 'site_description', 'site_keywords']
    }
  }
});

const seoData = {};
seoConfig.forEach(config => {
  seoData[config.chave] = config.valor;
});

// Passar para a view
res.render('index', {
  // ... outros dados
  seo: seoData
});
```

#### `views/partials/header.ejs`
```html
<!-- Antes (hardcoded) -->
<title>Obuxixo Gospel - Portal de Notícias Gospel...</title>

<!-- Depois (dinâmico) -->
<title><%= typeof seo !== 'undefined' && seo.site_title ? seo.site_title : 'Obuxixo Gospel...' %></title>
```

### 3. **Migration Criada**
`migrations/20251118000000-add-seo-configs.js`

Adiciona 3 configurações no banco:
- `site_title`
- `site_description`
- `site_keywords`

---

## 🚀 Como Usar

### 1. **Rodar a Migration**
```bash
npx sequelize-cli db:migrate
```

### 2. **Editar no Dashboard**
Acesse: https://www.obuxixogospel.com.br/dashboard/configuracoes

Procure por:
- **site_title** - Título do site
- **site_description** - Descrição do site
- **site_keywords** - Palavras-chave

### 3. **Alterar os Valores**
Edite diretamente no painel e salve. As mudanças aparecem imediatamente na home!

---

## 📋 Fallback

Se as configurações não existirem no banco, o sistema usa valores padrão:
- Título: "Obuxixo Gospel - Portal de Notícias Gospel e Entretenimento Cristão"
- Descrição: "Portal de notícias gospel com as últimas novidades..."
- Keywords: "notícias gospel, música gospel, eventos gospel..."

---

## 🎯 Benefícios

✅ **Centralizado** - Todas as configurações em um só lugar  
✅ **Fácil de editar** - Sem precisar mexer no código  
✅ **SEO otimizado** - Google indexa as informações corretas  
✅ **Consistente** - Mesmas informações em title, OG e Twitter  

---

## 📝 Próximos Passos (Opcional)

Você pode adicionar mais configurações dinâmicas:
- `og_image` - Imagem padrão do Open Graph
- `twitter_handle` - @usuario do Twitter
- `google_analytics_id` - ID do Google Analytics
- `facebook_app_id` - ID do app do Facebook

Basta adicionar na migration e usar no template!
