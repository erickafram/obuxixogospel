'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('articles', 'meta_titulo', {
            type: Sequelize.STRING(70),
            allowNull: true,
            comment: 'Título personalizado para SEO (máx. 70 caracteres)'
        });

        await queryInterface.addColumn('articles', 'meta_descricao', {
            type: Sequelize.STRING(160),
            allowNull: true,
            comment: 'Descrição personalizada para SEO (máx. 160 caracteres)'
        });

        await queryInterface.addColumn('articles', 'slug_customizado', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Indica se o slug foi customizado manualmente'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('articles', 'meta_titulo');
        await queryInterface.removeColumn('articles', 'meta_descricao');
        await queryInterface.removeColumn('articles', 'slug_customizado');
    }
};
