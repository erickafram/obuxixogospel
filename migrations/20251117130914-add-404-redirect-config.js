'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar configuração para redirecionamento de 404
    await queryInterface.bulkInsert('configuracoes_sistema', [
      {
        chave: '404_redirect_enabled',
        valor: 'true',
        descricao: 'Ativar redirecionamento automático de URLs 404 para a home',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: '404_redirect_type',
        valor: '301',
        descricao: 'Tipo de redirecionamento: 301 (permanente para home) ou 410 (conteúdo removido)',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    // Remover configurações de redirecionamento 404
    await queryInterface.bulkDelete('configuracoes_sistema', {
      chave: ['404_redirect_enabled', '404_redirect_type']
    });
  }
};
