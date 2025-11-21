-- Script para corrigir o auto-increment da tabela articles
-- Execute este script no phpMyAdmin ou MySQL Workbench

-- 1. Verificar registros com ID inválido
SELECT * FROM articles WHERE id = 0 OR id IS NULL;

-- 2. Remover registros com ID 0 (se existirem)
DELETE FROM articles WHERE id = 0;

-- 3. Verificar o maior ID atual
SELECT MAX(id) as maior_id FROM articles;

-- 4. Corrigir o auto-increment (ajuste o valor conforme o resultado acima + 1)
-- Exemplo: se o maior ID for 150, use 151
ALTER TABLE articles AUTO_INCREMENT = 200;

-- 5. Verificar se foi aplicado
SHOW TABLE STATUS LIKE 'articles';
