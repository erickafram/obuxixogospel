'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('instagram_profiles');
    
    // Adicionar colunas apenas se não existirem
    if (!tableInfo.auto_post_enabled) {
      await queryInterface.addColumn('instagram_profiles', 'auto_post_enabled', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Se a postagem automática está ativada para este perfil'
      });
    }

    if (!tableInfo.last_auto_post) {
      await queryInterface.addColumn('instagram_profiles', 'last_auto_post', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data/hora da última postagem automática'
      });
    }

    if (!tableInfo.auto_post_frequency) {
      await queryInterface.addColumn('instagram_profiles', 'auto_post_frequency', {
        type: Sequelize.STRING(20),
        defaultValue: 'daily',
        allowNull: false,
        comment: 'Frequência de postagem: daily, weekly, monthly'
      });
    }

    if (!tableInfo.auto_post_time) {
      await queryInterface.addColumn('instagram_profiles', 'auto_post_time', {
        type: Sequelize.STRING(5),
        defaultValue: '09:00',
        allowNull: false,
        comment: 'Horário de execução (formato HH:MM)'
      });
    }

    if (!tableInfo.posts_per_execution) {
      await queryInterface.addColumn('instagram_profiles', 'posts_per_execution', {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        allowNull: false,
        comment: 'Quantidade de posts a processar por execução'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('instagram_profiles', 'auto_post_enabled');
    await queryInterface.removeColumn('instagram_profiles', 'last_auto_post');
    await queryInterface.removeColumn('instagram_profiles', 'auto_post_frequency');
    await queryInterface.removeColumn('instagram_profiles', 'auto_post_time');
    await queryInterface.removeColumn('instagram_profiles', 'posts_per_execution');
  }
};
