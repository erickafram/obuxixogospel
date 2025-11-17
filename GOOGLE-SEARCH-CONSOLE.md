# 🔍 Google Search Console - Guia de Configuração

## ✅ O que foi corrigido no Sitemap

### Problema Identificado:
- O sitemap estava usando `/noticia/` para TODOS os artigos
- Não respeitava as rotas corretas baseadas na categoria
- Categorias antigas (g1, ge, gshow) não existem mais no banco

### Solução Implementada:
```javascript
const categoryRoutes = {
  'g1': 'noticia',
  'noticias': 'noticia',
  'ge': 'musica',
  'musica': 'musica',
  'gshow': 'evento',
  'eventos': 'evento',
  'quem': 'ministerio',
  'ministerios': 'ministerio',
  'valor': 'estudo',
  'estudos': 'estudo',
  'politicia': 'noticia',
  'tecnologia': 'noticia'
};
```

Agora cada artigo usa a rota correta baseada em sua categoria!

---

## 📋 Categorias Atuais no Banco de Dados

| ID | Nome | Slug | Rota no Site |
|----|------|------|--------------|
| 1 | Notícias | noticias | `/noticia/` |
| 2 | Música | musica | `/musica/` |
| 9 | Políticia | politicia | `/noticia/` |
| 10 | Tecnologia | tecnologia | `/noticia/` |

---

## 🚀 Como Submeter o Sitemap ao Google

### 1. **Acessar o Google Search Console**
```
https://search.google.com/search-console
```

### 2. **Selecionar a Propriedade**
- Clique em `www.obuxixogospel.com.br`

### 3. **Ir para Sitemaps**
- No menu lateral esquerdo, clique em **"Sitemaps"**

### 4. **Adicionar Novo Sitemap**
- No campo "Adicionar um novo sitemap", digite:
```
sitemap.xml
```
- Clique em **"ENVIAR"**

### 5. **Aguardar Processamento**
- O Google levará algumas horas/dias para processar
- Status aparecerá como "Êxito" quando concluído

---

## 🔄 Forçar Reindexação de URLs Específicas

### Método 1: Inspeção de URL
1. No Google Search Console, clique em **"Inspeção de URL"** (topo)
2. Cole a URL completa do artigo:
```
https://www.obuxixogospel.com.br/noticia/titulo-do-artigo
```
3. Clique em **"Solicitar indexação"**
4. Aguarde confirmação

### Método 2: Solicitar Indexação em Lote
1. Vá em **"Sitemaps"**
2. Clique no sitemap enviado
3. Clique em **"Reenviar sitemap"**

---

## 📊 Verificar Status de Indexação

### Ver Páginas Indexadas:
1. Google Search Console > **"Cobertura"**
2. Veja quantas páginas estão:
   - ✅ Válidas
   - ⚠️ Com avisos
   - ❌ Com erros
   - 🔍 Excluídas

### Ver URLs Específicas:
```
site:obuxixogospel.com.br
```
Digite isso no Google para ver todas as páginas indexadas.

### Ver URL Específica:
```
site:obuxixogospel.com.br/noticia/titulo-do-artigo
```

---

## ⚡ Acelerar Indexação de Novos Artigos

### 1. **Ping do Google**
Quando publicar um novo artigo, faça:
```
https://www.google.com/ping?sitemap=https://www.obuxixogospel.com.br/sitemap.xml
```

### 2. **Compartilhar nas Redes Sociais**
- Facebook
- Twitter
- Instagram
- WhatsApp

O Google rastreia links compartilhados!

### 3. **Links Internos**
- Sempre linke artigos novos em artigos antigos
- Use "Artigos Relacionados"
- Adicione na homepage

---

## 🛠️ Troubleshooting

### ❌ "Sitemap não pôde ser lido"
**Solução:**
1. Verifique se o sitemap está acessível:
```
https://www.obuxixogospel.com.br/sitemap.xml
```
2. Deve retornar XML válido
3. Se não funcionar, reinicie o servidor:
```bash
pm2 restart obuxixogospel
```

### ❌ "URL não encontrada (404)"
**Causa:** A URL no sitemap não existe no site

**Solução:**
1. Verifique se o artigo está publicado
2. Verifique se a URL está correta
3. Teste a URL no navegador

### ❌ "Enviado, mas não indexado"
**Causas Comuns:**
- Conteúdo duplicado
- Conteúdo de baixa qualidade
- Página muito nova (aguarde alguns dias)
- Problemas de rastreamento

**Solução:**
1. Aguarde 7-14 dias
2. Melhore o conteúdo
3. Adicione mais links internos
4. Compartilhe nas redes sociais

### ❌ "Bloqueado por robots.txt"
**Solução:**
Verifique o robots.txt:
```
https://www.obuxixogospel.com.br/robots.txt
```

Deve permitir:
```
Allow: /noticia/
Allow: /categoria/
Allow: /busca
```

---

## 📈 Monitoramento Contínuo

### Verificar Semanalmente:
- [ ] Número de páginas indexadas
- [ ] Erros de rastreamento
- [ ] Desempenho de busca
- [ ] Cliques e impressões

### Verificar Mensalmente:
- [ ] Palavras-chave com melhor desempenho
- [ ] Taxa de cliques (CTR)
- [ ] Posição média nos resultados
- [ ] Páginas com mais tráfego

---

## 🎯 URLs Importantes

| Recurso | URL |
|---------|-----|
| **Sitemap** | https://www.obuxixogospel.com.br/sitemap.xml |
| **Robots.txt** | https://www.obuxixogospel.com.br/robots.txt |
| **Google Search Console** | https://search.google.com/search-console |
| **Teste de Rich Results** | https://search.google.com/test/rich-results |
| **PageSpeed Insights** | https://pagespeed.web.dev/ |

---

## 📝 Checklist de SEO

### ✅ Configuração Básica
- [x] Sitemap.xml configurado
- [x] Robots.txt configurado
- [x] Google Search Console verificado
- [x] Sitemap submetido ao Google

### ✅ Para Cada Novo Artigo
- [ ] Título otimizado (50-60 caracteres)
- [ ] Meta descrição (150-160 caracteres)
- [ ] URL amigável (sem números/timestamps)
- [ ] Imagem com alt text
- [ ] Links internos para outros artigos
- [ ] Compartilhar nas redes sociais
- [ ] Solicitar indexação no GSC (opcional)

### ✅ Manutenção Mensal
- [ ] Verificar erros no GSC
- [ ] Atualizar artigos antigos
- [ ] Adicionar links internos
- [ ] Verificar páginas não indexadas
- [ ] Analisar palavras-chave

---

## 🔗 Recursos Úteis

- [Documentação do Google Search Console](https://support.google.com/webmasters/)
- [Guia de SEO do Google](https://developers.google.com/search/docs)
- [Teste de Dados Estruturados](https://search.google.com/test/rich-results)
- [Google Analytics](https://analytics.google.com/)

---

**Última Atualização:** 17/11/2025
**Responsável:** Sistema Obuxixo Gospel
