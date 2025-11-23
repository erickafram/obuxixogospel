'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Inserir configurações adicionais do sistema
    // (as configurações de IA já são inseridas pela migration 20251116060000-create-system-config)
    
    const configs = [
      {
        chave: 'site_nome',
        valor: 'O Buxixo Gospel',
        descricao: 'Nome do portal',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_descricao',
        valor: 'Portal de notícias gospel e evangélicas',
        descricao: 'Descrição do portal',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_url',
        valor: 'https://obuxixogospel.com',
        descricao: 'URL principal do site',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'seo_titulo_padrao',
        valor: 'O Buxixo Gospel - Notícias Gospel e Evangélicas',
        descricao: 'Título padrão para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'seo_descricao_padrao',
        valor: 'Portal de notícias gospel com as últimas novidades do mundo evangélico, música gospel, eventos, testemunhos e muito mais.',
        descricao: 'Descrição padrão para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'seo_keywords',
        valor: 'gospel, notícias gospel, música gospel, evangélico, igreja, louvor, adoração',
        descricao: 'Palavras-chave padrão para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'analytics_google',
        valor: '',
        descricao: 'ID do Google Analytics (ex: G-XXXXXXXXXX)',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'analytics_facebook_pixel',
        valor: '',
        descricao: 'ID do Facebook Pixel',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'redes_sociais_facebook',
        valor: 'https://facebook.com/obuxixogospel',
        descricao: 'URL da página no Facebook',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'redes_sociais_instagram',
        valor: 'https://instagram.com/obuxixogospel',
        descricao: 'URL do perfil no Instagram',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'redes_sociais_youtube',
        valor: 'https://youtube.com/@obuxixogospel',
        descricao: 'URL do canal no YouTube',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'redes_sociais_twitter',
        valor: 'https://twitter.com/obuxixogospel',
        descricao: 'URL do perfil no Twitter/X',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert only configs that don't already exist
    for (const config of configs) {
      const [existing] = await queryInterface.sequelize.query(
        "SELECT id FROM configuracoes_sistema WHERE chave = ?",
        { replacements: [config.chave] }
      );
      
      if (existing.length === 0) {
        await queryInterface.bulkInsert('configuracoes_sistema', [config], {});
      }
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('configuracoes_sistema', null, {});
  }
};
