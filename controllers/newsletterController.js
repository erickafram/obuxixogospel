const { NewsletterSubscriber } = require('../models');
const EmailService = require('../services/EmailService');

class NewsletterController {
  /**
   * Inscrever novo subscriber
   */
  async subscribe(req, res) {
    try {
      const { email, nome } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      // Verificar se já existe
      const existente = await NewsletterSubscriber.findByEmail(email);

      if (existente) {
        if (existente.confirmado) {
          return res.status(400).json({
            success: false,
            message: 'Este email já está inscrito na newsletter'
          });
        } else {
          // Reenviar email de confirmação
          await EmailService.enviarEmailConfirmacao(
            existente.email,
            existente.nome,
            existente.token_confirmacao
          );

          return res.json({
            success: true,
            message: 'Email de confirmação reenviado! Verifique sua caixa de entrada.'
          });
        }
      }

      // Criar novo subscriber
      const subscriber = await NewsletterSubscriber.create({
        email,
        nome: nome || null
      });

      // Tentar enviar email de confirmação (não bloquear se falhar)
      try {
        const emailResult = await EmailService.enviarEmailConfirmacao(
          subscriber.email,
          subscriber.nome,
          subscriber.token_confirmacao
        );

        if (!emailResult.success) {
          console.error('Erro ao enviar email de confirmação:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação:', emailError.message);
        // Continua mesmo se o email falhar
      }

      res.json({
        success: true,
        message: 'Inscrição realizada com sucesso! Em breve você receberá um email de confirmação.'
      });

    } catch (error) {
      console.error('Erro ao inscrever:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar inscrição',
        error: error.message
      });
    }
  }

  /**
   * Confirmar inscrição via token
   */
  async confirmar(req, res) {
    try {
      const { token } = req.params;

      const subscriber = await NewsletterSubscriber.findOne({
        where: { token_confirmacao: token }
      });

      if (!subscriber) {
        return res.status(404).render('error', {
          message: 'Token inválido ou expirado',
          error: { status: 404 }
        });
      }

      if (subscriber.confirmado) {
        return res.render('newsletter-confirmado', {
          message: 'Sua inscrição já foi confirmada anteriormente!',
          jaConfirmado: true
        });
      }

      // Confirmar inscrição
      subscriber.confirmado = true;
      subscriber.data_confirmacao = new Date();
      await subscriber.save();

      // Enviar email de boas-vindas
      await EmailService.enviarBoasVindas(subscriber.email, subscriber.nome);

      res.render('newsletter-confirmado', {
        message: 'Inscrição confirmada com sucesso!',
        jaConfirmado: false
      });

    } catch (error) {
      console.error('Erro ao confirmar:', error);
      res.status(500).render('error', {
        message: 'Erro ao confirmar inscrição',
        error: { status: 500 }
      });
    }
  }

  /**
   * Cancelar inscrição
   */
  async cancelar(req, res) {
    try {
      const { token } = req.params;

      const subscriber = await NewsletterSubscriber.findOne({
        where: { token_unsubscribe: token }
      });

      if (!subscriber) {
        return res.status(404).render('error', {
          message: 'Link inválido',
          error: { status: 404 }
        });
      }

      // Desativar subscriber
      subscriber.ativo = false;
      await subscriber.save();

      res.render('newsletter-cancelado', {
        message: 'Inscrição cancelada com sucesso!'
      });

    } catch (error) {
      console.error('Erro ao cancelar:', error);
      res.status(500).render('error', {
        message: 'Erro ao cancelar inscrição',
        error: { status: 500 }
      });
    }
  }

  /**
   * Listar subscribers (admin)
   */
  async listar(req, res) {
    try {
      const subscribers = await NewsletterSubscriber.findAll({
        order: [['created_at', 'DESC']]
      });

      const stats = {
        total: subscribers.length,
        ativos: subscribers.filter(s => s.ativo && s.confirmado).length,
        pendentes: subscribers.filter(s => !s.confirmado).length,
        inativos: subscribers.filter(s => !s.ativo).length
      };

      res.render('dashboard/newsletter/lista', {
        subscribers,
        stats,
        user: req.session.user
      });

    } catch (error) {
      console.error('Erro ao listar:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar subscribers'
      });
    }
  }

  /**
   * Enviar newsletter manual (admin)
   */
  async enviarManual(req, res) {
    try {
      const { postId } = req.body;

      if (!postId) {
        return res.status(400).json({
          success: false,
          message: 'ID do post é obrigatório'
        });
      }

      // Buscar post
      const Post = require('../models/Post');
      const post = await Post.findByPk(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Buscar subscribers ativos
      const subscribers = await NewsletterSubscriber.getActiveSubscribers();

      if (subscribers.length === 0) {
        return res.json({
          success: false,
          message: 'Nenhum subscriber ativo encontrado'
        });
      }

      // Enviar emails
      const result = await EmailService.enviarNovoPost(subscribers, post);

      res.json({
        success: true,
        message: `Newsletter enviada para ${result.successful} de ${result.total} subscribers`,
        result
      });

    } catch (error) {
      console.error('Erro ao enviar newsletter:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar newsletter',
        error: error.message
      });
    }
  }

  /**
   * Estatísticas (admin)
   */
  async estatisticas(req, res) {
    try {
      const total = await NewsletterSubscriber.count();
      const ativos = await NewsletterSubscriber.countActive();
      const pendentes = await NewsletterSubscriber.count({
        where: { confirmado: false }
      });
      const inativos = await NewsletterSubscriber.count({
        where: { ativo: false }
      });

      res.json({
        success: true,
        stats: {
          total,
          ativos,
          pendentes,
          inativos
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas'
      });
    }
  }

  /**
   * Testar configuração de email
   */
  async testarEmail(req, res) {
    try {
      const result = await EmailService.testarConexao();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new NewsletterController();
