'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('media', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      nome_original: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('imagem', 'video', 'audio', 'documento'),
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      tamanho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Tamanho em bytes'
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      largura: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      altura: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('media', ['tipo']);
    await queryInterface.addIndex('media', ['user_id']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('media');
  }
};
