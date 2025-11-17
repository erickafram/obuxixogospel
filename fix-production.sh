#!/bin/bash

# Script para corrigir erro em produção

echo "🔧 Corrigindo erro Category is not defined..."

# 1. Parar o PM2
echo "⏹️ Parando PM2..."
pm2 stop obuxixogospel

# 2. Deletar o processo
echo "🗑️ Deletando processo..."
pm2 delete obuxixogospel

# 3. Limpar cache do Node
echo "🧹 Limpando cache..."
rm -rf node_modules/.cache

# 4. Verificar se o código está correto
echo "📝 Verificando código..."
grep "Category" app.js | head -5

# 5. Iniciar novamente
echo "🚀 Iniciando aplicação..."
pm2 start app.js --name obuxixogospel

# 6. Salvar configuração
echo "💾 Salvando configuração PM2..."
pm2 save

# 7. Ver logs
echo "📋 Logs:"
pm2 logs obuxixogospel --lines 20

echo "✅ Concluído!"
