'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Corrigir AUTO_INCREMENT da tabela media (se necessário)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE media MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
      `);
    } catch (err) {
      console.log('Tabela media já configurada ou não existe:', err.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverter não é necessário, mas por segurança:
    await queryInterface.sequelize.query(`
      ALTER TABLE media MODIFY COLUMN id INT NOT NULL;
    `);
  }
};
