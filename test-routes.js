// Script de teste para verificar se as rotas estão registradas
const express = require('express');
const app = require('./app');

console.log('\n🔍 Verificando rotas registradas no Express:\n');

// Listar todas as rotas registradas
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(`✅ ${Object.keys(r.route.methods)[0].toUpperCase().padEnd(6)} ${r.route.path}`);
  }
});

console.log('\n📋 Procurando especificamente por rotas de sitemap:\n');

const sitemapRoutes = [];
app._router.stack.forEach(function(r){
  if (r.route && r.route.path && r.route.path.includes('sitemap')){
    sitemapRoutes.push(`${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
  }
});

if (sitemapRoutes.length > 0) {
  sitemapRoutes.forEach(route => console.log(`✅ ${route}`));
} else {
  console.log('❌ Nenhuma rota de sitemap encontrada!');
}

console.log('\n');
