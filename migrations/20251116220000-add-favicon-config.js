'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // A tabela se chama configuracoes_sistema, não system_configs
    // Não precisamos adicionar coluna, vamos apenas inserir a configuração
    
    // Verificar se já existe a configuração de favicon
    const [configs] = await queryInterface.sequelize.query(
      "SELECT * FROM configuracoes_sistema WHERE chave = 'favicon' LIMIT 1"
    );

    if (configs.length === 0) {
      await queryInterface.bulkInsert('configuracoes_sistema', [{
        chave: 'favicon',
        valor: '/images/favicon.svg',
        descricao: 'Caminho do favicon do site',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('configuracoes_sistema', {
      chave: 'favicon'
    });
  }
};
