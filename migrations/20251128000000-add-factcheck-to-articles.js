'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Migration vazia - coluna já existe ou não é necessária
    console.log('Migration add-factcheck-to-articles: nada a fazer');
  },

  async down(queryInterface, Sequelize) {
    // Nada a reverter
  }
};
