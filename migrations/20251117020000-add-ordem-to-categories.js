'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se a coluna já existe antes de adicionar
    const tableDescription = await queryInterface.describeTable('categories');
    
    if (!tableDescription.ordem) {
      await queryInterface.addColumn('categories', 'ordem', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordem de exibição da categoria'
      });
      
      // Definir ordem inicial baseada no ID
      await queryInterface.sequelize.query(`
        UPDATE categories SET ordem = id WHERE ordem = 0
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('categories', 'ordem');
  }
};
