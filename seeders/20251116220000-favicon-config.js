'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se já existe a configuração de favicon
    const [configs] = await queryInterface.sequelize.query(
      "SELECT * FROM system_configs WHERE config_key = 'favicon' LIMIT 1"
    );

    if (configs.length === 0) {
      await queryInterface.bulkInsert('system_configs', [{
        config_key: 'favicon',
        config_value: '/images/favicon.svg',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('system_configs', {
      config_key: 'favicon'
    });
  }
};
