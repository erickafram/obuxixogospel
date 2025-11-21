const { Article } = require('../models');
const { Op } = require('sequelize');
const googleSitemapService = require('../services/GoogleSitemapService');
const googleIndexingService = require('../services/GoogleIndexingService');

/**
 * Publica automaticamente matérias agendadas que já passaram da data/hora
 */
async function publishScheduledPosts() {
  try {
    const agora = new Date();

    // Buscar matérias não publicadas com data de publicação no passado ou presente
    const scheduledPosts = await Article.findAll({
      where: {
        publicado: false,
        dataPublicacao: {
          [Op.lte]: agora // Menor ou igual a agora
        }
      }
    });

    if (scheduledPosts.length > 0) {
      console.log(`📅 Encontradas ${scheduledPosts.length} matérias agendadas para publicar`);

      let postsPublished = false;

      for (const post of scheduledPosts) {
        await post.update({ publicado: true });
        console.log(`✅ Matéria publicada: "${post.titulo}" (ID: ${post.id})`);

        // Notificar Indexing API individualmente
        try {
          const siteUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
          const postUrl = `${siteUrl}/${post.categoria}/${post.urlAmigavel}`;

          await googleIndexingService.initialize();
          await googleIndexingService.requestIndexing(postUrl, 'URL_UPDATED');
        } catch (idxError) {
          console.error(`⚠️ Erro ao indexar post agendado ${post.id}:`, idxError.message);
        }

        postsPublished = true;
      }

      // Atualizar Sitemap se houve publicações
      if (postsPublished) {
        googleSitemapService.refreshSitemaps().catch(err =>
          console.error('Background Sitemap Refresh Error (Scheduler):', err)
        );
      }
    }
  } catch (error) {
    console.error('❌ Erro ao publicar matérias agendadas:', error);
  }
}

module.exports = { publishScheduledPosts };
