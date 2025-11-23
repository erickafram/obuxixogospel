'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SystemConfig extends Model {
    static associate(models) {
      // Definir associações aqui se necessário
    }

    // Método helper para buscar configuração por chave
    static async getConfig(chave) {
      const config = await this.findOne({ where: { chave } });
      return config ? config.valor : null;
    }

    // Método helper para atualizar configuração
    static async setConfig(chave, valor) {
      const [config, created] = await this.findOrCreate({
        where: { chave },
        defaults: { valor }
      });
      
      if (!created) {
        config.valor = valor;
        await config.save();
      }
      
      return config;
    }
  }

  SystemConfig.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chave: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    valor: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SystemConfig',
    tableName: 'configuracoes_sistema',
    timestamps: true,
    underscored: true
  });

  return SystemConfig;
};
