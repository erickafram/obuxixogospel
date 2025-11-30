'use strict';
const { Model } = require('sequelize');
const slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  class Article extends Model {
    static associate(models) {
      // Associação com Comment
      Article.hasMany(models.Comment, {
        foreignKey: 'articleId',
        as: 'comments'
      });

      // Nota: categoria é uma string, não foreign key
      // Para associar com Category, seria necessário migração
    }

    // Método para incrementar visualizações
    async incrementViews() {
      this.visualizacoes += 1;
      await this.save();
    }

    // Método para gerar URL amigável
    static generateSlug(titulo) {
      return slugify(titulo, {
        lower: true,
        strict: true,
        locale: 'pt',
        remove: /[*+~.()'"!:@]/g
      });
    }
  }

  Article.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 255]
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    conteudo: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    imagem: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: false
      // Validação removida para aceitar qualquer slug de categoria do banco
    },
    subcategoria: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    urlAmigavel: {
      type: DataTypes.STRING(300),
      allowNull: false,
      unique: true,
      field: 'url_amigavel'
    },
    autor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Redação Obuxixo Gospel'
    },
    visualizacoes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    destaque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    publicado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    dataPublicacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'data_publicacao'
    },
    instagramPostId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'instagram_post_id'
    },
    factCheck: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      field: 'fact_check',
      comment: 'Dados de fact-check: claim, claimAuthor, claimAuthorType, claimDate, rating, ratingName'
    }
  }, {
    sequelize,
    modelName: 'Article',
    tableName: 'articles',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (article) => {
        if (!article.urlAmigavel) {
          article.urlAmigavel = Article.generateSlug(article.titulo);
        }
      },
      beforeUpdate: async (article) => {
        if (article.changed('titulo') && !article.changed('urlAmigavel')) {
          article.urlAmigavel = Article.generateSlug(article.titulo);
        }
      }
    }
  });

  return Article;
};
