'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('newsletter_subscribers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      token_confirmacao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      confirmado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      data_confirmacao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      token_unsubscribe: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Índices para melhor performance
    await queryInterface.addIndex('newsletter_subscribers', ['email']);
    await queryInterface.addIndex('newsletter_subscribers', ['ativo']);
    await queryInterface.addIndex('newsletter_subscribers', ['confirmado']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('newsletter_subscribers');
  }
};
