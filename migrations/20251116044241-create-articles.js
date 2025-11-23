'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('articles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      conteudo: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      imagem: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      categoria: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'g1, ge, gshow, quem, valor'
      },
      subcategoria: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      url_amigavel: {
        type: Sequelize.STRING(300),
        allowNull: false,
        unique: true
      },
      autor: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'Redação Obuxixo Gospel'
      },
      visualizacoes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      destaque: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      publicado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      data_publicacao: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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

    // Adicionar índices para melhor performance
    await queryInterface.addIndex('articles', ['categoria']);
    await queryInterface.addIndex('articles', ['url_amigavel']);
    await queryInterface.addIndex('articles', ['data_publicacao']);
    await queryInterface.addIndex('articles', ['destaque']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('articles');
  }
};
