'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('articles');
    
    // Adicionar meta_titulo se não existir
    if (!tableInfo.meta_titulo) {
      await queryInterface.addColumn('articles', 'meta_titulo', {
        type: Sequelize.STRING(70),
        allowNull: true,
        defaultValue: null
      });
      console.log('Coluna meta_titulo adicionada');
    }

    // Adicionar meta_descricao se não existir
    if (!tableInfo.meta_descricao) {
      await queryInterface.addColumn('articles', 'meta_descricao', {
        type: Sequelize.STRING(160),
        allowNull: true,
        defaultValue: null
      });
      console.log('Coluna meta_descricao adicionada');
    }

    // Adicionar keywords se não existir
    if (!tableInfo.keywords) {
      await queryInterface.addColumn('articles', 'keywords', {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null
      });
      console.log('Coluna keywords adicionada');
    }

    // Adicionar slug_customizado se não existir
    if (!tableInfo.slug_customizado) {
      await queryInterface.addColumn('articles', 'slug_customizado', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('Coluna slug_customizado adicionada');
    }

    // Adicionar fact_check se não existir
    if (!tableInfo.fact_check) {
      await queryInterface.addColumn('articles', 'fact_check', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      });
      console.log('Coluna fact_check adicionada');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('articles', 'meta_titulo').catch(() => {});
    await queryInterface.removeColumn('articles', 'meta_descricao').catch(() => {});
    await queryInterface.removeColumn('articles', 'keywords').catch(() => {});
    await queryInterface.removeColumn('articles', 'slug_customizado').catch(() => {});
    await queryInterface.removeColumn('articles', 'fact_check').catch(() => {});
  }
};
