const { Article } = require('../models');
const { Op } = require('sequelize');

/**
 * Publica automaticamente matérias agendadas que já passaram da data/hora
 */
async function publishScheduledPosts() {
  try {
    const agora = new Date();

    // Buscar matérias não publicadas com data de publicação no passado ou presente
    // Exclui rascunhos (que têm dataPublicacao = data de criação, não futura)
    const scheduledPosts = await Article.findAll({
      where: {
        publicado: false,
        dataPublicacao: {
          [Op.lte]: agora
        }
      }
    });

    if (scheduledPosts.length > 0) {
      console.log(`📅 Encontradas ${scheduledPosts.length} matérias agendadas para publicar`);

      for (const post of scheduledPosts) {
        // Verificar se não é um rascunho muito antigo (mais de 7 dias sem publicação)
        const diasDesdePublicacao = (agora - new Date(post.dataPublicacao)) / (1000 * 60 * 60 * 24);

        if (diasDesdePublicacao > 7) {
          console.log(`⚠️ Ignorando post antigo (${diasDesdePublicacao.toFixed(1)} dias): "${post.titulo}" (ID: ${post.id})`);
          continue;
        }

        await post.update({ publicado: true });
        console.log(`✅ Matéria publicada: "${post.titulo}" (ID: ${post.id})`);
      }

      // Atualizar Sitemap no Google após publicar agendados
      const googleSitemapService = require('../services/GoogleSitemapService');
      googleSitemapService.refreshSitemaps().catch(err =>
        console.error('❌ Erro ao atualizar sitemap após publicação agendada:', err)
      );
    }
  } catch (error) {
    console.error('❌ Erro ao publicar matérias agendadas:', error);
  }
}

module.exports = { publishScheduledPosts };
