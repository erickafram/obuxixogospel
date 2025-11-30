const { sequelize } = require('../models');

async function addSEOFields() {
    try {
        console.log('🔌 Conectando ao banco de dados...');
        await sequelize.authenticate();
        console.log('✅ Conexão estabelecida.');

        const queryInterface = sequelize.getQueryInterface();

        console.log('🛠️ Adicionando campos de SEO...');

        // Campo meta_titulo
        try {
            await queryInterface.addColumn('articles', 'meta_titulo', {
                type: sequelize.Sequelize.STRING(70),
                allowNull: true,
                comment: 'Título personalizado para SEO (máx. 70 caracteres)'
            });
            console.log('✅ Campo meta_titulo criado.');
        } catch (e) {
            console.log('⚠️ Campo meta_titulo já existe ou erro:', e.message);
        }

        // Campo meta_descricao
        try {
            await queryInterface.addColumn('articles', 'meta_descricao', {
                type: sequelize.Sequelize.STRING(160),
                allowNull: true,
                comment: 'Descrição personalizada para SEO (máx. 160 caracteres)'
            });
            console.log('✅ Campo meta_descricao criado.');
        } catch (e) {
            console.log('⚠️ Campo meta_descricao já existe ou erro:', e.message);
        }

        // Campo slug_customizado
        try {
            await queryInterface.addColumn('articles', 'slug_customizado', {
                type: sequelize.Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Indica se o slug foi customizado manualmente'
            });
            console.log('✅ Campo slug_customizado criado.');
        } catch (e) {
            console.log('⚠️ Campo slug_customizado já existe ou erro:', e.message);
        }

        console.log('🏁 Processo finalizado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    }
}

addSEOFields();
