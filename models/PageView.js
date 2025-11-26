'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PageView extends Model {
    static associate(models) {
      // Associação com Article (opcional)
      PageView.belongsTo(models.Article, {
        foreignKey: 'articleId',
        as: 'article'
      });
    }

    // Método estático para registrar uma visualização
    static async recordView(articleId, ip = null, userAgent = null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Verificar se já existe registro para hoje
      let pageView = await PageView.findOne({
        where: {
          articleId,
          date: today
        }
      });

      if (pageView) {
        // Incrementar contador
        await pageView.increment('views');
      } else {
        // Criar novo registro
        pageView = await PageView.create({
          articleId,
          date: today,
          views: 1
        });
      }

      return pageView;
    }

    // Método para obter visualizações dos últimos N dias
    static async getViewsLastDays(days = 7) {
      const { Op } = require('sequelize');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const results = await PageView.findAll({
        attributes: [
          'date',
          [sequelize.fn('SUM', sequelize.col('views')), 'totalViews']
        ],
        where: {
          date: {
            [Op.gte]: startDate
          }
        },
        group: ['date'],
        order: [['date', 'ASC']],
        raw: true
      });

      // Preencher dias sem dados com 0
      const viewsByDate = {};
      results.forEach(r => {
        const dateStr = new Date(r.date).toISOString().split('T')[0];
        viewsByDate[dateStr] = parseInt(r.totalViews) || 0;
      });

      const dailyViews = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyViews.push({
          date: dateStr,
          views: viewsByDate[dateStr] || 0
        });
      }

      return dailyViews;
    }

    // Método para obter total de visualizações de hoje
    static async getTodayViews() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await PageView.sum('views', {
        where: {
          date: today
        }
      });

      return result || 0;
    }
  }

  PageView.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'article_id',
      references: {
        model: 'articles',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'PageView',
    tableName: 'page_views',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['article_id', 'date']
      },
      {
        fields: ['date']
      }
    ]
  });

  return PageView;
};
