'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Atualizar categorias antigas para os novos slugs
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'noticias' WHERE categoria = 'g1';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'musica' WHERE categoria = 'ge';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'eventos' WHERE categoria = 'gshow';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'ministerio' WHERE categoria = 'quem';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'estudo-biblico' WHERE categoria = 'valor';
    `);
    
    console.log('✅ Categorias dos artigos atualizadas com sucesso!');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter para categorias antigas (caso necessário)
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'g1' WHERE categoria = 'noticias';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'ge' WHERE categoria = 'musica';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'gshow' WHERE categoria = 'eventos';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'quem' WHERE categoria = 'ministerio';
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE articles SET categoria = 'valor' WHERE categoria = 'estudo-biblico';
    `);
  }
};
