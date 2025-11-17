# 📰 Google News - Por que algumas notícias não aparecem?

## 🔍 **Situação Atual**

### ✅ **Notícias Indexadas no Google News:**
- Elizeu Rodrigues responde a fãs de fofoca (há 10h)
- Missionária Susana Chenadad (há 9h)
- Assembleia de Deus inova (há 10h)
- Mistério na Mata Fechada (há 10h)
- Pastor Elizeu Rodrigues devolve cachê (há 10h)
- Apóstolo Ailton Novaes (há 10h)
- Pastora expõe influência tóxica (há 10h)

### ❌ **Notícias NÃO Indexadas:**
- Pesquisa revela que 56% dos pastores sofrem com depressão
- Evangélicos chegam a 26,9% da população brasileira em 2025
- Profeta interrompe show no UMADC 2025

---

## 📊 **Por que isso acontece?**

### 1. **Tempo de Indexação**
O Google News demora entre **2 a 24 horas** para indexar novas notícias.

**Linha do tempo:**
```
Publicação → 2-6h → Crawl inicial → 6-12h → Análise de relevância → 12-24h → Aparece no Google News
```

### 2. **Algoritmo de Relevância**

O Google News prioriza notícias com:

| Fator | Peso | Exemplo |
|-------|------|---------|
| **Nome conhecido** | ⭐⭐⭐⭐⭐ | "Elizeu Rodrigues" = alta relevância |
| **Engajamento rápido** | ⭐⭐⭐⭐ | Cliques nas primeiras horas |
| **Palavras-chave trending** | ⭐⭐⭐ | "Fofoca", "Polêmica", "Escândalo" |
| **Título chamativo** | ⭐⭐⭐ | "Devolve cachê após ser denunciado" |
| **Estatísticas genéricas** | ⭐⭐ | "56% dos pastores" = menos atrativo |

### 3. **Estrutura Técnica**

#### ✅ **O que você JÁ tem:**
- ✅ Schema.org NewsArticle
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ Meta tags SEO
- ✅ Sitemap XML

#### ❌ **O que está FALTANDO:**
- ❌ URLs canônicas ainda usam `/noticia/` (hardcoded)
- ❌ Falta de `article:tag` para palavras-chave
- ❌ Falta de `news_keywords` meta tag

---

## 🔧 **Correções Necessárias**

### 1. **Corrigir URLs Canônicas**

**Problema atual:**
```html
<!-- article-head.ejs linha 25 -->
<link rel="canonical" href="http://localhost:3000/noticia/titulo-do-artigo">
```

**Deveria ser:**
```html
<link rel="canonical" href="http://localhost:3000/noticias/titulo-do-artigo">
                                                    ^^^^^^^^ (categoria dinâmica)
```

### 2. **Adicionar Meta Tags para Google News**

```html
<!-- Google News Keywords -->
<meta name="news_keywords" content="evangélicos, brasil, religião, gospel">

<!-- Article Tags -->
<meta property="article:tag" content="Evangélicos">
<meta property="article:tag" content="Brasil">
<meta property="article:tag" content="Pesquisa">
```

### 3. **Melhorar Títulos para SEO**

#### ❌ **Títulos Genéricos (baixa indexação):**
```
Pesquisa revela que 56% dos pastores sofrem com depressão
```

#### ✅ **Títulos Otimizados (alta indexação):**
```
ALERTA: 56% dos pastores evangélicos sofrem com depressão no Brasil
Elizeu Rodrigues RESPONDE fãs do Fuxico Gospel após polêmica
URGENTE: Profeta interrompe show e gera revolta no UMADC 2025
```

**Por quê?**
- Palavras em CAPS chamam atenção
- Verbos de ação ("RESPONDE", "REVELA", "ALERTA")
- Contexto geográfico ("no Brasil")
- Senso de urgência ("URGENTE", "ALERTA")

---

## 📈 **Estratégias para Melhorar Indexação**

### 1. **Publicar no Horário Certo**

| Horário | Engajamento | Google News |
|---------|-------------|-------------|
| 06h-09h | ⭐⭐⭐⭐⭐ | Melhor horário |
| 12h-14h | ⭐⭐⭐⭐ | Bom |
| 18h-21h | ⭐⭐⭐ | Médio |
| 22h-05h | ⭐⭐ | Baixo |

### 2. **Usar Palavras-chave Trending**

Ferramentas:
- Google Trends: https://trends.google.com.br
- Buscar por: "evangélicos", "gospel", "pastor", "igreja"

### 3. **Engajamento Inicial**

Primeiras **2 horas** são críticas:
- Compartilhar no Instagram/Facebook
- Enviar para grupos de WhatsApp
- Notificar seguidores

