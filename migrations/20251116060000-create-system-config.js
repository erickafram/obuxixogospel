'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('configuracoes_sistema', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      chave: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      valor: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      descricao: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Inserir configurações iniciais da IA
    await queryInterface.bulkInsert('configuracoes_sistema', [
      {
        chave: 'ia_ativa',
        valor: 'false',
        descricao: 'Ativa ou desativa o assistente de IA',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'ia_api_key',
        valor: '8f2666a67bee6b36fbc09d507c0b2e4e4059ae3c3a78672448eefaf248cd673b',
        descricao: 'Chave de API do Together AI',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'ia_api_url',
        valor: 'https://api.together.xyz/v1/chat/completions',
        descricao: 'URL da API do Together AI',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'ia_model',
        valor: 'meta-llama/Llama-3-70b-chat-hf',
        descricao: 'Modelo de IA utilizado',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('configuracoes_sistema');
  }
};
