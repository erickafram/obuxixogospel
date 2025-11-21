-- Script para corrigir o auto-increment da tabela media
-- Execute este script no phpMyAdmin ou MySQL Workbench

-- 1. Verificar registros com ID inválido
SELECT * FROM media WHERE id = 0 OR id IS NULL;

-- 2. Remover registros com ID 0 (se existirem)
DELETE FROM media WHERE id = 0;

-- 3. Verificar o maior ID atual
SELECT MAX(id) as maior_id FROM media;

-- 4. Corrigir o auto-increment (ajuste o valor conforme o resultado acima + 1)
-- Se o maior ID for 129, use 130
ALTER TABLE media AUTO_INCREMENT = 130;

-- 5. Verificar se foi aplicado
SHOW TABLE STATUS LIKE 'media';

-- 6. Testar inserção (opcional - remova depois)
-- INSERT INTO media (nome, nome_original, tipo, mime_type, tamanho, url, user_id, created_at, updated_at) 
-- VALUES ('teste.jpg', 'Teste', 'imagem', 'image/jpeg', 1000, '/uploads/teste.jpg', 3, NOW(), NOW());

-- 7. Remover o teste (se executou o passo 6)
-- DELETE FROM media WHERE nome = 'teste.jpg';
