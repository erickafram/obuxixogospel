'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('redirects', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      urlAntiga: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
        comment: 'URL antiga/quebrada (ex: /noticia-antiga)'
      },
      urlNova: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL nova/destino (ex: /noticia-nova)'
      },
      tipoRedirecionamento: {
        type: Sequelize.ENUM('301', '302', '307'),
        defaultValue: '301',
        allowNull: false,
        comment: '301=Permanente, 302=Temporário, 307=Temporário (mantém método)'
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Se o redirecionamento está ativo'
      },
      contadorAcessos: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Quantas vezes este redirecionamento foi usado'
      },
      ultimoAcesso: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Data do último acesso a esta URL antiga'
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descrição/motivo do redirecionamento'
      },
      criadoPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Índices para performance
    await queryInterface.addIndex('redirects', ['urlAntiga'], {
      name: 'idx_url_antiga',
      unique: true
    });

    await queryInterface.addIndex('redirects', ['ativo'], {
      name: 'idx_ativo'
    });

    await queryInterface.addIndex('redirects', ['tipoRedirecionamento'], {
      name: 'idx_tipo'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('redirects');
  }
};
