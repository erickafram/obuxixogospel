'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Índices para a tabela articles - melhoram performance de queries
    
    // Índice para ordenação por data (muito usado na listagem)
    await queryInterface.addIndex('articles', ['data_publicacao'], {
      name: 'idx_articles_data_publicacao'
    }).catch(() => console.log('Índice data_publicacao já existe'));

    // Índice para filtro de publicado
    await queryInterface.addIndex('articles', ['publicado'], {
      name: 'idx_articles_publicado'
    }).catch(() => console.log('Índice publicado já existe'));

    // Índice para filtro de categoria
    await queryInterface.addIndex('articles', ['categoria'], {
      name: 'idx_articles_categoria'
    }).catch(() => console.log('Índice categoria já existe'));

    // Índice composto para queries comuns (categoria + publicado + data)
    await queryInterface.addIndex('articles', ['categoria', 'publicado', 'data_publicacao'], {
      name: 'idx_articles_cat_pub_data'
    }).catch(() => console.log('Índice composto já existe'));

    // Índice para visualizações (ordenação por popularidade)
    await queryInterface.addIndex('articles', ['visualizacoes'], {
      name: 'idx_articles_visualizacoes'
    }).catch(() => console.log('Índice visualizacoes já existe'));

    // Índice para destaque
    await queryInterface.addIndex('articles', ['destaque'], {
      name: 'idx_articles_destaque'
    }).catch(() => console.log('Índice destaque já existe'));

    // Índice para busca por título (FULLTEXT se MySQL)
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE articles ADD FULLTEXT INDEX idx_articles_fulltext (titulo, descricao)'
      );
    } catch (e) {
      console.log('Índice FULLTEXT já existe ou não suportado');
    }

    console.log('✅ Índices de performance criados com sucesso!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('articles', 'idx_articles_data_publicacao').catch(() => {});
    await queryInterface.removeIndex('articles', 'idx_articles_publicado').catch(() => {});
    await queryInterface.removeIndex('articles', 'idx_articles_categoria').catch(() => {});
    await queryInterface.removeIndex('articles', 'idx_articles_cat_pub_data').catch(() => {});
    await queryInterface.removeIndex('articles', 'idx_articles_visualizacoes').catch(() => {});
    await queryInterface.removeIndex('articles', 'idx_articles_destaque').catch(() => {});
    
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE articles DROP INDEX idx_articles_fulltext'
      );
    } catch (e) {}
  }
};
