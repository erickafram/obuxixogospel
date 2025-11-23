'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Media extends Model {
    static associate(models) {
      Media.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  Media.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    nomeOriginal: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'nome_original'
    },
    tipo: {
      type: DataTypes.ENUM('imagem', 'video', 'audio', 'documento'),
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type'
    },
    tamanho: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    largura: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    altura: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    }
  }, {
    sequelize,
    modelName: 'Media',
    tableName: 'media',
    underscored: true,
    timestamps: true
  });

  return Media;
};
