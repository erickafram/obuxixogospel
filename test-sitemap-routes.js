/**
 * Script de teste para verificar se as rotas de sitemap estão funcionando
 * Execute: node test-sitemap-routes.js
 */

const express = require('express');
const app = express();

// Simular as rotas na mesma ordem do app.js
console.log('🧪 Testando ordem das rotas...\n');

// 1. Rotas de sitemap (linha 630-632)
app.get('/sitemap.xml', (req, res) => {
  console.log('✅ Rota /sitemap.xml capturada');
  res.send('OK - sitemap.xml');
});

app.get('/news-sitemap.xml', (req, res) => {
  console.log('✅ Rota /news-sitemap.xml capturada');
  res.send('OK - news-sitemap.xml');
});

app.get('/robots.txt', (req, res) => {
  console.log('✅ Rota /robots.txt capturada');
  res.send('OK - robots.txt');
});

// 2. Rota dinâmica (linha 1145)
app.get('/:categorySlug/:articleSlug', (req, res, next) => {
  console.log(`⚠️  Rota dinâmica capturou: ${req.params.categorySlug}/${req.params.articleSlug}`);
  res.send(`Rota dinâmica: ${req.params.categorySlug}/${req.params.articleSlug}`);
});

// 3. Handler 404
app.use((req, res) => {
  console.log(`❌ 404 Handler capturou: ${req.url}`);
  res.redirect(301, '/');
});

// Testar as rotas
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}\n`);
  console.log('📋 Teste as seguintes URLs:');
  console.log(`   http://localhost:${PORT}/sitemap.xml`);
  console.log(`   http://localhost:${PORT}/news-sitemap.xml`);
  console.log(`   http://localhost:${PORT}/robots.txt`);
  console.log('\n💡 Use Ctrl+C para parar o servidor\n');
});
