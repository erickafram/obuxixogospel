'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se a tabela já existe
    const [tables] = await queryInterface.sequelize.query(
      `SHOW TABLES LIKE 'page_views'`
    );
    
    if (tables.length > 0) {
      console.log('Tabela page_views já existe, pulando criação...');
      return;
    }
    
    await queryInterface.createTable('page_views', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      article_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      views: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // Índice único para article_id + date
    await queryInterface.addIndex('page_views', ['article_id', 'date'], {
      unique: true,
      name: 'page_views_article_date_unique'
    });

    // Índice para buscas por data
    await queryInterface.addIndex('page_views', ['date'], {
      name: 'page_views_date_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('page_views');
  }
};
