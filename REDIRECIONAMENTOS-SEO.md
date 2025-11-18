# 🔀 Sistema de Redirecionamentos SEO

Sistema completo de gerenciamento de redirecionamentos 301/302/307 para URLs antigas ou quebradas.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Como Usar](#como-usar)
3. [Tipos de Redirecionamento](#tipos-de-redirecionamento)
4. [Instalação](#instalação)
5. [API](#api)
6. [Boas Práticas SEO](#boas-práticas-seo)

---

## 🎯 Visão Geral

O sistema permite:
- ✅ Criar redirecionamentos 301 (permanente) ou 302/307 (temporário)
- ✅ Gerenciar URLs antigas/quebradas
- ✅ Rastrear quantas vezes cada redirecionamento foi usado
- ✅ Ativar/desativar redirecionamentos individualmente
- ✅ Importar redirecionamentos em massa via CSV
- ✅ Preservar query strings nas URLs
- ✅ Normalização automática de URLs

---

## 🚀 Como Usar

### Acessar o Dashboard

1. Faça login no dashboard: `/dashboard`
2. Vá em **Configurações** → **Redirecionamentos**
3. Ou acesse diretamente: `/dashboard/configuracoes/redirects`

### Criar Novo Redirecionamento

1. Clique em **"Novo Redirecionamento"**
2. Preencha:
   - **URL Antiga:** `/noticia-antiga` (URL quebrada)
   - **URL Nova:** `/noticia-nova` (URL de destino)
   - **Tipo:** 301 (Permanente) ou 302 (Temporário)
   - **Descrição:** Motivo do redirecionamento (opcional)
3. Clique em **"Salvar"**

### Importar em Massa (CSV)

1. Clique em **"Importar CSV"**
2. Cole no formato: `url_antiga,url_nova,tipo,descricao`
3. Exemplo:
```csv
/noticia-antiga,/noticia-nova,301,Mudança de URL
/post-velho,/post-novo,301,Atualização
/temp,/definitivo,302,Temporário
```

---

## 🔄 Tipos de Redirecionamento

### 301 - Permanente (Recomendado para SEO)
- **Quando usar:** Mudança permanente de URL
- **SEO:** Transfere 90-99% do PageRank
- **Cache:** Navegadores podem cachear
- **Exemplo:** Mudança definitiva de estrutura de URLs

```javascript
/noticia-antiga → /noticia-nova (301)
```

### 302 - Temporário
- **Quando usar:** Mudança temporária
- **SEO:** NÃO transfere PageRank
- **Cache:** Navegadores não cacheiam
- **Exemplo:** Manutenção temporária

```javascript
/pagina-em-manutencao → /pagina-temporaria (302)
```

### 307 - Temporário (Mantém Método)
- **Quando usar:** Igual ao 302, mas mantém método HTTP (POST, etc)
- **SEO:** NÃO transfere PageRank
- **Uso:** APIs e formulários

---

## 💻 Instalação

### 1. Executar Migration

```bash
# Criar tabela de redirecionamentos
npx sequelize-cli db:migrate
```

### 2. Verificar Middleware

O middleware já está configurado em `app.js`:

```javascript
const redirectMiddleware = require('./middleware/redirectMiddleware');
app.use(redirectMiddleware); // ANTES das rotas principais
```

### 3. Testar

1. Crie um redirecionamento no dashboard
2. Acesse a URL antiga no navegador
3. Você será redirecionado automaticamente

---

## 📡 API

### Listar Redirecionamentos

```http
GET /dashboard/configuracoes/redirects?page=1&search=termo
```

### Criar Redirecionamento

```http
POST /api/redirects
Content-Type: application/json

{
  "urlAntiga": "/noticia-antiga",
  "urlNova": "/noticia-nova",
  "tipoRedirecionamento": "301",
  "descricao": "Mudança de URL",
  "ativo": true
}
```

### Atualizar Redirecionamento

```http
PUT /api/redirects/:id
Content-Type: application/json

{
  "urlNova": "/nova-url-atualizada",
  "ativo": true
}
```

### Deletar Redirecionamento

```http
DELETE /api/redirects/:id
```

### Ativar/Desativar

```http
POST /api/redirects/:id/toggle
```

### Importar CSV

```http
POST /api/redirects/import
Content-Type: application/json

{
  "redirects": [
    {
      "urlAntiga": "/old1",
      "urlNova": "/new1",
      "tipo": "301",
      "descricao": "Desc"
    }
  ]
}
```

### Estatísticas

```http
GET /api/redirects/stats
```

---

## 🎯 Boas Práticas SEO

### ✅ O Que Fazer

1. **Use 301 para mudanças permanentes**
   - Transfere autoridade (PageRank)
   - Melhor para SEO

2. **Redirecione para URLs relevantes**
   - Não redirecione tudo para a home
   - Mantenha o contexto do conteúdo

3. **Evite cadeias de redirecionamento**
   ```
   ❌ /url1 → /url2 → /url3
   ✅ /url1 → /url3
   ```

4. **Monitore os acessos**
   - Veja quais redirecionamentos são mais usados
   - Remova os que não são mais necessários

5. **Preserve query strings**
   - O sistema já faz isso automaticamente
   - `/old?utm_source=google` → `/new?utm_source=google`

### ❌ O Que Evitar

1. **Não use 302 para mudanças permanentes**
   - Você perde autoridade SEO

2. **Não crie loops**
   ```
   ❌ /url1 → /url2 → /url1
   ```

3. **Não redirecione para URLs 404**
   - Sempre teste o destino

4. **Não deixe redirecionamentos inativos**
   - Limpe periodicamente

---

## 📊 Monitoramento

### Estatísticas Disponíveis

- **Total de redirecionamentos**
- **Ativos vs Inativos**
- **Total de acessos**
- **Mais usados**
- **Último acesso**

### Como Monitorar

1. Acesse o dashboard de redirecionamentos
2. Veja as estatísticas no topo
3. Ordene por "Acessos" para ver os mais usados
4. Verifique "Último Acesso" para identificar os obsoletos

---

## 🔧 Configuração do 404

Você pode configurar o redirecionamento automático de 404s:

1. Vá em **Configurações** → **AMP**
2. Configure:
   - `404_redirect_enabled`: `true` ou `false`
   - `404_redirect_type`: `301` ou `302`

---

## 🐛 Troubleshooting

### Redirecionamento não funciona

1. **Verifique se está ativo**
   - Dashboard → Status = ON

2. **Verifique a URL antiga**
   - Deve começar com `/`
   - Não inclua domínio

3. **Limpe o cache do navegador**
   - 301 pode ser cacheado
   - Use modo anônimo para testar

4. **Verifique os logs**
   ```bash
   pm2 logs obuxixogospel
   ```
   - Procure por `🔀 Redirecionamento`

### Performance

- O middleware usa índices no banco
- Busca é muito rápida (< 5ms)
- Não afeta performance do site

---

## 📝 Exemplos Práticos

### Exemplo 1: Mudança de Categoria

```javascript
// Antes: /noticias/post-antigo
// Depois: /evangelicos/post-antigo

URL Antiga: /noticias/post-antigo
URL Nova: /evangelicos/post-antigo
Tipo: 301
```

### Exemplo 2: Artigo Atualizado

```javascript
// Artigo foi reescrito com novo slug

URL Antiga: /pastor-joao-silva-morre
URL Nova: /pastor-joao-silva-faleceu-aos-80-anos
Tipo: 301
```

### Exemplo 3: Página Temporária

```javascript
// Evento temporário

URL Antiga: /evento-2024
URL Nova: /eventos
Tipo: 302
```

### Exemplo 4: Redirecionamento Externo

```javascript
// Redirecionar para site externo

URL Antiga: /youtube
URL Nova: https://youtube.com/@obuxixogospel
Tipo: 301
```

---

## 🔒 Segurança

- ✅ Todas as rotas requerem autenticação
- ✅ Validação de URLs
- ✅ Proteção contra loops
- ✅ Sanitização de entrada
- ✅ Rate limiting (via Express)

---

## 📚 Recursos Adicionais

- [Google: Redirecionamentos e SEO](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [MDN: HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [Moz: 301 vs 302](https://moz.com/learn/seo/redirection)

---

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs: `pm2 logs obuxixogospel`
2. Teste em modo anônimo
3. Verifique se a migration foi executada
4. Confirme que o middleware está ativo

---

**Criado em:** 18/11/2025  
**Versão:** 1.0.0  
**Status:** ✅ Produção
