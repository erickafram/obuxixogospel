# 🚀 Otimizações de Performance - Lighthouse Score 68 → 81 → 90+

## 📈 Progresso

- **Inicial:** 68 (Desktop) / 68 (Mobile)
- **Após Cache:** 81 (Mobile) ✅
- **Meta:** 90+ (Mobile)

## 📊 Problemas Identificados

### 1. **Imagens Não Otimizadas** (Economia: 354 KiB)
- ❌ Imagens JPG do Instagram: 31.7 KB + 12.9 KB + 5.8 KB + 5.3 KB = 55.9 KB
- ❌ Imagem muito grande: 265.9 KB (1600x909 exibida em 616x462)
- ❌ Falta de compressão: 24.3 KB + 8.5 KB = 32.8 KB

### 2. **Renderização Bloqueada** (Economia: 750ms)
- ❌ Google Fonts bloqueando: 750ms

### 3. **Cache Ineficiente** (Economia: 33 KiB)
- ❌ Instagram embed.js: TTL 20min
- ❌ Facebook SDK: TTL 20min

---

## ✅ Soluções Implementadas

### 1. Converter Imagens para WebP

#### Script Criado: `scripts/convert-images-to-webp.js`

**O que faz:**
- Converte todas as imagens JPG/PNG para WebP
- Atualiza banco de dados automaticamente
- Atualiza referências nos artigos
- Economiza ~30-50% do tamanho

**Como usar:**
```bash
# No servidor ou local
node scripts/convert-images-to-webp.js
```

**Resultado esperado:**
- ✅ 354 KB → ~177 KB (economia de 50%)
- ✅ Todas as imagens antigas convertidas
- ✅ Banco de dados atualizado

---

### 2. Otimizar Carregamento de Fontes

#### Modificar `views/partials/header.ejs`

**ANTES:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
```

**DEPOIS:**
```html
<!-- Preconnect para Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Carregar fontes com display=swap e preload -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Montserrat:wght@500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Montserrat:wght@500;600;700&display=swap"></noscript>
```

**Resultado esperado:**
- ✅ Economia de 750ms no FCP
- ✅ Fontes não bloqueiam renderização

---

### 3. Adicionar Headers de Cache

#### Modificar `app.js`

Adicionar após as configurações do Express:

```javascript
// Headers de cache para assets estáticos
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '365d', // 1 ano
  immutable: true
}));

app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: '30d'
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: '30d'
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d'
}));
```

**Resultado esperado:**
- ✅ Cache de 1 ano para imagens
- ✅ Cache de 30 dias para CSS/JS
- ✅ Menos requisições ao servidor

---

### 4. Lazy Load para Scripts de Terceiros

#### Modificar `views/partials/footer.ejs`

**ANTES:**
```html
<script async src="https://www.instagram.com/embed.js"></script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/pt_BR/sdk.js"></script>
```

**DEPOIS:**
```html
<!-- Carregar scripts de terceiros após página carregar -->
<script>
  // Instagram Embed - Lazy Load
  window.addEventListener('load', function() {
    setTimeout(function() {
      const instagramScript = document.createElement('script');
      instagramScript.src = 'https://www.instagram.com/embed.js';
      instagramScript.async = true;
      document.body.appendChild(instagramScript);
    }, 2000); // Espera 2s após carregamento
  });
  
  // Facebook SDK - Lazy Load
  window.addEventListener('load', function() {
    setTimeout(function() {
      const facebookScript = document.createElement('script');
      facebookScript.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      facebookScript.async = true;
      facebookScript.defer = true;
      facebookScript.crossOrigin = 'anonymous';
      document.body.appendChild(facebookScript);
    }, 2000);
  });
</script>
```

**Resultado esperado:**
- ✅ Scripts não bloqueiam carregamento inicial
- ✅ Melhora FCP e LCP
- ✅ Economia de ~50ms no TBT

---

### 5. Otimizar Imagens Responsivas

#### Modificar `views/index.ejs` e outros templates

**ANTES:**
```html
<img src="/uploads/image.webp" alt="..." loading="lazy" width="280" height="180">
```

**DEPOIS:**
```html
<img 
  src="/uploads/image.webp" 
  srcset="/uploads/image-small.webp 400w,
          /uploads/image-medium.webp 800w,
          /uploads/image-large.webp 1200w"
  sizes="(max-width: 600px) 400px,
         (max-width: 900px) 800px,
         1200px"
  alt="..." 
  loading="lazy" 
  width="280" 
  height="180">
```

**Nota:** Isso requer gerar múltiplos tamanhos de cada imagem.

---

### 6. Adicionar Service Worker para Cache

#### Criar `public/sw.js`

```javascript
const CACHE_NAME = 'obuxixo-gospel-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/css/responsive.css',
  '/js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

#### Registrar no `views/partials/footer.ejs`

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ Service Worker registrado'))
        .catch(err => console.log('❌ Erro:', err));
    });
  }
</script>
```

---

## 📝 Checklist de Implementação

### Prioridade Alta (Fazer Agora)
- [ ] 1. Executar script de conversão de imagens para WebP
- [ ] 2. Otimizar carregamento de fontes (header.ejs)
- [ ] 3. Adicionar headers de cache (app.js)
- [ ] 4. Lazy load de scripts de terceiros (footer.ejs)

### Prioridade Média (Próxima Sprint)
- [ ] 5. Implementar imagens responsivas
- [ ] 6. Adicionar Service Worker

### Prioridade Baixa (Futuro)
- [ ] 7. Implementar CDN
- [ ] 8. Minificar CSS/JS em produção
- [ ] 9. Implementar HTTP/2 Server Push

---

## 🎯 Resultados Esperados

### Antes
- **Performance:** 68
- **FCP:** 4.5s
- **LCP:** 5.2s
- **TBT:** 0ms
- **CLS:** 0
- **SI:** 5.2s

### Depois (Estimado)
- **Performance:** 90+ ✅
- **FCP:** 2.0s ✅ (melhora de 55%)
- **LCP:** 2.5s ✅ (melhora de 52%)
- **TBT:** 0ms ✅ (mantém)
- **CLS:** 0 ✅ (mantém)
- **SI:** 2.5s ✅ (melhora de 52%)

---

## 🚀 Como Aplicar

### 1. Converter Imagens (Local ou Servidor)
```bash
node scripts/convert-images-to-webp.js
```

### 2. Commit e Push
```bash
git add .
git commit -m "feat: otimizações de performance - Lighthouse 90+"
git push origin main
```

### 3. Deploy no Servidor
```bash
cd /home/obuxixogospel/htdocs/www.obuxixogospel.com.br/obuxixogospel
git pull origin main
npm install --production
pm2 restart obuxixogospel
```

### 4. Testar
```bash
# Abrir no navegador
https://www.obuxixogospel.com.br

# Rodar Lighthouse novamente
# Chrome DevTools → Lighthouse → Analyze page load
```

---

## 📊 Monitoramento

### Ferramentas
- **PageSpeed Insights:** https://pagespeed.web.dev/
- **GTmetrix:** https://gtmetrix.com/
- **WebPageTest:** https://www.webpagetest.org/

### Métricas para Acompanhar
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TBT (Total Blocking Time)
- CLS (Cumulative Layout Shift)
- SI (Speed Index)

---

## ⚠️ Notas Importantes

1. **Backup:** Sempre faça backup antes de converter imagens
2. **Teste:** Teste localmente antes de aplicar em produção
3. **Monitoramento:** Acompanhe métricas após deploy
4. **Rollback:** Mantenha arquivos originais por 7 dias

---

**Criado em:** 17/11/2025
**Última atualização:** 17/11/2025
