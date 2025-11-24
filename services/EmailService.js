const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Configuração do transporter
    // Você pode usar Gmail, SendGrid, Mailgun, ou SMTP do seu servidor
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.from = process.env.SMTP_FROM || 'Obuxixo Gospel <noreply@obuxixogospel.com.br>';
  }

  /**
   * Enviar email de confirmação de inscrição
   */
  async enviarEmailConfirmacao(email, nome, token) {
    const confirmUrl = `${process.env.BASE_URL || 'https://www.obuxixogospel.com.br'}/newsletter/confirmar/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B00 0%, #E65100 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #FF6B00; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao Obuxixo Gospel!</h1>
          </div>
          <div class="content">
            <p>Olá${nome ? ' ' + nome : ''}!</p>
            <p>Obrigado por se inscrever na nossa newsletter! Estamos muito felizes em tê-lo(a) conosco.</p>
            <p>Para confirmar sua inscrição e começar a receber as últimas notícias gospel, clique no botão abaixo:</p>
            <center>
              <a href="${confirmUrl}" class="button">Confirmar Inscrição</a>
            </center>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Ou copie e cole este link no seu navegador:<br>
              <a href="${confirmUrl}">${confirmUrl}</a>
            </p>
            <p style="margin-top: 30px;">
              Após confirmar, você receberá notificações sempre que publicarmos novos conteúdos sobre:
            </p>
            <ul>
              <li>Notícias Gospel</li>
              <li>Lançamentos Musicais</li>
              <li>Eventos e Shows</li>
              <li>Entrevistas Exclusivas</li>
              <li>E muito mais!</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2025 Obuxixo Gospel - Todos os direitos reservados</p>
            <p>Se você não se inscreveu, ignore este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: '✅ Confirme sua inscrição na Newsletter - Obuxixo Gospel',
        html: html
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar email de confirmação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificação de novo post
   */
  async enviarNovoPost(subscribers, post) {
    const postUrl = `${process.env.BASE_URL || 'https://www.obuxixogospel.com.br'}/${post.categoria}/${post.urlAmigavel}`;
    
    const promises = subscribers.map(async (subscriber) => {
      const unsubscribeUrl = `${process.env.BASE_URL || 'https://www.obuxixogospel.com.br'}/newsletter/cancelar/${subscriber.token_unsubscribe}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF6B00 0%, #E65100 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; }
            .post-image { width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
            .post-title { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
            .post-description { font-size: 16px; color: #666; line-height: 1.8; }
            .button { display: inline-block; padding: 15px 30px; background: #FF6B00; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .category { display: inline-block; padding: 5px 15px; background: #FF6B00; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📰 Nova Notícia Gospel!</h1>
            </div>
            <div class="content">
              <span class="category">${post.categoria}</span>
              <h2 class="post-title">${post.titulo}</h2>
              ${post.imagem ? `<img src="${post.imagem}" alt="${post.titulo}" class="post-image">` : ''}
              <p class="post-description">${post.descricao}</p>
              <center>
                <a href="${postUrl}" class="button">Ler Notícia Completa</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2025 Obuxixo Gospel - Todos os direitos reservados</p>
              <p>Você está recebendo este email porque se inscreveu na nossa newsletter.</p>
              <p><a href="${unsubscribeUrl}" style="color: #FF6B00;">Cancelar inscrição</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await this.transporter.sendMail({
          from: this.from,
          to: subscriber.email,
          subject: `📰 ${post.titulo} - Obuxixo Gospel`,
          html: html
        });
        return { success: true, email: subscriber.email };
      } catch (error) {
        console.error(`Erro ao enviar para ${subscriber.email}:`, error);
        return { success: false, email: subscriber.email, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    return {
      total: subscribers.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Enviar email de boas-vindas após confirmação
   */
  async enviarBoasVindas(email, nome) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B00 0%, #E65100 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Inscrição Confirmada!</h1>
          </div>
          <div class="content">
            <p>Olá${nome ? ' ' + nome : ''}!</p>
            <p>Sua inscrição foi confirmada com sucesso! 🎉</p>
            <p>A partir de agora, você receberá as últimas notícias gospel diretamente no seu email.</p>
            <p>Fique ligado(a) para não perder nenhuma novidade do mundo gospel!</p>
            <p style="margin-top: 30px;">Obrigado por fazer parte da nossa comunidade!</p>
            <p><strong>Equipe Obuxixo Gospel</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Obuxixo Gospel - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: '🎊 Bem-vindo à Newsletter Obuxixo Gospel!',
        html: html
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Testar configuração de email
   */
  async testarConexao() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Configuração de email OK' };
    } catch (error) {
      console.error('Erro na configuração de email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
