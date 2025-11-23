'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if admin user already exists
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@obuxixogospel.com'"
    );
    
    if (results.length > 0) {
      console.log('Admin user already exists, skipping...');
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash('admin123', salt);
    
    // Use raw query to bypass model validation
    await queryInterface.sequelize.query(
      `INSERT INTO users (nome, email, senha, role, ativo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          'Administrador',
          'admin@obuxixogospel.com',
          senhaHash,
          'admin',
          true,
          new Date(),
          new Date()
        ]
      }
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@obuxixogospel.com' }, {});
  }
};
