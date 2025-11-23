const cron = require('node-cron');
const { InstagramProfile, Article, Notification, Category } = require('../models');
const InstagramService = require('./InstagramService');
const AIService = require('./AIService');

class AutoPostService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Inicia o serviço de postagem automática
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Serviço de postagem automática já está rodando');
      return;
    }

    console.log('🚀 Iniciando serviço de postagem automática...');
    this.isRunning = true;

    // Executar a cada hora para verificar perfis que precisam ser processados
    this.mainJob = cron.schedule('0 * * * *', async () => {
      await this.processScheduledProfiles();
    });

    // Executar imediatamente na inicialização
    await this.processScheduledProfiles();

    console.log('✅ Serviço de postagem automática iniciado');
  }

  /**
   * Para o serviço de postagem automática
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Serviço de postagem automática não está rodando');
      return;
    }

    console.log('🛑 Parando serviço de postagem automática...');
    
    if (this.mainJob) {
      this.mainJob.stop();
    }

    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
    this.isRunning = false;

    console.log('✅ Serviço de postagem automática parado');
  }

  /**
   * Processa perfis agendados
   */
  async processScheduledProfiles() {
    try {
      console.log('\n⏰ Verificando perfis para processamento automático...');

      // Buscar perfis com postagem automática ativada
      const perfis = await InstagramProfile.findAll({
        where: {
          autoPostEnabled: true
        }
      });

      if (perfis.length === 0) {
        console.log('📭 Nenhum perfil com postagem automática ativada');
        return;
      }

      console.log(`📋 ${perfis.length} perfil(is) com postagem automática ativada`);

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      for (const perfil of perfis) {
        try {
          // Verificar se é hora de processar este perfil
          const [targetHour, targetMinute] = perfil.autoPostTime.split(':').map(Number);
          
          // Processar se estamos na hora certa (com margem de 1 hora)
          if (currentHour === targetHour) {
            // Verificar se já processou hoje
            if (perfil.lastAutoPost) {
              const lastPost = new Date(perfil.lastAutoPost);
              const hoursSinceLastPost = (now - lastPost) / (1000 * 60 * 60);

              // Se processou há menos de 23 horas, pular
              if (hoursSinceLastPost < 23) {
                console.log(`⏭️ Perfil @${perfil.username} já foi processado hoje (${hoursSinceLastPost.toFixed(1)}h atrás)`);
                continue;
              }
            }

            console.log(`\n🎯 Processando perfil @${perfil.username}...`);
            await this.processProfile(perfil);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar perfil @${perfil.username}:`, error.message);
        }
      }

      console.log('✅ Verificação de perfis concluída\n');
    } catch (error) {
      console.error('❌ Erro ao processar perfis agendados:', error);
    }
  }

  /**
   * Processa um perfil específico
   */
  async processProfile(perfil) {
    try {
      console.log(`📱 Extraindo posts de @${perfil.username}...`);

      // Extrair posts do perfil
      const posts = await InstagramService.extrairPostsDoPerfil(
        perfil.url,
        perfil.postsPerExecution || 3
      );

      if (posts.length === 0) {
        console.log(`⚠️ Nenhum post encontrado para @${perfil.username}`);
        return;
      }

      console.log(`✅ ${posts.length} posts extraídos de @${perfil.username}`);

      // Filtrar posts que já foram publicados
      const postIds = posts.map(post => post.id || post.url);
      const artigosExistentes = await Article.findAll({
        where: {
          instagramPostId: postIds
        },
        attributes: ['instagramPostId']
      });

      const idsPublicados = new Set(artigosExistentes.map(a => a.instagramPostId));
      const postsNovos = posts.filter(post => !idsPublicados.has(post.id || post.url));

      if (postsNovos.length === 0) {
        console.log(`⚠️ Todos os posts de @${perfil.username} já foram publicados`);
        await perfil.update({ lastAutoPost: new Date() });
        return;
      }

      console.log(`📝 ${postsNovos.length} posts novos para processar`);

      // Gerar matérias com IA
      console.log(`🤖 Gerando matérias com IA...`);
      const resultado = await AIService.processarPostsEmLote(postsNovos, 'Notícias');

      if (resultado.materias.length === 0) {
        console.log(`⚠️ Nenhuma matéria gerada para @${perfil.username}`);
        return;
      }

      console.log(`✅ ${resultado.materias.length} matéria(s) gerada(s)`);

      // Salvar matérias como rascunho
      let salvas = 0;
      for (const materia of resultado.materias) {
        try {
          // Gerar URL amigável base
          let urlAmigavelBase = materia.titulo
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          
          // Verificar se já existe e adicionar sufixo apenas se necessário
          let urlAmigavel = urlAmigavelBase;
          let contador = 1;
          while (await Article.findOne({ where: { urlAmigavel } })) {
            urlAmigavel = `${urlAmigavelBase}-${contador}`;
            contador++;
          }

          // Pegar primeira imagem sugerida
          const imagem = materia.imagensSugeridas && materia.imagensSugeridas.length > 0
            ? materia.imagensSugeridas[0].url
            : '';

          // Buscar categoria padrão (Notícias) do banco
          const categoriaDefault = await Category.findOne({
            where: { slug: 'noticias' }
          });

          await Article.create({
            titulo: materia.titulo,
            descricao: materia.descricao,
            conteudo: materia.conteudo,
            imagem: imagem,
            categoria: categoriaDefault ? categoriaDefault.slug : 'noticias',
            subcategoria: null,
            autor: `Redação Obuxixo Gospel (via @${perfil.username})`,
            publicado: false, // Salvar como rascunho
            destaque: false,
            dataPublicacao: new Date(),
            visualizacoes: 0,
            urlAmigavel,
            instagramPostId: materia.instagramPostId
          });

          salvas++;
          console.log(`💾 Matéria salva como rascunho: ${materia.titulo.substring(0, 60)}...`);
        } catch (error) {
          console.error(`❌ Erro ao salvar matéria:`, error.message);
        }
      }

      // Atualizar última execução
      await perfil.update({ lastAutoPost: new Date() });

      // Criar notificação de sucesso
      if (salvas > 0) {
        await Notification.create({
          type: 'new_post',
          title: `Novos posts de @${perfil.username}`,
          message: `${salvas} ${salvas === 1 ? 'matéria gerada' : 'matérias geradas'} automaticamente e ${salvas === 1 ? 'salva' : 'salvas'} como rascunho`,
          profileId: perfil.id,
          profileUsername: perfil.username,
          postCount: salvas,
          isRead: false,
          link: '/dashboard/posts'
        });
        console.log(`🔔 Notificação criada: ${salvas} ${salvas === 1 ? 'matéria' : 'matérias'} de @${perfil.username}`);
      }

      console.log(`\n✅ Processamento concluído para @${perfil.username}:`);
      console.log(`   - Posts extraídos: ${posts.length}`);
      console.log(`   - Posts novos: ${postsNovos.length}`);
      console.log(`   - Matérias geradas: ${resultado.materias.length}`);
      console.log(`   - Matérias salvas: ${salvas}`);
      console.log(`   - Status: Salvas como rascunho\n`);

    } catch (error) {
      console.error(`❌ Erro ao processar perfil @${perfil.username}:`, error.message);
      
      // Criar notificação de erro
      await Notification.create({
        type: 'auto_post_error',
        title: `Erro ao processar @${perfil.username}`,
        message: error.message,
        profileId: perfil.id,
        profileUsername: perfil.username,
        postCount: 0,
        isRead: false,
        link: '/dashboard/ia/lote'
      });
      
      throw error;
    }
  }

  /**
   * Processa um perfil manualmente (para teste)
   */
  async processProfileManually(perfilId) {
    try {
      const perfil = await InstagramProfile.findByPk(perfilId);
      
      if (!perfil) {
        throw new Error('Perfil não encontrado');
      }

      console.log(`🎯 Processamento manual iniciado para @${perfil.username}`);
      await this.processProfile(perfil);
      
      return {
        success: true,
        message: `Perfil @${perfil.username} processado com sucesso`
      };
    } catch (error) {
      console.error('❌ Erro no processamento manual:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém status do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.size
    };
  }
}

// Exportar instância única (singleton)
const autoPostService = new AutoPostService();
module.exports = autoPostService;
