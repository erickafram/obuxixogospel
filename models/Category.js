'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Nota: Article usa campo 'categoria' como string
      // Não há foreign key direta no momento
    }
  }

  Category.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    cor: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#3B82F6'
    },
    icone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    descricao: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    underscored: true,
    timestamps: true
  });

  return Category;
};
