'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adicionar configurações SEO adicionais se não existirem
    const configs = [
      {
        chave: 'site_title',
        valor: 'Obuxixo Gospel - Portal de Notícias Gospel e Entretenimento Cristão',
        descricao: 'Título padrão do site para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_description', 
        valor: 'Portal de notícias gospel, música cristã, eventos evangélicos, testemunhos e conteúdo edificante para toda família cristã.',
        descricao: 'Descrição padrão do site para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'site_keywords',
        valor: 'notícias gospel, música gospel, eventos evangélicos, testemunhos, estudos bíblicos, louvor, adoração, igreja, cristão, evangélico',
        descricao: 'Palavras-chave padrão para SEO',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'og_image',
        valor: '/images/og-image.jpg',
        descricao: 'Imagem padrão para Open Graph',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'twitter_image',
        valor: '/images/twitter-image.jpg',
        descricao: 'Imagem padrão para Twitter Cards',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'google_site_verification',
        valor: '',
        descricao: 'Código de verificação do Google Search Console',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'bing_site_verification',
        valor: '',
        descricao: 'Código de verificação do Bing Webmaster Tools',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        chave: 'schema_org_logo',
        valor: '/images/logo.png',
        descricao: 'Logo para Schema.org',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Inserir apenas as configurações que não existem
    for (const config of configs) {
      const existing = await queryInterface.rawSelect('configuracoes_sistema', {
        where: { chave: config.chave }
      }, ['id']);

      if (!existing) {
        await queryInterface.bulkInsert('configuracoes_sistema', [config]);
      }
    }

    // Adicionar índice para melhor performance nas buscas
    await queryInterface.addIndex('articles', ['titulo', 'descricao'], {
      name: 'articles_search_idx',
      type: 'FULLTEXT'
    }).catch(err => {
      console.log('Índice FULLTEXT já existe ou não suportado:', err.message);
    });

    // Adicionar índice para categoria + publicado
    await queryInterface.addIndex('articles', ['categoria', 'publicado', 'dataPublicacao'], {
      name: 'articles_category_published_idx'
    }).catch(err => {
      console.log('Índice já existe:', err.message);
    });

    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Remover índices
    await queryInterface.removeIndex('articles', 'articles_search_idx').catch(() => {});
    await queryInterface.removeIndex('articles', 'articles_category_published_idx').catch(() => {});
    
    // Remover configurações adicionadas
    const keysToRemove = [
      'og_image',
      'twitter_image',
      'google_site_verification',
      'bing_site_verification',
      'schema_org_logo'
    ];
    
    await queryInterface.bulkDelete('configuracoes_sistema', {
      chave: keysToRemove
    });

    return Promise.resolve();
  }
};
