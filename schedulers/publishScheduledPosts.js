const { Article } = require('../models');
const { Op } = require('sequelize');

/**
 * Publica automaticamente matérias agendadas que já passaram da data/hora
 * IMPORTANTE: Não publica rascunhos (identificados por terem sido salvos explicitamente como rascunho)
 * Rascunhos sempre têm publicado=false e nunca devem ser publicados automaticamente
 */
async function publishScheduledPosts() {
  try {
    // O scheduler agora está DESATIVADO para evitar publicação automática de rascunhos
    // Apenas posts com checkbox "Publicar imediatamente" marcado serão publicados
    // Posts agendados precisam ser publicados manualmente
    return;
    
    /* CÓDIGO DESATIVADO - Mantido para referência
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

      for (const post of scheduledPosts) {
        await post.update({ publicado: true });
        console.log(`✅ Matéria publicada: "${post.titulo}" (ID: ${post.id})`);
      }
    }
    */
  } catch (error) {
    console.error('❌ Erro ao publicar matérias agendadas:', error);
  }
}

module.exports = { publishScheduledPosts };
