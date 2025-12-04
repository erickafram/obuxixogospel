'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('push_subscriptions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },
      keys_p256dh: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      keys_auth: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Índice para busca rápida por endpoint
    await queryInterface.addIndex('push_subscriptions', ['endpoint']);
    await queryInterface.addIndex('push_subscriptions', ['active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('push_subscriptions');
  }
};
