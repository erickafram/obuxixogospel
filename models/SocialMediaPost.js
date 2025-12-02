'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SocialMediaPost extends Model {
    static associate(models) {
      // Associação com Article
      SocialMediaPost.belongsTo(models.Article, {
        foreignKey: 'article_id',
        as: 'article'
      });
    }
  }

  SocialMediaPost.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'article_id',
      references: {
        model: 'articles',
        key: 'id'
      }
    },
    platform: {
      type: DataTypes.ENUM('instagram', 'facebook', 'twitter', 'threads'),
      allowNull: false
    },
    postId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'post_id'
    },
    postUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'post_url'
    },
    status: {
      type: DataTypes.ENUM('pending', 'posted', 'failed', 'scheduled'),
      defaultValue: 'pending'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'posted_at'
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_for'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'image_url'
    }
  }, {
    sequelize,
    modelName: 'SocialMediaPost',
    tableName: 'social_media_posts',
    timestamps: true,
    underscored: true
  });

  return SocialMediaPost;
};
