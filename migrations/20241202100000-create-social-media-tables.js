'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabela de configurações de redes sociais
    await queryInterface.createTable('social_media_config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      platform: {
        type: Sequelize.ENUM('instagram', 'facebook', 'twitter', 'threads'),
        allowNull: false,
        unique: true
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      access_token_secret: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      api_key: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      api_secret: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      account_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      page_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      auto_post: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      include_image: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      include_link: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      post_template: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      last_post_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Tabela de histórico de postagens
    await queryInterface.createTable('social_media_posts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      article_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'articles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      platform: {
        type: Sequelize.ENUM('instagram', 'facebook', 'twitter', 'threads'),
        allowNull: false
      },
      post_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      post_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'posted', 'failed', 'scheduled'),
        defaultValue: 'pending'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      posted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scheduled_for: {
        type: Sequelize.DATE,
        allowNull: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Índices
    await queryInterface.addIndex('social_media_posts', ['article_id']);
    await queryInterface.addIndex('social_media_posts', ['platform']);
    await queryInterface.addIndex('social_media_posts', ['status']);
    await queryInterface.addIndex('social_media_posts', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('social_media_posts');
    await queryInterface.dropTable('social_media_config');
  }
};
