'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Corrigir AUTO_INCREMENT da tabela media
    await queryInterface.sequelize.query(`
      ALTER TABLE media MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter não é necessário, mas por segurança:
    await queryInterface.sequelize.query(`
      ALTER TABLE media MODIFY COLUMN id INT NOT NULL;
    `);
  }
};
