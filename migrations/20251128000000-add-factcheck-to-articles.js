'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('articles');
    
    if (!tableInfo.fact_check) {
      await queryInterface.addColumn('articles', 'fact_check', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Dados de fact-check: claim, claimAuthor, claimAuthorType, claimDate, rating, ratingName'
      });
      console.log('Coluna fact_check adicionada à tabela articles');
    } else {
      console.log('Coluna fact_check já existe');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('articles', 'fact_check');
  }
};
