const InstagramService = require('../services/InstagramService');
const AIService = require('../services/AIService');

/**
 * Renderiza a página de geração em lote
 */
exports.renderPage = async (req, res) => {
  try {
    res.render('dashboard/ia/lote', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      }
    });
  } catch (error) {
    console.error('Erro ao carregar página:', error);
    res.status(500).send('Erro ao carregar página');
  }
};

/**
 * Extrai posts de um perfil do Instagram
 */
exports.extrairPosts = async (req, res) => {
  try {
    const { profileUrl, limit } = req.body;

    if (!profileUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL do perfil é obrigatória' 
      });
    }

    console.log('📱 Extraindo posts do perfil:', profileUrl);

    const posts = await InstagramService.extrairPostsDoPerfil(
      profileUrl, 
      parseInt(limit) || 12
    );

    if (posts.length === 0) {
      return res.json({
        success: false,
        error: 'Nenhum post encontrado neste perfil. Verifique se o perfil é público e tente novamente.'
      });
    }

    console.log(`✅ ${posts.length} posts extraídos com sucesso`);

    res.json({
      success: true,
      posts: posts,
      total: posts.length
    });

  } catch (error) {
    console.error('❌ Erro ao extrair posts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao extrair posts do Instagram'
    });
  }
};

/**
 * Gera matérias a partir dos posts extraídos
 */
exports.gerarMaterias = async (req, res) => {
  try {
    const { posts, categoria } = req.body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum post fornecido' 
      });
    }

    console.log(`🚀 Iniciando geração de ${posts.length} matérias...`);

    const resultado = await AIService.processarPostsEmLote(posts, categoria || 'Notícias');

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('❌ Erro ao gerar matérias:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao gerar matérias'
    });
  }
};

/**
 * Salva uma matéria gerada como post
 */
exports.salvarMateria = async (req, res) => {
  try {
    const { titulo, descricao, conteudo, imagem, categoria, instagramPostId } = req.body;

    if (!titulo || !descricao || !conteudo) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios faltando' 
      });
    }

    // Gerar URL amigável
    const urlAmigavel = titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { Article } = require('../models');

    // Mapear categoria legível para slug do banco
    const categoriaMap = {
      'Notícias': 'noticias',
      'Música': 'musica',
      'Eventos': 'eventos',
      'Ministérios': 'ministerio',
      'Estudos': 'estudo-biblico',
      'Política': 'politicia',
      'Tecnologia': 'tecnologia'
    };

    const categoriaCodigo = categoriaMap[categoria] || 'noticias';

    const article = await Article.create({
      titulo,
      descricao,
      conteudo,
      imagem: imagem || '',
      categoria: categoriaCodigo,
      subcategoria: null,
      autor: 'Redação Obuxixo Gospel',
      publicado: false, // Salvar como rascunho
      destaque: false,
      dataPublicacao: new Date(),
      visualizacoes: 0,
      urlAmigavel,
      instagramPostId: instagramPostId || null
    });

    console.log('✅ Matéria salva como rascunho:', article.id);

    res.json({ 
      success: true, 
      message: 'Matéria salva como rascunho',
      articleId: article.id
    });

  } catch (error) {
    console.error('❌ Erro ao salvar matéria:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao salvar matéria'
    });
  }
};

/**
 * Baixa imagem do Instagram e salva no servidor
 */
exports.baixarImagemInstagram = async (req, res) => {
  try {
    const { imageUrl, postShortcode } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL da imagem é obrigatória' 
      });
    }

    console.log('📥 Baixando imagem do Instagram:', imageUrl.substring(0, 80) + '...');

    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    // Baixar a imagem
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      },
      timeout: 15000
    });

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const filename = `instagram-${postShortcode || timestamp}.jpg`;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    const filepath = path.join(uploadDir, filename);

    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Salvar arquivo
    fs.writeFileSync(filepath, response.data);

    const publicUrl = `/uploads/${filename}`;
    console.log('✅ Imagem salva com sucesso:', publicUrl);

    res.json({
      success: true,
      url: publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Erro ao baixar imagem:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Não foi possível baixar a imagem do Instagram'
    });
  }
};

// Listar perfis salvos
exports.listarPerfis = async (req, res) => {
  try {
    const { InstagramProfile } = require('../models');
    const perfis = await InstagramProfile.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json({ success: true, perfis });
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Salvar perfil
exports.salvarPerfil = async (req, res) => {
  try {
    const { username, url } = req.body;
    
    if (!username || !url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username e URL são obrigatórios' 
      });
    }
    
    const { InstagramProfile } = require('../models');
    
    // Verificar se já existe
    const existente = await InstagramProfile.findOne({ where: { username } });
    if (existente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Este perfil já está salvo' 
      });
    }
    
    const perfil = await InstagramProfile.create({ username, url });
    
    res.json({ success: true, perfil });
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Remover perfil
exports.removerPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { InstagramProfile } = require('../models');
    const perfil = await InstagramProfile.findByPk(id);
    
    if (!perfil) {
      return res.status(404).json({ 
        success: false, 
        error: 'Perfil não encontrado' 
      });
    }
    
    await perfil.destroy();
    
    res.json({ success: true, message: 'Perfil removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover perfil:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Verificar posts publicados
exports.verificarPostsPublicados = async (req, res) => {
  try {
    const { postIds } = req.body;
    
    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ 
        success: false, 
        error: 'postIds deve ser um array' 
      });
    }
    
    const { Article } = require('../models');
    
    // Buscar artigos que têm esses instagram_post_id
    const artigos = await Article.findAll({
      where: {
        instagramPostId: postIds
      },
      attributes: ['instagramPostId', 'publicado', 'id', 'titulo']
    });
    
    // Criar mapa de posts publicados
    const postsPublicados = {};
    artigos.forEach(artigo => {
      postsPublicados[artigo.instagramPostId] = {
        publicado: artigo.publicado,
        articleId: artigo.id,
        titulo: artigo.titulo
      };
    });
    
    res.json({ 
      success: true, 
      postsPublicados 
    });
  } catch (error) {
    console.error('Erro ao verificar posts publicados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Atualizar configurações de postagem automática de um perfil
exports.atualizarAutoPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoPostEnabled, autoPostTime, postsPerExecution } = req.body;
    
    const { InstagramProfile } = require('../models');
    const perfil = await InstagramProfile.findByPk(id);
    
    if (!perfil) {
      return res.status(404).json({ 
        success: false, 
        error: 'Perfil não encontrado' 
      });
    }
    
    await perfil.update({
      autoPostEnabled: autoPostEnabled !== undefined ? autoPostEnabled : perfil.autoPostEnabled,
      autoPostTime: autoPostTime || perfil.autoPostTime,
      postsPerExecution: postsPerExecution || perfil.postsPerExecution
    });
    
    res.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso',
      perfil 
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Processar perfil manualmente
exports.processarPerfilManual = async (req, res) => {
  try {
    const { id } = req.params;
    
    const autoPostService = require('../services/AutoPostService');
    const resultado = await autoPostService.processProfileManually(id);
    
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao processar perfil manualmente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obter status do serviço de postagem automática
exports.getAutoPostStatus = async (req, res) => {
  try {
    const autoPostService = require('../services/AutoPostService');
    const status = autoPostService.getStatus();
    
    res.json({ 
      success: true, 
      ...status 
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
