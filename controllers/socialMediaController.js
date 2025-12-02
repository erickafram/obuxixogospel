/**
 * Controller para gerenciamento de redes sociais
 */

const SocialMediaService = require('../services/SocialMediaService');
const models = require('../models');
const { Op } = require('sequelize');

module.exports = {
  /**
   * Renderiza a página de configuração de redes sociais
   */
  async renderPage(req, res) {
    try {
      const { SocialMedia, SocialMediaPost, Article } = models;
      
      // Buscar configurações de todas as redes
      const networks = await SocialMedia.findAll({
        order: [['platform', 'ASC']]
      });
      
      // Criar mapa de configurações por plataforma
      const configMap = {};
      networks.forEach(n => {
        configMap[n.platform] = n;
      });
      
      // Buscar últimas postagens (últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentPosts = await SocialMediaPost.findAll({
        where: {
          createdAt: { [Op.gte]: sevenDaysAgo }
        },
        order: [['createdAt', 'DESC']],
        limit: 20,
        include: [{
          model: Article,
          as: 'article',
          attributes: ['id', 'titulo', 'urlAmigavel', 'categoria']
        }]
      });
      
      // Estatísticas
      const stats = {
        total: await SocialMediaPost.count(),
        posted: await SocialMediaPost.count({ where: { status: 'posted' } }),
        failed: await SocialMediaPost.count({ where: { status: 'failed' } }),
        pending: await SocialMediaPost.count({ where: { status: 'pending' } })
      };
      
      res.render('dashboard/configuracoes/redes-sociais', {
        title: 'Redes Sociais',
        user: req.user,
        networks: configMap,
        recentPosts,
        stats
      });
      
    } catch (error) {
      console.error('Erro ao carregar configurações de redes sociais:', error);
      res.status(500).send('Erro ao carregar configurações');
    }
  },
  
  /**
   * Salva configurações de uma rede social
   */
  async saveConfig(req, res) {
    try {
      const { SocialMedia } = models;
      const { platform } = req.params;
      const {
        ativo,
        accessToken,
        accessTokenSecret,
        refreshToken,
        apiKey,
        apiSecret,
        accountId,
        pageId,
        username,
        autoPost,
        includeImage,
        includeLink,
        postTemplate
      } = req.body;
      
      // Validar plataforma
      const validPlatforms = ['instagram', 'facebook', 'twitter', 'threads'];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ success: false, error: 'Plataforma inválida' });
      }
      
      // Buscar ou criar configuração
      let [config, created] = await SocialMedia.findOrCreate({
        where: { platform },
        defaults: {
          platform,
          ativo: ativo === 'true' || ativo === true,
          accessToken,
          accessTokenSecret,
          refreshToken,
          apiKey,
          apiSecret,
          accountId,
          pageId,
          username,
          autoPost: autoPost === 'true' || autoPost === true,
          includeImage: includeImage === 'true' || includeImage === true,
          includeLink: includeLink === 'true' || includeLink === true,
          postTemplate
        }
      });
      
      if (!created) {
        // Atualizar configuração existente
        await config.update({
          ativo: ativo === 'true' || ativo === true,
          accessToken: accessToken || config.accessToken,
          accessTokenSecret: accessTokenSecret || config.accessTokenSecret,
          refreshToken: refreshToken || config.refreshToken,
          apiKey: apiKey || config.apiKey,
          apiSecret: apiSecret || config.apiSecret,
          accountId: accountId || config.accountId,
          pageId: pageId || config.pageId,
          username: username || config.username,
          autoPost: autoPost === 'true' || autoPost === true,
          includeImage: includeImage === 'true' || includeImage === true,
          includeLink: includeLink === 'true' || includeLink === true,
          postTemplate: postTemplate || config.postTemplate
        });
      }
      
      console.log(`✅ Configuração do ${platform} salva com sucesso`);
      
      res.json({
        success: true,
        message: `Configurações do ${platform} salvas com sucesso!`
      });
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  /**
   * Testa conexão com uma rede social
   */
  async testConnection(req, res) {
    try {
      const { SocialMedia } = models;
      const { platform } = req.params;
      
      const config = await SocialMedia.findOne({ where: { platform } });
      
      if (!config) {
        return res.json({ success: false, error: 'Configuração não encontrada' });
      }
      
      const result = await SocialMediaService.validateTokens(config);
      
      res.json({
        success: result.valid,
        message: result.valid ? 'Conexão válida!' : 'Conexão inválida',
        error: result.error,
        data: result.data
      });
      
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  /**
   * Posta manualmente um artigo nas redes sociais
   */
  async postArticle(req, res) {
    try {
      const { Article } = models;
      const { articleId } = req.params;
      const { platforms } = req.body; // Array de plataformas ou 'all'
      
      const article = await Article.findByPk(articleId);
      
      if (!article) {
        return res.status(404).json({ success: false, error: 'Artigo não encontrado' });
      }
      
      const results = await SocialMediaService.postToAllNetworks(article, models);
      
      res.json({
        success: true,
        results
      });
      
    } catch (error) {
      console.error('Erro ao postar artigo:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  /**
   * Obtém histórico de postagens
   */
  async getHistory(req, res) {
    try {
      const { SocialMediaPost, Article } = models;
      const { platform, status, page = 1, limit = 20 } = req.query;
      
      const where = {};
      if (platform) where.platform = platform;
      if (status) where.status = status;
      
      const offset = (page - 1) * limit;
      
      const { count, rows } = await SocialMediaPost.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        include: [{
          model: Article,
          as: 'article',
          attributes: ['id', 'titulo', 'urlAmigavel', 'categoria']
        }]
      });
      
      res.json({
        success: true,
        posts: rows,
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      });
      
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  /**
   * Retentar postagem que falhou
   */
  async retryPost(req, res) {
    try {
      const { SocialMediaPost, SocialMedia, Article } = models;
      const { postId } = req.params;
      
      const post = await SocialMediaPost.findByPk(postId, {
        include: [{ model: Article, as: 'article' }]
      });
      
      if (!post) {
        return res.status(404).json({ success: false, error: 'Postagem não encontrada' });
      }
      
      if (post.status !== 'failed') {
        return res.status(400).json({ success: false, error: 'Apenas postagens com falha podem ser retentadas' });
      }
      
      const network = await SocialMedia.findOne({ where: { platform: post.platform } });
      
      if (!network || !network.ativo) {
        return res.status(400).json({ success: false, error: 'Rede social não está ativa' });
      }
      let result;
      
      switch (post.platform) {
        case 'twitter':
          result = await SocialMediaService.postToTwitter(post.article, network, models);
          break;
        case 'facebook':
          result = await SocialMediaService.postToFacebook(post.article, network, models);
          break;
        case 'instagram':
          result = await SocialMediaService.postToInstagram(post.article, network, models);
          break;
        case 'threads':
          result = await SocialMediaService.postToThreads(post.article, network, models);
          break;
      }
      
      // Atualizar post original como sucesso
      await post.update({
        status: 'posted',
        postId: result.postId,
        postUrl: result.postUrl,
        postedAt: new Date(),
        errorMessage: null
      });
      
      res.json({
        success: true,
        result
      });
      
    } catch (error) {
      console.error('Erro ao retentar postagem:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
