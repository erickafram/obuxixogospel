'use strict';
const { Model } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    static associate(models) {
      // Definir associações aqui se necessário
    }

    // Método para gerar slug
    static generateSlug(titulo) {
      return slugify(titulo, {
        lower: true,
        strict: true,
        locale: 'pt',
        remove: /[*+~.()'"!:@]/g
      });
    }
  }

  Page.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(300),
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    ordem: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    exibirFooter: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    exibirMenu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Page',
    tableName: 'pages',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (page) => {
        if (!page.slug) {
          page.slug = Page.generateSlug(page.titulo);
        }
      },
      beforeUpdate: async (page) => {
        if (page.changed('titulo') && !page.changed('slug')) {
          page.slug = Page.generateSlug(page.titulo);
        }
      }
    }
  });

  return Page;
};
