'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('pages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      titulo: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      descricao: {
        type: Sequelize.STRING(300),
        allowNull: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      ordem: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      exibir_footer: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      exibir_menu: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('pages', ['slug']);
    await queryInterface.addIndex('pages', ['ativo']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('pages');
  }
};