### 4. **Atualizar Notícias**

Google News prioriza notícias **atualizadas**:
```javascript
// Adicionar "Atualização" no início do artigo
article.conteudo = `
<div class="article-update">
  <strong>Atualização (${new Date().toLocaleString('pt-BR')}):</strong>
  Novas informações sobre o caso...
</div>
${article.conteudo}
`;
```

---

## 🎯 **Checklist de Otimização**

### Para CADA notícia publicada:

- [ ] Título chamativo com palavras-chave
- [ ] Descrição com 150-160 caracteres
- [ ] Imagem de alta qualidade (1200x630px)
- [ ] Publicar entre 06h-09h
- [ ] Compartilhar nas redes sociais imediatamente
- [ ] Adicionar tags relevantes
- [ ] Verificar URL canônica correta
- [ ] Testar Schema.org no Google Rich Results Test

### Ferramentas de Teste:

1. **Rich Results Test**
   ```
   https://search.google.com/test/rich-results
   ```
   Cole a URL do artigo e verifique se o Schema está correto.

2. **Google Search Console**
   ```
   https://search.google.com/search-console
   → Inspeção de URL
   → Colar URL do artigo
   → Solicitar indexação
   ```

3. **PageSpeed Insights**
   ```
   https://pagespeed.web.dev/
   ```
   Velocidade afeta indexação!

---

## 📝 **Exemplo de Notícia Otimizada**

### ❌ **Antes (baixa indexação):**
```
Título: Pesquisa revela dados sobre pastores
Descrição: Uma pesquisa mostrou informações sobre pastores no Brasil.
Tags: pesquisa, pastores
```

### ✅ **Depois (alta indexação):**
```
Título: ALERTA: 56% dos pastores evangélicos sofrem com depressão no Brasil, revela pesquisa
Descrição: Estudo inédito aponta que mais da metade dos líderes religiosos enfrentam problemas de saúde mental. Especialistas alertam para necessidade de apoio psicológico.
Tags: pastores, depressão, saúde mental, evangélicos, brasil, pesquisa, igreja
Keywords: pastor depressão, saúde mental pastor, evangélicos brasil, pesquisa religiosa
```

---

## 🚀 **Próximos Passos**

### Imediato (hoje):
1. Corrigir URLs canônicas no `article-head.ejs`
2. Adicionar meta tag `news_keywords`
3. Solicitar reindexação no Google Search Console

### Curto prazo (esta semana):
1. Otimizar títulos das notícias não indexadas
2. Adicionar sistema de tags dinâmicas
3. Implementar atualização automática de `lastmod` no sitemap

### Médio prazo (este mês):
1. Criar sistema de notificações push
2. Implementar RSS feed otimizado para Google News
3. Adicionar Google Publisher Center

---

## 📊 **Monitoramento**

### Métricas para acompanhar:

| Métrica | Ferramenta | Meta |
|---------|-----------|------|
| Tempo de indexação | Google Search Console | < 6 horas |
| Posição no Google News | Busca manual | Top 10 |
| CTR (taxa de cliques) | Search Console | > 5% |
| Impressões | Search Console | Crescimento 20%/mês |

### Como verificar:
```bash
# 1. Verificar se está indexado
site:obuxixogospel.com.br "título da notícia"

# 2. Verificar no Google News
https://news.google.com/search?q=obuxixogospel

# 3. Verificar sitemap
https://www.obuxixogospel.com.br/sitemap.xml
```

---

## ⚠️ **Erros Comuns**

### 1. **Publicar e esquecer**
❌ Publicou e não compartilhou
✅ Publicar + compartilhar + monitorar

### 2. **Títulos muito longos**
❌ "Pesquisa inédita revela que mais de 56% dos pastores evangélicos brasileiros sofrem com depressão e ansiedade"
✅ "ALERTA: 56% dos pastores evangélicos sofrem com depressão no Brasil"

### 3. **Não atualizar conteúdo**
❌ Publicou uma vez e nunca mais mexeu
✅ Atualizar com novas informações

### 4. **Ignorar mobile**
❌ Site lento no celular
✅ Site rápido e responsivo

---

## 🎓 **Recursos Adicionais**

- [Google News Publisher Center](https://publishercenter.google.com/)
- [Schema.org NewsArticle](https://schema.org/NewsArticle)
- [Google Search Central](https://developers.google.com/search)
- [Web.dev - SEO](https://web.dev/learn/seo/)

---

**Criado em:** 17/11/2025  
**Última atualização:** 17/11/2025  
**Status:** 🟡 Em otimização
