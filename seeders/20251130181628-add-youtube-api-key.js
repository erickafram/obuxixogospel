'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const apiKey = 'AIzaSyDSBjUKJxFmHp8v4pC9jFBIflrVh0r4YfM';
    
    // Verificar se já existe
    const existing = await queryInterface.rawSelect('configuracoes_sistema', {
      where: {
        chave: 'youtube_api_key',
      },
    }, ['id']);

    if (existing) {
      // Atualizar se já existe
      await queryInterface.bulkUpdate('configuracoes_sistema', 
        { 
          valor: apiKey,
          updated_at: now
        }, 
        { chave: 'youtube_api_key' }
      );
    } else {
      // Inserir se não existe
      await queryInterface.bulkInsert('configuracoes_sistema', [{
        chave: 'youtube_api_key',
        valor: apiKey,
        descricao: 'Chave de API do YouTube Data API v3',
        created_at: now,
        updated_at: now
      }], {});
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('configuracoes_sistema', { chave: 'youtube_api_key' }, {});
  }
};
