/**
 * SocialMediaService - Serviço para postagem automática em redes sociais
 * Suporta: Instagram, Facebook, Twitter/X
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class SocialMediaService {
  
  /**
   * Posta em todas as redes sociais ativas
   * @param {Object} article - Artigo a ser postado
   * @param {Object} models - Models do Sequelize
   * @returns {Promise<Array>} - Resultados das postagens
   */
  static async postToAllNetworks(article, models) {
    const { SocialMedia, SocialMediaPost } = models;
    const results = [];
    
    try {
      // Buscar redes sociais ativas com autoPost habilitado
      const activeNetworks = await SocialMedia.findAll({
        where: { ativo: true, autoPost: true }
      });
      
      if (activeNetworks.length === 0) {
        console.log('📱 Nenhuma rede social ativa para postagem automática');
        return results;
      }
      
      console.log(`📱 Postando em ${activeNetworks.length} rede(s) social(is)...`);
      
      for (const network of activeNetworks) {
        try {
          let result;
          
          switch (network.platform) {
            case 'twitter':
              result = await this.postToTwitter(article, network, models);
              break;
            case 'facebook':
              result = await this.postToFacebook(article, network, models);
              break;
            case 'instagram':
              result = await this.postToInstagram(article, network, models);
              break;
            case 'threads':
              result = await this.postToThreads(article, network, models);
              break;
            default:
              console.log(`⚠️ Plataforma não suportada: ${network.platform}`);
              continue;
          }
          
          results.push(result);
          
        } catch (error) {
          console.error(`❌ Erro ao postar no ${network.platform}:`, error.message);
          
          // Registrar falha
          await SocialMediaPost.create({
            articleId: article.id,
            platform: network.platform,
            status: 'failed',
            errorMessage: error.message,
            content: this.formatContent(article, network)
          });
          
          results.push({
            platform: network.platform,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Erro geral ao postar nas redes sociais:', error);
      throw error;
    }
  }
  
  /**
   * Formata o conteúdo do post baseado no template
   */
  static formatContent(article, network) {
    let template = network.postTemplate || '📰 {titulo}\n\n{descricao}\n\n🔗 Leia mais: {link}\n\n#obuxixogospel #noticias #gospel';
    
    // Gerar URL do artigo
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    const articleUrl = `${baseUrl}/${article.categoria}/${article.urlAmigavel}`;
    
    // Limpar descrição de HTML
    let descricao = article.descricao || '';
    descricao = descricao.replace(/<[^>]*>/g, '').substring(0, 200);
    if (descricao.length >= 200) descricao += '...';
    
    // Substituir placeholders
    const content = template
      .replace(/{titulo}/g, article.titulo)
      .replace(/{descricao}/g, descricao)
      .replace(/{link}/g, articleUrl)
      .replace(/{categoria}/g, article.categoria)
      .replace(/{autor}/g, article.autor || 'Redação');
    
    return content;
  }
  
  /**
   * Posta no Twitter/X usando a API v2
   */
  static async postToTwitter(article, network, models) {
    const { SocialMediaPost } = models;
    
    console.log('🐦 Postando no Twitter/X...');
    
    const content = this.formatContent(article, network);
    
    // Twitter API v2 requer OAuth 1.0a
    const OAuth = require('oauth-1.0a');
    const crypto = require('crypto');
    
    const oauth = OAuth({
      consumer: {
        key: network.apiKey,
        secret: network.apiSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });
    
    const token = {
      key: network.accessToken,
      secret: network.accessTokenSecret
    };
    
    const url = 'https://api.twitter.com/2/tweets';
    const requestData = {
      url: url,
      method: 'POST'
    };
    
    try {
      const response = await axios.post(url, 
        { text: content },
        {
          headers: {
            ...oauth.toHeader(oauth.authorize(requestData, token)),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      const tweetId = response.data.data.id;
      const tweetUrl = `https://twitter.com/i/web/status/${tweetId}`;
      
      // Registrar sucesso
      await SocialMediaPost.create({
        articleId: article.id,
        platform: 'twitter',
        postId: tweetId,
        postUrl: tweetUrl,
        status: 'posted',
        postedAt: new Date(),
        content: content
      });
      
      // Atualizar última postagem
      await network.update({ lastPostAt: new Date() });
      
      console.log(`✅ Tweet publicado: ${tweetUrl}`);
      
      return {
        platform: 'twitter',
        success: true,
        postId: tweetId,
        postUrl: tweetUrl
      };
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      throw new Error(`Twitter: ${errorMsg}`);
    }
  }
  
  /**
   * Posta no Facebook usando Graph API
   */
  static async postToFacebook(article, network, models) {
    const { SocialMediaPost } = models;
    
    console.log('📘 Postando no Facebook...');
    
    const content = this.formatContent(article, network);
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    const articleUrl = `${baseUrl}/${article.categoria}/${article.urlAmigavel}`;
    
    const pageId = network.pageId || network.accountId;
    const accessToken = network.accessToken;
    
    if (!pageId || !accessToken) {
      throw new Error('Facebook: Page ID ou Access Token não configurados');
    }
    
    try {
      let postData = {
        message: content,
        access_token: accessToken
      };
      
      // Se incluir link, usar o endpoint de link
      if (network.includeLink) {
        postData.link = articleUrl;
      }
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${pageId}/feed`,
        postData,
        { timeout: 30000 }
      );
      
      const postId = response.data.id;
      const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;
      
      // Registrar sucesso
      await SocialMediaPost.create({
        articleId: article.id,
        platform: 'facebook',
        postId: postId,
        postUrl: postUrl,
        status: 'posted',
        postedAt: new Date(),
        content: content
      });
      
      // Atualizar última postagem
      await network.update({ lastPostAt: new Date() });
      
      console.log(`✅ Post no Facebook publicado: ${postUrl}`);
      
      return {
        platform: 'facebook',
        success: true,
        postId: postId,
        postUrl: postUrl
      };
      
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook: ${errorMsg}`);
    }
  }
  
  /**
   * Posta no Instagram usando Graph API (requer conta Business)
   * Nota: Instagram API só permite postar imagens, não texto puro
   */
  static async postToInstagram(article, network, models) {
    const { SocialMediaPost } = models;
    
    console.log('📸 Postando no Instagram...');
    
    const content = this.formatContent(article, network);
    const accessToken = network.accessToken;
    const igUserId = network.accountId;
    
    if (!igUserId || !accessToken) {
      throw new Error('Instagram: User ID ou Access Token não configurados');
    }
    
    // Instagram requer uma imagem para postar
    if (!article.imagem) {
      throw new Error('Instagram: Artigo não possui imagem');
    }
    
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    let imageUrl = article.imagem;
    
    // Garantir URL absoluta
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    try {
      // Passo 1: Criar container de mídia
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          image_url: imageUrl,
          caption: content,
          access_token: accessToken
        },
        { timeout: 60000 }
      );
      
      const containerId = containerResponse.data.id;
      
      // Aguardar processamento da imagem
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Passo 2: Publicar o container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
        {
          creation_id: containerId,
          access_token: accessToken
        },
        { timeout: 30000 }
      );
      
      const postId = publishResponse.data.id;
      const postUrl = `https://www.instagram.com/p/${postId}/`;
      
      // Registrar sucesso
      await SocialMediaPost.create({
        articleId: article.id,
        platform: 'instagram',
        postId: postId,
        postUrl: postUrl,
        status: 'posted',
        postedAt: new Date(),
        content: content,
        imageUrl: imageUrl
      });
      
      // Atualizar última postagem
      await network.update({ lastPostAt: new Date() });
      
      console.log(`✅ Post no Instagram publicado: ${postUrl}`);
      
      return {
        platform: 'instagram',
        success: true,
        postId: postId,
        postUrl: postUrl
      };
      
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Instagram: ${errorMsg}`);
    }
  }
  
  /**
   * Posta no Threads usando Graph API
   */
  static async postToThreads(article, network, models) {
    const { SocialMediaPost } = models;
    
    console.log('🧵 Postando no Threads...');
    
    const content = this.formatContent(article, network);
    const accessToken = network.accessToken;
    const threadsUserId = network.accountId;
    
    if (!threadsUserId || !accessToken) {
      throw new Error('Threads: User ID ou Access Token não configurados');
    }
    
    try {
      // Passo 1: Criar container de mídia
      const containerResponse = await axios.post(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
        {
          media_type: 'TEXT',
          text: content,
          access_token: accessToken
        },
        { timeout: 30000 }
      );
      
      const containerId = containerResponse.data.id;
      
      // Passo 2: Publicar
      const publishResponse = await axios.post(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
        {
          creation_id: containerId,
          access_token: accessToken
        },
        { timeout: 30000 }
      );
      
      const postId = publishResponse.data.id;
      
      // Registrar sucesso
      await SocialMediaPost.create({
        articleId: article.id,
        platform: 'threads',
        postId: postId,
        status: 'posted',
        postedAt: new Date(),
        content: content
      });
      
      // Atualizar última postagem
      await network.update({ lastPostAt: new Date() });
      
      console.log(`✅ Post no Threads publicado`);
      
      return {
        platform: 'threads',
        success: true,
        postId: postId
      };
      
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Threads: ${errorMsg}`);
    }
  }
  
  /**
   * Verifica se os tokens ainda são válidos
   */
  static async validateTokens(network) {
    switch (network.platform) {
      case 'facebook':
      case 'instagram':
        return await this.validateFacebookToken(network);
      case 'twitter':
        return await this.validateTwitterToken(network);
      default:
        return { valid: true };
    }
  }
  
  /**
   * Valida token do Facebook/Instagram
   */
  static async validateFacebookToken(network) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me?access_token=${network.accessToken}`,
        { timeout: 10000 }
      );
      return { valid: true, data: response.data };
    } catch (error) {
      return { valid: false, error: error.response?.data?.error?.message || error.message };
    }
  }
  
  /**
   * Valida token do Twitter
   */
  static async validateTwitterToken(network) {
    // Twitter OAuth 1.0a não expira, então apenas verificamos se as credenciais existem
    if (network.apiKey && network.apiSecret && network.accessToken && network.accessTokenSecret) {
      return { valid: true };
    }
    return { valid: false, error: 'Credenciais incompletas' };
  }
  
  /**
   * Obtém estatísticas de postagens
   */
  static async getStats(models, days = 30) {
    const { SocialMediaPost } = models;
    const { Op } = require('sequelize');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await SocialMediaPost.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'platform',
        'status',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['platform', 'status']
    });
    
    return stats;
  }
}

module.exports = SocialMediaService;
