const Article = require('../models/Article');
const googleSitemapService = require('../services/GoogleSitemapService');
const googleIndexingService = require('../services/GoogleIndexingService');

// Helper para construir URL completa
const getFullUrl = (article) => {
  const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
  return `${baseUrl}/${article.categoria}/${article.urlAmigavel}`;
};

// Listar todas as notícias com paginação
exports.getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const articles = await Article.find()
      .sort({ dataPublicacao: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Article.countDocuments();

    res.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obter notícia específica por slug
exports.getArticleBySlug = async (req, res) => {
  try {
    const article = await Article.findOne({ urlAmigavel: req.params.slug });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Notícia não encontrada' });
    }

    // Incrementar views
    article.views += 1;
    await article.save();

    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Filtrar por categoria
exports.getArticlesByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const articles = await Article.find({ categoria: req.params.categoria })
      .sort({ dataPublicacao: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Article.countDocuments({ categoria: req.params.categoria });

    res.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Buscar notícias
exports.searchArticles = async (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(query, 'i');

    const articles = await Article.find({
      $or: [
        { titulo: searchRegex },
        { descricao: searchRegex },
        { tags: searchRegex }
      ]
    })
      .sort({ dataPublicacao: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Article.countDocuments({
      $or: [
        { titulo: searchRegex },
        { descricao: searchRegex },
        { tags: searchRegex }
      ]
    });

    res.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obter notícia em destaque
exports.getFeaturedArticle = async (req, res) => {
  try {
    const article = await Article.findOne({ destaque: true })
      .sort({ dataPublicacao: -1 });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Nenhuma notícia em destaque' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Criar notícia
exports.createArticle = async (req, res) => {
  try {
    const article = new Article(req.body);
    await article.save();

    // Trigger Sitemap Refresh in background
    googleSitemapService.refreshSitemaps().catch(err =>
      console.error('Background Sitemap Refresh Error:', err)
    );

    // Trigger Indexing API if published
    if (article.publicado) {
      const url = getFullUrl(article);
      googleIndexingService.publishUrl(url).catch(err =>
        console.error('Background Indexing API Error:', err)
      );
    }

    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Atualizar notícia
exports.updateArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!article) {
      return res.status(404).json({ success: false, message: 'Notícia não encontrada' });
    }

    // Trigger Sitemap Refresh if published status changed or just generally on update
    if (article.publicado) {
      googleSitemapService.refreshSitemaps().catch(err =>
        console.error('Background Sitemap Refresh Error:', err)
      );

      // Trigger Indexing API
      const url = getFullUrl(article);
      googleIndexingService.publishUrl(url).catch(err =>
        console.error('Background Indexing API Error:', err)
      );
    }

    res.json({ success: true, data: article });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Deletar notícia
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Notícia não encontrada' });
    }

    // Remove from Google Index
    if (article.publicado) {
      const url = getFullUrl(article);
      googleIndexingService.removeUrl(url).catch(err =>
        console.error('Background Indexing API Remove Error:', err)
      );
    }

    res.json({ success: true, message: 'Notícia deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
