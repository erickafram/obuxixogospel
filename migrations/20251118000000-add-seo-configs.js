'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Inserir configurações SEO se não existirem
    const configs = [
      {
        chave: 'site_title',
        valor: 'Obuxixo Gospel - Portal de Notícias Gospel e Entretenimento Cristão',
        descricao: 'Título do site (aparece na aba do navegador e nos resultados de busca)',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_description',
        valor: 'Portal de notícias gospel com as últimas novidades sobre música cristã, eventos, ministérios, estudos bíblicos e muito mais. Fique por dentro do mundo gospel!',
        descricao: 'Descrição do site (aparece nos resultados de busca do Google)',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_keywords',
        valor: 'notícias gospel, música gospel, eventos gospel, ministérios, estudos bíblicos, igreja, cristão, evangélico, louvor, adoração',
        descricao: 'Palavras-chave do site (separadas por vírgula)',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    for (const config of configs) {
      // Verificar se já existe
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM configuracoes_sistema WHERE chave = '${config.chave}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('configuracoes_sistema', [config]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('configuracoes_sistema', {
      chave: {
        [Sequelize.Op.in]: ['site_title', 'site_description', 'site_keywords']
      }
    });
  }
};
