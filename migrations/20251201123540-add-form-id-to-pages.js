'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Verificar se a coluna já existe
    const [columns] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM pages LIKE 'form_id'`
    );
    
    if (columns.length > 0) {
      console.log('Coluna form_id já existe, pulando...');
      return;
    }
    
    // Adicionar coluna form_id à tabela pages
    await queryInterface.addColumn('pages', 'form_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'exibir_menu'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remover coluna form_id da tabela pages
    await queryInterface.removeColumn('pages', 'form_id');
  }
};
