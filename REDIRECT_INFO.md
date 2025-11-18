# 🔄 Sistema de Redirecionamento de URLs Antigas

## 📋 **PROBLEMA IDENTIFICADO**

Após recomeçar o site do zero (por causa de vírus), muitas URLs antigas ainda estão indexadas no Google e sendo acessadas por usuários. Isso causa:

- ❌ **Muitos erros 404** nos logs
- ❌ **Perda de tráfego** - usuários chegam e encontram erro
- ❌ **Penalização SEO** - Google penaliza sites com muitos 404s
- ❌ **Desperdício de recursos** - servidor processa requisições inúteis

## ✅ **SOLUÇÃO IMPLEMENTADA**

Criamos um middleware (`legacyRedirectMiddleware.js`) que:

1. **Detecta URLs antigas** usando padrões regex
2. **Redireciona para a home** com status **301** (permanente)
3. **Informa aos motores de busca** que o conteúdo foi movido
4. **Registra em log** para monitoramento

### **Padrões de URLs Redirecionadas:**

```javascript
// Posts antigos no formato /YYYY/MM/DD/titulo/
/^\/\d{4}\/\d{2}\/\d{2}\/.+/

// URLs do WordPress antigo
/^\/wp-content\/.+/
/^\/feed\/?$/

// Sitemaps antigos
/^\/post-sitemap\d*\.xml$/

// Páginas de autor antigas
/^\/author\/.+/

// Tags e categorias antigas
/^\/tag\/.+\/feed\/?$/
/^\/category\/.+\/amp\/?$/

// URLs com /amp/ no final
/\/amp\/?$/
```

## 📊 **EXEMPLOS DE REDIRECIONAMENTO**

### Antes (404):
```
GET /2019/08/26/cidade-biblia-e-encontrada-em-jerusalem/ 404
GET /wp-content/uploads/2018/05/adsbygoogle77.js 404
GET /feed/ 404
GET /author/robertopaulo/page/18/ 404
```

### Depois (301 → Home):
```
GET /2019/08/26/cidade-biblia-e-encontrada-em-jerusalem/ 301 → /
GET /wp-content/uploads/2018/05/adsbygoogle77.js 301 → /
GET /feed/ 301 → /
GET /author/robertopaulo/page/18/ 301 → /
```

## 🎯 **BENEFÍCIOS**

✅ **SEO melhorado** - 301 é melhor que 404 para motores de busca
✅ **Experiência do usuário** - usuário vai para a home em vez de ver erro
✅ **Logs limpos** - menos erros 404 nos logs
✅ **Indexação correta** - Google atualiza o índice mais rápido

## 📝 **MONITORAMENTO**

Para ver os redirecionamentos acontecendo em tempo real:

```bash
pm2 logs obuxixogospel | grep "Redirecionando URL antiga"
```

Você verá logs como:
```
🔄 Redirecionando URL antiga: /2019/08/26/cidade-biblia-e-encontrada-em-jerusalem/ -> /
```

## ⚙️ **CONFIGURAÇÃO**

### Desabilitar logs em produção (opcional):

Se os logs estiverem gerando muito output, edite `middleware/legacyRedirectMiddleware.js` e comente a linha:

```javascript
// console.log(`🔄 Redirecionando URL antiga: ${url} -> /`);
```

### Adicionar novos padrões:

Para adicionar novos padrões de URLs antigas, edite o array `legacyPatterns` em `middleware/legacyRedirectMiddleware.js`:

```javascript
const legacyPatterns = [
  // ... padrões existentes ...
  
  // Adicione seu novo padrão aqui
  /^\/seu-novo-padrao\/.+/,
];
```

## 🔧 **MANUTENÇÃO**

### Verificar URLs mais acessadas com 404:

```bash
pm2 logs obuxixogospel --lines 1000 | grep "404" | awk '{print $3}' | sort | uniq -c | sort -rn | head -20
```

Isso mostra as 20 URLs com mais 404s. Se encontrar padrões novos, adicione ao middleware.

## 📈 **PRÓXIMOS PASSOS (OPCIONAL)**

### 1. Criar redirecionamentos específicos:

Se você souber para onde algumas URLs antigas devem ir, pode criar redirecionamentos específicos no banco de dados usando a tabela `Redirect`.

### 2. Página 404 personalizada:

Já existe uma página 404 bonita em `views/404.ejs` que mostra:
- Mensagem amigável
- Botões para home e notícias
- Matérias recentes

### 3. Google Search Console:

Acesse o Google Search Console e:
1. Vá em "Cobertura" ou "Páginas"
2. Veja as URLs com erro 404
3. Aguarde o Google reindexar (pode levar algumas semanas)
4. Os 404s vão diminuir gradualmente

## ❓ **FAQ**

**P: Por que 301 e não 302?**
R: 301 é "permanente", informa aos motores de busca que a página foi movida para sempre. 302 é "temporário" e não passa autoridade SEO.

**P: Por que redirecionar para a home?**
R: Como o conteúdo antigo não existe mais, a home é o melhor destino. Usuários podem navegar de lá.

**P: Isso vai resolver todos os 404s?**
R: Não imediatamente. O Google leva tempo para reindexar. Mas vai melhorar gradualmente.

**P: Posso redirecionar para uma página específica?**
R: Sim! Edite o middleware e mude `res.redirect(301, '/')` para `res.redirect(301, '/sua-pagina')`.

## 📞 **SUPORTE**

Se tiver dúvidas ou problemas, verifique:
1. Logs do PM2: `pm2 logs obuxixogospel`
2. Status do servidor: `pm2 status`
3. Teste manual: acesse uma URL antiga e veja se redireciona

---

**Implementado em:** 18/11/2025
**Autor:** Sistema de Redirecionamento Automático
**Versão:** 1.0
