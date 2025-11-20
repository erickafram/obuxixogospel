const { Article } = require('../models');
const { Op } = require('sequelize');

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

      for (const post of scheduledPosts) {
        await post.update({ publicado: true });
        console.log(`✅ Matéria publicada: "${post.titulo}" (ID: ${post.id})`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao publicar matérias agendadas:', error);
  }
}

module.exports = { publishScheduledPosts };
