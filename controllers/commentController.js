const { Comment, Article } = require('../models');

/**
 * Listar comentários aprovados de um artigo
 */
exports.getComments = async (req, res) => {
  try {
    const { articleId } = req.params;

    const comments = await Comment.findAll({
      where: {
        article_id: articleId,
        aprovado: true
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'nome', 'comentario', 'created_at']
    });

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar comentários' });
  }
};

/**
 * Criar novo comentário
 */
exports.createComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { nome, email, comentario, captcha } = req.body;

    // Validações básicas
    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome deve ter pelo menos 2 caracteres' 
      });
    }

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      });
    }

    if (!comentario || comentario.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comentário deve ter pelo menos 10 caracteres' 
      });
    }

    // Validar captcha simples (você pode implementar reCAPTCHA depois)
    if (!captcha || captcha.toLowerCase() !== 'obuxixo') {
      return res.status(400).json({ 
        success: false, 
        error: 'Captcha incorreto. Digite "obuxixo"' 
      });
    }

    // Verificar se o artigo existe
    const article = await Article.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        error: 'Artigo não encontrado' 
      });
    }

    // Capturar IP e User Agent
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('user-agent');

    // Criar comentário (aguardando aprovação)
    const comment = await Comment.create({
      article_id: articleId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      comentario: comentario.trim(),
      aprovado: false, // Requer aprovação do admin
      ip_address,
      user_agent
    });

    res.json({ 
      success: true, 
      message: 'Comentário enviado com sucesso! Aguardando aprovação.',
      comment: {
        id: comment.id,
        nome: comment.nome,
        comentario: comment.comentario,
        created_at: comment.created_at
      }
    });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar comentário' });
  }
};

/**
 * Listar todos os comentários (admin)
 */
exports.getAllComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      include: [{
        model: Article,
        as: 'article',
        attributes: ['id', 'titulo', 'url_amigavel', 'categoria']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar comentários' });
  }
};

/**
 * Aprovar comentário (admin)
 */
exports.approveComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Comentário não encontrado' 
      });
    }

    comment.aprovado = true;
    await comment.save();

    res.json({ success: true, message: 'Comentário aprovado com sucesso' });
  } catch (error) {
    console.error('Erro ao aprovar comentário:', error);
    res.status(500).json({ success: false, error: 'Erro ao aprovar comentário' });
  }
};

/**
 * Deletar comentário (admin)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Comentário não encontrado' 
      });
    }

    await comment.destroy();

    res.json({ success: true, message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar comentário' });
  }
};
