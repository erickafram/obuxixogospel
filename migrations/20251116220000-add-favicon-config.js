'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se a coluna já existe antes de adicionar
    const tableDescription = await queryInterface.describeTable('system_configs');
    
    if (!tableDescription.favicon) {
      await queryInterface.addColumn('system_configs', 'favicon', {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: '/images/favicon.svg',
        comment: 'Caminho do favicon do site'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('system_configs', 'favicon');
  }
};
