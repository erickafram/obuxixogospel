'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SocialMedia extends Model {
    static associate(models) {
      // Associações se necessário
    }

    // Método helper para buscar configuração de uma rede social
    static async getConfig(platform) {
      const config = await this.findOne({ where: { platform } });
      return config;
    }

    // Método helper para verificar se uma rede está ativa
    static async isActive(platform) {
      const config = await this.findOne({ where: { platform, ativo: true } });
      return !!config;
    }

    // Método helper para obter todas as redes ativas
    static async getActiveNetworks() {
      return await this.findAll({ where: { ativo: true } });
    }
  }

  SocialMedia.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    platform: {
      type: DataTypes.ENUM('instagram', 'facebook', 'twitter', 'threads'),
      allowNull: false,
      unique: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Configurações de autenticação
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_token'
    },
    accessTokenSecret: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_token_secret'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token'
    },
    apiKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'api_key'
    },
    apiSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'api_secret'
    },
    // IDs de conta/página
    accountId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'account_id'
    },
    pageId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'page_id'
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Configurações de postagem
    autoPost: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'auto_post'
    },
    includeImage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'include_image'
    },
    includeLink: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'include_link'
    },
    postTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'post_template',
      defaultValue: '📰 {titulo}\n\n{descricao}\n\n🔗 Leia mais: {link}\n\n#obuxixogospel #noticias #gospel'
    },
    // Metadados
    lastPostAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_post_at'
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'token_expires_at'
    }
  }, {
    sequelize,
    modelName: 'SocialMedia',
    tableName: 'social_media_config',
    timestamps: true,
    underscored: true
  });

  return SocialMedia;
};
