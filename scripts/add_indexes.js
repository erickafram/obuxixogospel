const { sequelize } = require('../models');

async function addIndexes() {
    try {
        console.log('🔌 Conectando ao banco de dados...');
        await sequelize.authenticate();
        console.log('✅ Conexão estabelecida.');

        const queryInterface = sequelize.getQueryInterface();

        console.log('🛠️ Adicionando índices...');

        // Índice 1: Publicado + Data (Home, RSS)
        try {
            await queryInterface.addIndex('articles', ['publicado', 'data_publicacao'], {
                name: 'idx_articles_published_date'
            });
            console.log('✅ Índice idx_articles_published_date criado.');
        } catch (e) {
            console.log('⚠️ Índice idx_articles_published_date já existe ou erro:', e.message);
        }

        // Índice 2: Categoria + Publicado + Data (Categoria)
        try {
            await queryInterface.addIndex('articles', ['categoria', 'publicado', 'data_publicacao'], {
                name: 'idx_articles_category_published_date'
            });
            console.log('✅ Índice idx_articles_category_published_date criado.');
        } catch (e) {
            console.log('⚠️ Índice idx_articles_category_published_date já existe ou erro:', e.message);
        }

        // Índice 3: Destaque + Publicado + Data (Destaques)
        try {
            await queryInterface.addIndex('articles', ['destaque', 'publicado', 'data_publicacao'], {
                name: 'idx_articles_featured'
            });
            console.log('✅ Índice idx_articles_featured criado.');
        } catch (e) {
            console.log('⚠️ Índice idx_articles_featured já existe ou erro:', e.message);
        }

        // Índice 4: Fulltext (Busca)
        try {
            await sequelize.query('ALTER TABLE articles ADD FULLTEXT INDEX idx_articles_fulltext_search (titulo, descricao)');
            console.log('✅ Índice FULLTEXT idx_articles_fulltext_search criado.');
        } catch (e) {
            console.log('⚠️ Índice FULLTEXT já existe ou não suportado:', e.message);
        }

        console.log('🏁 Processo finalizado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

addIndexes();
