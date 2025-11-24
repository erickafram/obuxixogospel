'use strict';
const { Model } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  class NewsletterSubscriber extends Model {
    static associate(models) {
      // Sem associações por enquanto
    }

    // Método de instância para gerar tokens
    static async findByEmail(email) {
      return await this.findOne({ where: { email } });
    }

    static async getActiveSubscribers() {
      return await this.findAll({
        where: {
          ativo: true,
          confirmado: true
        }
      });
    }

    static async countActive() {
      return await this.count({
        where: {
          ativo: true,
          confirmado: true
        }
      });
    }
  }

  NewsletterSubscriber.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Email inválido'
        }
      }
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    token_confirmacao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    confirmado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    data_confirmacao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    token_unsubscribe: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'NewsletterSubscriber',
    tableName: 'newsletter_subscribers',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: (subscriber) => {
        // Gerar token de confirmação
        if (!subscriber.token_confirmacao) {
          subscriber.token_confirmacao = crypto.randomBytes(32).toString('hex');
        }
        // Gerar token de unsubscribe
        if (!subscriber.token_unsubscribe) {
          subscriber.token_unsubscribe = crypto.randomBytes(32).toString('hex');
        }
      }
    }
  });

  return NewsletterSubscriber;
};
