const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
require('dotenv').config();

// Sequelize MySQL
const { sequelize, Article, User, Media, SystemConfig, Page, Category, Redirect } = require('./models');
const AIService = require('./services/AIService');
const googleSitemapService = require('./services/GoogleSitemapService');
const { publishScheduledPosts } = require('./schedulers/publishScheduledPosts');

// Configurar Multer para upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mp3|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Erro: Apenas imagens (JPG, PNG, GIF, WebP), vídeos, áudios e PDFs são permitidos!');
    }
  }
});

const app = express();

// Testar conexão com MySQL
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com MySQL:', err);
  });

// Configurar sessões
const sessionStore = new SequelizeStore({
  db: sequelize
});

app.use(session({
  secret: 'obuxixo-gospel-secret-key-2025',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

sessionStore.sync();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' })); // Aumentar limite para imagens grandes
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Headers de segurança
app.use((req, res, next) => {
  // Segurança básica
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy básica
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.quilljs.com https://cdn.jsdelivr.net https://cdn.ampproject.org https://www.instagram.com http://www.instagram.com https://connect.facebook.net https://*.google-analytics.com https://*.googletagmanager.com https://*.google.com https://*.doubleclick.net; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.quilljs.com https://cdn.jsdelivr.net https://cdn.ampproject.org https://fonts.googleapis.com; " +
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https: blob: https://*.google-analytics.com https://*.googletagmanager.com; " +
    "frame-src 'self' https://www.instagram.com https://www.youtube.com https://player.vimeo.com; " +
    "connect-src 'self' https://api.instagram.com https://graph.instagram.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.google.com https://*.doubleclick.net https://cdn.ampproject.org"
  );

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});

// Static files com cache otimizado
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: '365d', // 1 ano para imagens
  immutable: true,
  etag: true
}));

app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  maxAge: '30d', // 30 dias para CSS
  etag: true
}));

app.use('/js', express.static(path.join(__dirname, 'public/js'), {
  maxAge: '30d', // 30 dias para JS
  etag: true
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '30d', // 30 dias para imagens estáticas
  etag: true
}));

// Outros arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para carregar categorias em todas as views
const loadCategories = require('./middlewares/categoriesMiddleware');
app.use(loadCategories);

// Middleware para carregar Google Analytics ID em todas as views
app.use(async (req, res, next) => {
  try {
    const analyticsConfig = await SystemConfig.findOne({
      where: { chave: 'analytics_google' }
    });
    res.locals.analyticsId = analyticsConfig && analyticsConfig.valor ? analyticsConfig.valor : null;
  } catch (error) {
    console.error('Erro ao carregar Analytics ID:', error);
    res.locals.analyticsId = null;
  }
  next();
});

// Middleware de redirecionamentos SEO (ANTES das rotas principais)
const redirectMiddleware = require('./middleware/redirectMiddleware');
app.use(redirectMiddleware);

// Middleware para redirecionar URLs antigas/quebradas (301)
const legacyRedirectMiddleware = require('./middleware/legacyRedirectMiddleware');
app.use(legacyRedirectMiddleware);

// Helper function para gerar URLs de artigos - USA O SLUG DA CATEGORIA DO BANCO
app.locals.getArticleUrl = function (article) {
  // Usa o slug da categoria diretamente do banco
  // Se a categoria não existir, usa 'noticias' como fallback
  const categorySlug = article.categoria || 'noticias';
  return `/${categorySlug}/${article.urlAmigavel}`;
};

// Rotas API
app.use('/api/articles', require('./routes/articles'));
app.use('/api/categorias', require('./routes/categories'));

// Rotas de autenticação
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null, success: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ where: { email, ativo: true } });

    if (!user) {
      return res.render('login', { error: 'E-mail ou senha inválidos', success: null });
    }

    const senhaValida = await user.validarSenha(senha);

    if (!senhaValida) {
      return res.render('login', { error: 'E-mail ou senha inválidos', success: null });
    }

    // Criar sessão
    req.session.userId = user.id;
    req.session.userName = user.nome;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    // Atualizar último login
    await user.atualizarLogin();

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro no login:', error);
    res.render('login', { error: 'Erro ao fazer login', success: null });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Rotas do Dashboard (protegidas)
const { isAuthenticated, isAdmin, canDeletePosts, canAccessUsers, canAccessSettings, canAccessPages } = require('./middleware/auth');

// Rotas de comentários
const commentController = require('./controllers/commentController');
app.get('/api/comments/:articleId', commentController.getComments);
app.post('/api/comments/:articleId', commentController.createComment);
app.get('/api/admin/comments', isAuthenticated, commentController.getAllComments);
app.put('/api/admin/comments/:id/approve', isAuthenticated, commentController.approveComment);
app.delete('/api/admin/comments/:id', isAuthenticated, commentController.deleteComment);

app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const totalPosts = await Article.count();
    const totalViews = await Article.sum('visualizacoes');

    res.render('dashboard/index', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      stats: {
        totalPosts,
        totalViews
      }
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).send('Erro ao carregar dashboard');
  }
});

// POSTS
app.get('/dashboard/posts', isAuthenticated, async (req, res) => {
  try {
    const { status, categoria } = req.query;
    const where = {};

    if (status === 'published') {
      where.publicado = true;
    } else if (status === 'draft') {
      where.publicado = false;
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const articles = await Article.findAll({
      where,
      order: [['dataPublicacao', 'DESC']]
    });

    const { Category } = require('./models');
    const categories = await Category.findAll({
      order: [['nome', 'ASC']]
    });

    res.render('dashboard/posts/index', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      articles,
      categories,
      filters: { status, categoria },
      success: req.query.success
    });
  } catch (error) {
    console.error('Erro ao carregar posts:', error);
    res.status(500).send('Erro ao carregar posts');
  }
});

app.get('/dashboard/posts/novo', isAuthenticated, async (req, res) => {
  try {
    const { Category } = require('./models');
    const categories = await Category.findAll({
      order: [['nome', 'ASC']]
    });

    res.render('dashboard/posts/form', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      isEdit: false,
      article: {},
      categories: categories
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    res.render('dashboard/posts/form', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      isEdit: false,
      article: {},
      categories: []
    });
  }
});

app.post('/dashboard/posts/criar', isAuthenticated, async (req, res) => {
  try {
    const { titulo, descricao, conteudo, imagem, categoria, subcategoria, autor, publicado, destaque, rascunho, dataPublicacao } = req.body;

    console.log('Dados recebidos:', { titulo, descricao, categoria, imagem, rascunho });

    // Se for rascunho, validar apenas título e conteúdo
    if (rascunho === 'true') {
      if (!titulo || !conteudo) {
        const errorMsg = 'Título e conteúdo são obrigatórios para rascunho';
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        return res.status(400).send(errorMsg);
      }
    } else {
      // Validar campos obrigatórios para publicação
      if (!titulo || !descricao || !conteudo || !imagem || !categoria) {
        return res.status(400).send('Campos obrigatórios faltando');
      }
    }

    // Gerar URL amigável base usando slugify
    const slugify = require('slugify');
    let urlAmigavelBase = slugify(titulo, {
      lower: true,
      strict: true,
      locale: 'pt',
      remove: /[*+~.()'"!:@]/g
    });

    // Verificar se já existe e adicionar sufixo apenas se necessário
    let urlAmigavel = urlAmigavelBase;
    let contador = 1;
    while (await Article.findOne({ where: { urlAmigavel } })) {
      urlAmigavel = `${urlAmigavelBase}-${contador}`;
      contador++;
    }

    // Processar data de publicação
    let dataPublicacaoFinal = new Date();
    if (dataPublicacao) {
      // O datetime-local vem sem timezone, então precisamos tratá-lo como horário local
      dataPublicacaoFinal = new Date(dataPublicacao);
    }

    // Verificar se a data de publicação é futura (agendamento)
    const agora = new Date();
    const isDataFutura = dataPublicacaoFinal > agora;

    // Logs detalhados para debug
    console.log('🔍 DEBUG AGENDAMENTO:');
    console.log('   Data recebida (dataPublicacao):', dataPublicacao);
    console.log('   Data processada (dataPublicacaoFinal):', dataPublicacaoFinal);
    console.log('   Data atual (agora):', agora);
    console.log('   É data futura?', isDataFutura);
    console.log('   Checkbox publicado:', publicado);
    console.log('   É rascunho?', rascunho);

    // Determinar status de publicação
    let statusPublicado;

    if (rascunho === 'true') {
      // Rascunho explícito
      statusPublicado = false;
      console.log('💾 Salvando como rascunho');
    } else if (isDataFutura) {
      // Data futura = agendamento (não publicar ainda, mas não é rascunho)
      statusPublicado = false;
      console.log('📅 Matéria agendada para:', dataPublicacaoFinal);
    } else {
      // Data presente/passada = publicar imediatamente
      statusPublicado = publicado === 'true' || publicado === true;
      console.log('✅ Publicando imediatamente');
    }

    const article = await Article.create({
      titulo,
      descricao: descricao || 'Rascunho',
      conteudo,
      imagem: imagem || '/images/default-post.jpg',
      categoria: categoria || 'noticias',
      subcategoria: subcategoria || null,
      autor: autor || 'Redação Obuxixo Gospel',
      publicado: statusPublicado,
      destaque: destaque === 'true' || destaque === true,
      dataPublicacao: dataPublicacaoFinal,
      visualizacoes: 0,
      urlAmigavel
    });

    console.log('Post criado com sucesso:', article.id);

    // Trigger Sitemap Refresh in background if published
    if (statusPublicado) {
      googleSitemapService.refreshSitemaps().catch(err =>
        console.error('Background Sitemap Refresh Error:', err)
      );
    }

    // Se for requisição AJAX (rascunho), retornar JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        message: rascunho === 'true' ? 'Rascunho salvo com sucesso!' : 'Post criado com sucesso!',
        articleId: article.id
      });
    }

    res.redirect('/dashboard/posts?success=Post criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar post:', error);
    console.error('Stack:', error.stack);

    // Se for requisição AJAX, retornar JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(500).send(`Erro ao criar post: ${error.message}`);
  }
});

app.get('/dashboard/posts/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const { Category } = require('./models');
    const article = await Article.findByPk(req.params.id);

    if (!article) {
      const recentArticles = await Article.findAll({
        where: { publicado: true },
        order: [['dataPublicacao', 'DESC']],
        limit: 3
      });
      return res.status(404).render('404', {
        recentArticles,
        user: req.session.userId ? {
          nome: req.session.userName,
          email: req.session.userEmail,
          role: req.session.userRole
        } : null
      });
    }

    // Se for rascunho, atualizar data para agora
    if (!article.publicado) {
      article.dataPublicacao = new Date();
    }

    const categories = await Category.findAll({
      order: [['nome', 'ASC']]
    });

    res.render('dashboard/posts/form', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      isEdit: true,
      article,
      categories: categories
    });
  } catch (error) {
    console.error('Erro ao carregar post:', error);
    res.status(500).send('Erro ao carregar post');
  }
});

app.post('/dashboard/posts/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const { titulo, descricao, conteudo, imagem, categoria, subcategoria, autor, publicado, destaque, rascunho, dataPublicacao } = req.body;

    const article = await Article.findByPk(req.params.id);

    if (!article) {
      const errorMsg = 'Post não encontrado';
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ success: false, message: errorMsg });
      }
      return res.status(404).send(errorMsg);
    }

    // Processar data de publicação
    let dataPublicacaoFinal = article.dataPublicacao;
    if (dataPublicacao) {
      dataPublicacaoFinal = new Date(dataPublicacao);
    }

    // Verificar se a data de publicação é futura (agendamento)
    const agora = new Date();
    const isDataFutura = dataPublicacaoFinal > agora;

    // Determinar status de publicação
    let statusPublicado;

    if (rascunho === 'true') {
      // Rascunho explícito
      statusPublicado = false;
      console.log('💾 Atualizando como rascunho');
    } else if (isDataFutura) {
      // Data futura = agendamento (não publicar ainda, mas não é rascunho)
      statusPublicado = false;
      console.log('📅 Matéria agendada para:', dataPublicacaoFinal);
    } else {
      // Data presente/passada = publicar imediatamente
      statusPublicado = publicado === 'true';
      console.log('✅ Publicando imediatamente');
    }

    await article.update({
      titulo,
      descricao: descricao || article.descricao,
      conteudo,
      imagem: imagem || article.imagem,
      categoria: categoria || article.categoria,
      subcategoria: subcategoria || null,
      autor: autor || 'Redação Obuxixo Gospel',
      publicado: statusPublicado,
      destaque: destaque === 'true',
      dataPublicacao: dataPublicacaoFinal
    });

    // Trigger Sitemap Refresh in background if published
    if (statusPublicado) {
      googleSitemapService.refreshSitemaps().catch(err =>
        console.error('Background Sitemap Refresh Error:', err)
      );
    }

    // Se for requisição AJAX (rascunho), retornar JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        message: rascunho === 'true' ? 'Rascunho atualizado com sucesso!' : 'Post atualizado com sucesso!',
        articleId: article.id
      });
    }

    res.redirect('/dashboard/posts?success=Post atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar post:', error);

    // Se for requisição AJAX, retornar JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.status(500).send('Erro ao atualizar post');
  }
});

app.delete('/dashboard/posts/deletar/:id', isAuthenticated, canDeletePosts, async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);

    if (!article) {
      return res.json({ success: false, message: 'Post não encontrado' });
    }

    await article.destroy();

    res.json({ success: true, message: 'Post deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar post:', error);
    res.json({ success: false, message: 'Erro ao deletar post' });
  }
});

// CATEGORIAS
app.get('/dashboard/categorias', isAuthenticated, async (req, res) => {
  try {
    const { Category } = require('./models');

    // Tentar ordenar por ordem, se falhar, ordenar por nome
    let categories;
    try {
      categories = await Category.findAll({
        order: [['ordem', 'ASC'], ['nome', 'ASC']]
      });
    } catch (orderError) {
      console.log('Campo ordem não existe ainda, ordenando por nome');
      categories = await Category.findAll({
        order: [['nome', 'ASC']]
      });
    }

    res.render('dashboard/categorias/index', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      categories,
      success: req.query.success
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    res.status(500).send('Erro ao carregar categorias');
  }
});

// USUÁRIOS
const userController = require('./controllers/userController');
app.get('/dashboard/usuarios', isAuthenticated, canAccessUsers, userController.listarUsuarios);
app.get('/dashboard/usuarios/novo', isAuthenticated, canAccessUsers, userController.novoUsuarioForm);
app.post('/dashboard/usuarios', isAuthenticated, canAccessUsers, userController.criarUsuario);
app.get('/dashboard/usuarios/:id/editar', isAuthenticated, canAccessUsers, userController.editarUsuarioForm);
app.put('/dashboard/usuarios/:id', isAuthenticated, canAccessUsers, userController.atualizarUsuario);
app.delete('/dashboard/usuarios/:id', isAuthenticated, canAccessUsers, userController.deletarUsuario);
app.post('/dashboard/usuarios/:id/toggle-status', isAuthenticated, canAccessUsers, userController.toggleStatus);

// CONFIGURAÇÕES
const configController = require('./controllers/configController');
app.get('/dashboard/configuracoes', isAuthenticated, canAccessSettings, configController.getAllConfigs);
app.post('/dashboard/configuracoes', isAuthenticated, canAccessSettings, configController.updateConfigs);

// API de configurações
app.get('/api/config/:chave', configController.getConfig);
app.post('/api/config/:chave', isAuthenticated, canAccessSettings, configController.setConfig);

// REDIRECIONAMENTOS SEO
const redirectController = require('./controllers/redirectController');
app.get('/dashboard/configuracoes/redirects', isAuthenticated, canAccessSettings, redirectController.listar);
app.get('/api/redirects/stats', isAuthenticated, canAccessSettings, redirectController.estatisticas);
app.post('/api/redirects', isAuthenticated, canAccessSettings, redirectController.criar);
app.post('/api/redirects/import', isAuthenticated, canAccessSettings, redirectController.importarCSV);
app.get('/api/redirects/:id', isAuthenticated, canAccessSettings, async (req, res) => {
  try {
    const redirect = await Redirect.findByPk(req.params.id);
    if (!redirect) {
      return res.status(404).json({ success: false, message: 'Não encontrado' });
    }
    res.json({ success: true, redirect });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.put('/api/redirects/:id', isAuthenticated, canAccessSettings, redirectController.atualizar);
app.delete('/api/redirects/:id', isAuthenticated, canAccessSettings, redirectController.deletar);
app.post('/api/redirects/:id/toggle', isAuthenticated, canAccessSettings, redirectController.toggleAtivo);

// PÁGINAS ESTÁTICAS
const pageController = require('./controllers/pageController');
app.get('/dashboard/paginas', isAuthenticated, canAccessPages, pageController.index);
app.get('/dashboard/paginas/novo', isAuthenticated, canAccessPages, pageController.novo);
app.get('/dashboard/paginas/:id/editar', isAuthenticated, canAccessPages, pageController.editar);
app.post('/dashboard/paginas/criar', isAuthenticated, canAccessPages, pageController.criar);
app.post('/dashboard/paginas/:id/atualizar', isAuthenticated, canAccessPages, pageController.atualizar);
app.delete('/dashboard/paginas/:id', isAuthenticated, canAccessPages, pageController.deletar);

// Rota pública para exibir páginas
app.get('/pagina/:slug', pageController.exibir);

// BIBLIOTECA DE MÍDIA
app.post('/dashboard/media/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const file = req.file;
    let finalFilename = file.filename;
    let finalUrl = `/uploads/${file.filename}`;
    let finalSize = file.size;
    let finalMimeType = file.mimetype;

    // Determinar tipo
    let tipo = 'documento';
    if (file.mimetype.startsWith('image/')) tipo = 'imagem';
    else if (file.mimetype.startsWith('video/')) tipo = 'video';
    else if (file.mimetype.startsWith('audio/')) tipo = 'audio';

    // Se for imagem (exceto GIF), converter para WebP
    if (tipo === 'imagem' && !file.mimetype.includes('gif')) {
      try {
        const originalPath = path.join('public/uploads', file.filename);
        const webpFilename = file.filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
        const webpPath = path.join('public/uploads', webpFilename);

        // Converter para WebP com qualidade 85%
        await sharp(originalPath)
          .webp({ quality: 85 })
          .toFile(webpPath);

        // Pegar tamanho do arquivo WebP
        const stats = await fs.stat(webpPath);
        finalSize = stats.size;

        // Se não for WebP original, deletar arquivo original
        if (!file.mimetype.includes('webp')) {
          await fs.unlink(originalPath);
        }

        finalFilename = webpFilename;
        finalUrl = `/uploads/${webpFilename}`;
        finalMimeType = 'image/webp';

        console.log(`✅ Imagem convertida para WebP: ${file.originalname} -> ${webpFilename}`);
      } catch (conversionError) {
        console.error('⚠️ Erro ao converter para WebP, usando original:', conversionError);
        // Se falhar, usa o arquivo original
      }
    }

    // Salvar no banco
    const media = await Media.create({
      nome: finalFilename,
      nomeOriginal: file.originalname,
      tipo: tipo,
      mimeType: finalMimeType,
      tamanho: finalSize,
      url: finalUrl,
      userId: req.session.userId
    });

    res.json({
      success: true,
      media: {
        id: media.id,
        url: finalUrl,
        tipo: tipo,
        nome: file.originalname,
        convertedToWebP: finalMimeType === 'image/webp' && !file.mimetype.includes('webp')
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer upload' });
  }
});

// Upload de imagem via URL (Bing)
app.post('/dashboard/media/upload-url', isAuthenticated, async (req, res) => {
  try {
    const { url, descricao } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL é obrigatória' });
    }

    // Baixar a imagem
    const axios = require('axios');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Gerar nome único (sempre WebP)
    const tempFilename = `bing-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const webpFilename = tempFilename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const tempPath = path.join(__dirname, 'public', 'uploads', tempFilename);
    const webpPath = path.join(__dirname, 'public', 'uploads', webpFilename);

    // Salvar arquivo temporário
    await fs.writeFile(tempPath, response.data);

    let finalFilename = webpFilename;
    let finalUrl = `/uploads/${webpFilename}`;
    let finalSize = response.data.length;
    let finalMimeType = 'image/webp';

    // Converter para WebP
    try {
      await sharp(tempPath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      // Pegar tamanho do arquivo WebP
      const stats = await fs.stat(webpPath);
      finalSize = stats.size;

      // Deletar arquivo temporário
      await fs.unlink(tempPath);

      console.log(`✅ Imagem do Bing convertida para WebP: ${webpFilename}`);
    } catch (conversionError) {
      console.error('⚠️ Erro ao converter imagem do Bing para WebP:', conversionError);
      // Se falhar, usa o arquivo original
      finalFilename = tempFilename;
      finalUrl = `/uploads/${tempFilename}`;
      finalMimeType = response.headers['content-type'] || 'image/jpeg';
    }

    // Salvar no banco
    const media = await Media.create({
      nome: finalFilename,
      nomeOriginal: descricao || 'Imagem do Bing',
      tipo: 'imagem',
      mimeType: finalMimeType,
      tamanho: finalSize,
      url: finalUrl,
      userId: req.session.userId
    });

    res.json({
      success: true,
      media: {
        id: media.id,
        url: finalUrl,
        tipo: 'imagem',
        nome: descricao || 'Imagem do Bing',
        convertedToWebP: finalMimeType === 'image/webp'
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upload via URL:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer upload da imagem' });
  }
});

app.get('/dashboard/media', isAuthenticated, async (req, res) => {
  try {
    const tipo = req.query.tipo || null;
    const where = tipo ? { tipo } : {};

    const media = await Media.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, media });
  } catch (error) {
    console.error('Erro ao buscar mídia:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar mídia' });
  }
});

app.delete('/dashboard/media/:id', isAuthenticated, async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);

    if (!media) {
      return res.json({ success: false, message: 'Mídia não encontrada' });
    }

    // Deletar arquivo físico
    const fs = require('fs');
    const filePath = path.join(__dirname, 'public', media.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await media.destroy();

    res.json({ success: true, message: 'Mídia deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar mídia:', error);
    res.json({ success: false, message: 'Erro ao deletar mídia' });
  }
});

// Editar imagem
app.post('/dashboard/media/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const { imageData } = req.body;
    const media = await Media.findByPk(req.params.id);

    if (!media) {
      return res.status(404).json({ success: false, message: 'Mídia não encontrada' });
    }

    if (media.tipo !== 'imagem') {
      return res.status(400).json({ success: false, message: 'Apenas imagens podem ser editadas' });
    }

    // Converter base64 para buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Gerar novo nome de arquivo
    const timestamp = Date.now();
    const originalName = media.nome.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    const newFilename = `${originalName}-edited-${timestamp}.webp`;
    const newPath = path.join(__dirname, 'public', 'uploads', newFilename);

    // Processar com Sharp e salvar como WebP
    await sharp(buffer)
      .webp({ quality: 85 })
      .toFile(newPath);

    // Pegar tamanho do novo arquivo
    const stats = await fs.stat(newPath);
    const newSize = stats.size;

    // Criar nova entrada no banco (mantém a original)
    const newMedia = await Media.create({
      nome: newFilename,
      nomeOriginal: `${media.nomeOriginal} (editada)`,
      tipo: 'imagem',
      mimeType: 'image/webp',
      tamanho: newSize,
      url: `/uploads/${newFilename}`,
      userId: req.session.userId
    });

    res.json({
      success: true,
      media: {
        id: newMedia.id,
        url: newMedia.url,
        tipo: newMedia.tipo,
        nome: newMedia.nomeOriginal
      }
    });
  } catch (error) {
    console.error('Erro ao editar imagem:', error);
    res.status(500).json({ success: false, message: 'Erro ao editar imagem' });
  }
});

// Sitemap e Robots.txt
const sitemapController = require('./controllers/sitemapController');
app.get('/sitemap.xml', sitemapController.generateSitemap);
app.get('/news-sitemap.xml', sitemapController.generateNewsSitemap);
app.get('/news_sitemap.xml', sitemapController.generateNewsSitemap); // Rota alternativa com underline
app.get('/robots.txt', sitemapController.generateRobotsTxt);

// Rotas de páginas públicas
app.get('/', async (req, res) => {
  try {
    // Buscar configurações SEO do banco
    const seoConfig = await SystemConfig.findAll({
      where: {
        chave: {
          [sequelize.Sequelize.Op.in]: ['site_title', 'site_description', 'site_keywords']
        }
      }
    });

    const seoData = {};
    seoConfig.forEach(config => {
      seoData[config.chave] = config.valor;
    });

    // Buscar o destaque mais recente (apenas 1)
    const destaque = await Article.findOne({
      where: { destaque: true, publicado: true },
      order: [['dataPublicacao', 'DESC']]
    });

    // ID do destaque para excluir das listas (apenas o que está sendo exibido)
    const destaqueId = destaque ? destaque.id : null;

    // Buscar TODOS os artigos publicados, excluindo apenas o destaque que está sendo exibido
    // Buscar por 'g1' OU 'noticias' (compatibilidade)
    const g1Articles = await Article.findAll({
      where: {
        categoria: { [sequelize.Sequelize.Op.in]: ['g1', 'noticias'] },
        publicado: true,
        ...(destaqueId && { id: { [sequelize.Sequelize.Op.ne]: destaqueId } })
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 20
    });

    const geArticles = await Article.findAll({
      where: {
        categoria: { [sequelize.Sequelize.Op.in]: ['ge', 'musica'] },
        publicado: true,
        ...(destaqueId && { id: { [sequelize.Sequelize.Op.ne]: destaqueId } })
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 20
    });

    const gshowArticles = await Article.findAll({
      where: {
        categoria: { [sequelize.Sequelize.Op.in]: ['gshow', 'eventos'] },
        publicado: true,
        ...(destaqueId && { id: { [sequelize.Sequelize.Op.ne]: destaqueId } })
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 20
    });

    const quemArticles = await Article.findAll({
      where: {
        categoria: { [sequelize.Sequelize.Op.in]: ['quem', 'ministerios'] },
        publicado: true,
        ...(destaqueId && { id: { [sequelize.Sequelize.Op.ne]: destaqueId } })
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 20
    });

    const valorArticles = await Article.findAll({
      where: {
        categoria: { [sequelize.Sequelize.Op.in]: ['valor', 'estudos'] },
        publicado: true,
        ...(destaqueId && { id: { [sequelize.Sequelize.Op.ne]: destaqueId } })
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 20
    });

    res.render('index', {
      destaque,
      g1Articles,
      geArticles,
      gshowArticles,
      quemArticles,
      valorArticles,
      seo: seoData
    });
  } catch (error) {
    console.error('Erro ao carregar artigo:', error);
    res.status(500).send('Erro ao carregar artigo');
  }
});

// Função para converter HTML para AMP
function convertToAMP(html) {
  if (!html) return '';

  let ampHtml = html;

  // Remover scripts primeiro (incluindo Instagram embed scripts)
  ampHtml = ampHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remover blockquotes do Instagram (ficam duplicados com iframe)
  ampHtml = ampHtml.replace(/<blockquote[^>]*class="instagram-media"[^>]*>.*?<\/blockquote>/gi, '');

  // Converter Instagram iframes para amp-instagram
  ampHtml = ampHtml.replace(/<iframe[^>]*src="https?:\/\/(?:www\.)?instagram\.com\/p\/([^/]+)\/embed[^"]*"[^>]*><\/iframe>/gi, (match, postId) => {
    return `<amp-instagram data-shortcode="${postId}" layout="responsive" width="400" height="500"></amp-instagram>`;
  });

  // Converter YouTube iframes para amp-youtube
  ampHtml = ampHtml.replace(/<iframe[^>]*src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([^"?]+)[^"]*"[^>]*><\/iframe>/gi, (match, videoId) => {
    return `<amp-youtube data-videoid="${videoId}" layout="responsive" width="680" height="400"></amp-youtube>`;
  });

  // Converter <img> para <amp-img>
  ampHtml = ampHtml.replace(/<img([^>]*)src="([^"]*)"([^>]*)>/gi, (match, before, src, after) => {
    // Extrair width e height se existirem
    const widthMatch = match.match(/width="?(\d+)"?/i);
    const heightMatch = match.match(/height="?(\d+)"?/i);
    const width = widthMatch ? widthMatch[1] : '680';
    const height = heightMatch ? heightMatch[1] : '400';

    return `<amp-img${before}src="${src}"${after} layout="responsive" width="${width}" height="${height}"></amp-img>`;
  });

  // Converter outros iframes para amp-iframe (genérico)
  ampHtml = ampHtml.replace(/<iframe([^>]*)src="([^"]*)"([^>]*)><\/iframe>/gi, (match, before, src, after) => {
    // Extrair width e height se existirem
    const widthMatch = match.match(/width="?(\d+)"?/i);
    const heightMatch = match.match(/height="?(\d+)"?/i);
    const width = widthMatch ? widthMatch[1] : '680';
    const height = heightMatch ? heightMatch[1] : '400';

    return `<amp-iframe src="${src}" layout="responsive" width="${width}" height="${height}" sandbox="allow-scripts allow-same-origin" frameborder="0"><amp-img layout="fill" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E" placeholder></amp-img></amp-iframe>`;
  });

  // Remover estilos inline
  ampHtml = ampHtml.replace(/\s*style="[^"]*"/gi, '');

  // Remover atributos não permitidos em AMP
  ampHtml = ampHtml.replace(/\s*class="[^"]*instagram[^"]*"/gi, '');
  ampHtml = ampHtml.replace(/\s*data-instgrm-[^=]*="[^"]*"/gi, '');
  ampHtml = ampHtml.replace(/\s*allowtransparency="[^"]*"/gi, '');
  ampHtml = ampHtml.replace(/\s*allowfullscreen="[^"]*"/gi, '');
  ampHtml = ampHtml.replace(/\s*scrolling="[^"]*"/gi, '');

  return ampHtml;
}

// Rota AMP do artigo
app.get('/:categorySlug/:articleSlug/amp', async (req, res) => {
  try {
    // Verificar se AMP está habilitado
    const ampConfig = await SystemConfig.findOne({
      where: { chave: 'amp_habilitado' }
    });

    if (!ampConfig || ampConfig.valor !== 'true') {
      // Se AMP não está habilitado, redirecionar para versão normal
      return res.redirect(`/${req.params.categorySlug}/${req.params.articleSlug}`);
    }

    const article = await Article.findOne({
      where: {
        urlAmigavel: req.params.articleSlug,
        categoria: req.params.categorySlug,
        publicado: true
      }
    });

    if (!article) {
      console.log(`❌ AMP: Artigo não encontrado - categoria: ${req.params.categorySlug}, slug: ${req.params.articleSlug}`);
      return res.status(404).send('Conteúdo não encontrado');
    }

    console.log(`✅ AMP: Artigo encontrado - ${article.titulo}`);

    // Converter conteúdo para AMP
    const ampArticle = {
      ...article.toJSON(),
      conteudo: convertToAMP(article.conteudo)
    };

    // Buscar artigos relacionados
    const { Op } = require('sequelize');
    const related = await Article.findAll({
      where: {
        categoria: article.categoria,
        id: { [Op.ne]: article.id },
        publicado: true
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 4
    });

    // Buscar configurações AMP
    const analyticsConfig = await SystemConfig.findOne({
      where: { chave: 'amp_analytics_id' }
    });

    // Buscar nome da categoria do banco
    const category = await Category.findOne({
      where: { slug: article.categoria }
    });

    res.render('article-amp', {
      article: ampArticle,
      related,
      categoryRoute: req.params.categorySlug,
      categoryName: category ? category.nome : 'Notícias',
      siteUrl: process.env.SITE_URL || 'https://obuxixogospel.com.br',
      ampAnalyticsId: analyticsConfig ? analyticsConfig.valor : null
    });
  } catch (error) {
    console.error('Erro ao carregar versão AMP:', error);
    res.status(500).send('Erro ao carregar versão AMP');
  }
});

// Rotas legadas para compatibilidade - redirecionam para a categoria correta do banco
// /noticia/:slug → /:categoria/:slug
app.get('/noticia/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({
      where: { urlAmigavel: req.params.slug, publicado: true }
    });

    if (!article) {
      return res.status(404).send('Notícia não encontrada');
    }

    // Redirecionar para a URL correta com a categoria do banco
    return res.redirect(301, `/${article.categoria}/${article.urlAmigavel}`);
  } catch (error) {
    console.error('Erro ao carregar notícia:', error);
    res.status(500).send('Erro ao carregar notícia');
  }
});

// Rota alternativa mantida para compatibilidade
app.get('/artigo/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({
      where: { urlAmigavel: req.params.slug, publicado: true }
    });

    if (!article) {
      return res.status(404).send('Conteúdo não encontrado');
    }

    // Incrementar visualizações
    await article.increment('visualizacoes');

    // Notícias relacionadas
    const { Op } = require('sequelize');
    const related = await Article.findAll({
      where: {
        categoria: article.categoria,
        id: { [Op.ne]: article.id },
        publicado: true
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 4
    });

    res.render('article', {
      article,
      related,
      user: req.session.userId ? {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      } : null
    });
  } catch (error) {
    console.error('Erro ao carregar notícia:', error);
    res.status(500).send('Erro ao carregar notícia');
  }
});

app.get('/categoria/:categoria', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    // Buscar categoria do banco para obter nome e descrição
    const category = await Category.findOne({
      where: { slug: req.params.categoria }
    });

    if (!category) {
      return res.status(404).send('Categoria não encontrada');
    }

    const { count, rows: articles } = await Article.findAndCountAll({
      where: {
        categoria: req.params.categoria,
        publicado: true
      },
      order: [['dataPublicacao', 'DESC']],
      offset: offset,
      limit: limit
    });

    // Buscar configurações SEO do sistema
    const seoConfig = await SystemConfig.findAll({
      where: {
        chave: {
          [sequelize.Sequelize.Op.in]: ['site_title', 'site_description', 'site_keywords']
        }
      }
    });

    const seoData = {};
    seoConfig.forEach(config => {
      seoData[config.chave] = config.valor;
    });

    // Criar SEO específico para categoria
    const categorySeo = {
      title: `${category.nome} - ${seoData.site_title || 'Obuxixo Gospel'}`,
      description: category.descricao || `Últimas notícias e artigos sobre ${category.nome} no portal Obuxixo Gospel`,
      keywords: `${category.nome}, notícias ${category.nome}, ${seoData.site_keywords || 'gospel, evangélico'}`,
      url: `${process.env.SITE_URL || 'https://www.obuxixogospel.com.br'}/categoria/${category.slug}`,
      type: 'website',
      image: '/images/og-image.jpg'
    };

    res.render('category', {
      categoria: req.params.categoria,
      categoryName: category.nome,
      categoryDescription: category.descricao,
      articles,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      seo: categorySeo,
      siteUrl: process.env.SITE_URL || 'https://www.obuxixogospel.com.br'
    });
  } catch (error) {
    console.error('Erro ao carregar categoria:', error);
    res.status(500).send('Erro ao carregar categoria');
  }
});

app.get('/busca', async (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;

    const { Op } = require('sequelize');

    const { count, rows: articles } = await Article.findAndCountAll({
      where: {
        [Op.and]: [
          { publicado: true },
          {
            [Op.or]: [
              { titulo: { [Op.like]: `%${query}%` } },
              { descricao: { [Op.like]: `%${query}%` } },
              { subcategoria: { [Op.like]: `%${query}%` } }
            ]
          }
        ]
      },
      order: [['dataPublicacao', 'DESC']],
      offset: offset,
      limit: limit
    });

    // Buscar configurações SEO do sistema
    const seoConfig = await SystemConfig.findAll({
      where: {
        chave: {
          [sequelize.Sequelize.Op.in]: ['site_title', 'site_description', 'site_keywords']
        }
      }
    });

    const seoData = {};
    seoConfig.forEach(config => {
      seoData[config.chave] = config.valor;
    });

    // Criar SEO específico para busca
    const searchSeo = {
      title: query ? `Resultados para "${query}" - ${seoData.site_title || 'Obuxixo Gospel'}` : `Buscar - ${seoData.site_title || 'Obuxixo Gospel'}`,
      description: query ? `Encontramos ${count} resultados para sua busca por "${query}" no portal Obuxixo Gospel` : 'Busque por notícias, artigos e conteúdo gospel no Obuxixo Gospel',
      keywords: query ? `${query}, busca ${query}, ${seoData.site_keywords || 'gospel, evangélico'}` : seoData.site_keywords || 'busca, pesquisa, gospel, evangélico',
      url: `${process.env.SITE_URL || 'https://www.obuxixogospel.com.br'}/busca${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      type: 'website',
      image: '/images/og-image.jpg'
    };

    res.render('search', {
      query,
      articles,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      seo: searchSeo,
      siteUrl: process.env.SITE_URL || 'https://www.obuxixogospel.com.br'
    });
  } catch (error) {
    console.error('Erro ao buscar:', error);
    res.status(500).send('Erro ao buscar');
  }
});

// ============================================
// ROTAS DA IA
// ============================================

// Criar matéria com IA
app.post('/api/ia/criar-materia', async (req, res) => {
  try {
    const { tema, categoria, palavrasChave, pesquisarInternet, links } = req.body;

    if (!tema) {
      return res.status(400).json({ error: 'Tema é obrigatório' });
    }

    const materia = await AIService.criarMateria(tema, categoria, palavrasChave, pesquisarInternet, links);
    res.json({ success: true, materia });
  } catch (error) {
    console.error('Erro ao criar matéria com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar matéria por texto colado
app.post('/api/ia/criar-por-texto', async (req, res) => {
  try {
    const { texto, linkReferencia, categoria } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    const materia = await AIService.criarMateriaPorTexto(texto, categoria, linkReferencia);
    res.json({ success: true, materia });
  } catch (error) {
    console.error('Erro ao criar matéria por texto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar matéria por conteúdo/informações fornecidas
app.post('/api/ia/criar-por-conteudo', async (req, res) => {
  try {
    console.log('📥 Requisição recebida em /api/ia/criar-por-conteudo');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const {
      tituloSugerido,
      informacoes,
      categoria,
      palavrasChave,
      modoAutomatico,
      // Suporte para formato antigo (link + textoManual)
      link,
      textoManual
    } = req.body;

    // Determinar o conteúdo a ser usado
    let conteudo = informacoes || textoManual || '';
    console.log('📝 Conteúdo recebido:', conteudo.substring(0, 100) + '...');

    // Se tem link, extrair conteúdo
    if (link) {
      console.log('🔗 Extraindo conteúdo do link:', link);
      const resultado = await AIService.extrairConteudoURL(link);

      // Se não conseguiu extrair e não tem texto manual, retornar erro
      if (!resultado || !resultado.texto || resultado.texto.includes('Não foi possível extrair')) {
        if (!conteudo) {
          return res.status(400).json({
            error: 'Não foi possível extrair o conteúdo automaticamente. Por favor, cole o texto manualmente no campo opcional.'
          });
        }
      } else {
        // Usar conteúdo extraído (ou combinar com manual se houver)
        conteudo = conteudo ? `${resultado.texto}\n\n${conteudo}` : resultado.texto;
      }
    }

    if (!conteudo || conteudo.trim().length < 50) {
      console.log('❌ Conteúdo insuficiente:', conteudo.length, 'caracteres');
      return res.status(400).json({ error: 'Conteúdo insuficiente para gerar matéria (mínimo 50 caracteres)' });
    }

    // Construir o tema baseado no título sugerido ou nas informações
    let tema = tituloSugerido || conteudo.substring(0, 200);
    console.log('🎯 Tema construído:', tema.substring(0, 100) + '...');

    // Se tem título sugerido, adicionar as informações como contexto adicional
    if (tituloSugerido && informacoes) {
      tema = `${tituloSugerido}\n\nCONTEXTO E INFORMAÇÕES:\n${informacoes}`;
    }

    console.log('🤖 Chamando AIService.criarMateria...');
    // Usar o método criarMateria (igual ao "Por Tema") para gerar conteúdo mais humanizado
    const materia = await AIService.criarMateria(
      tema,
      categoria || 'Notícias',
      palavrasChave || '',
      false, // pesquisarInternet = false (já temos as informações)
      link ? [link] : [] // links para referência
    );

    console.log('✅ Matéria gerada com sucesso!');
    console.log('Título:', materia?.titulo);
    console.log('Tem imagens?', materia?.imagensSugeridas?.length || 0);
    console.log('📤 Enviando resposta:', { success: true, materia: materia ? 'OK' : 'NULL' });

    res.json({ success: true, materia });
  } catch (error) {
    console.error('❌ Erro ao criar matéria:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Buscar imagens no Bing
app.post('/api/ia/buscar-imagens-bing', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    const imagens = await AIService.buscarImagensPexels(query);
    res.json({ success: true, imagens });
  } catch (error) {
    console.error('Erro ao buscar imagens no Bing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Expandir conteúdo com IA
app.post('/api/ia/expandir-conteudo', async (req, res) => {
  try {
    const { conteudo } = req.body;

    if (!conteudo) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    const conteudoExpandido = await AIService.expandirConteudo(conteudo);
    res.json({ success: true, conteudoExpandido });
  } catch (error) {
    console.error('Erro ao expandir conteúdo com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Corrigir texto com IA
app.post('/api/ia/corrigir-texto', async (req, res) => {
  try {
    const { texto, tipo } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    const textoCorrigido = await AIService.corrigirTexto(texto, tipo);
    res.json({ success: true, textoCorrigido });
  } catch (error) {
    console.error('Erro ao corrigir texto com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reescrever matéria estilo G1
app.post('/api/ia/reescrever-materia', async (req, res) => {
  try {
    const { conteudo } = req.body;

    if (!conteudo) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    const conteudoReescrito = await AIService.reescreverMateriaG1(conteudo);
    res.json({ success: true, conteudo: conteudoReescrito });
  } catch (error) {
    console.error('Erro ao reescrever matéria com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sugerir títulos com IA
app.post('/api/ia/sugerir-titulos', async (req, res) => {
  try {
    const { conteudo, quantidade } = req.body;

    if (!conteudo) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    const titulos = await AIService.sugerirTitulos(conteudo, quantidade || 3);
    res.json({ success: true, titulos });
  } catch (error) {
    console.error('Erro ao sugerir títulos com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gerar descrição com IA
app.post('/api/ia/gerar-descricao', async (req, res) => {
  try {
    const { conteudo } = req.body;

    if (!conteudo) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    const descricao = await AIService.gerarDescricao(conteudo);
    res.json({ success: true, descricao });
  } catch (error) {
    console.error('Erro ao gerar descrição com IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar status da IA
app.get('/api/ia/status', async (req, res) => {
  try {
    const ativa = await AIService.isActive();
    res.json({ ativa });
  } catch (error) {
    console.error('Erro ao verificar status da IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gerenciar configurações da IA (apenas admin)
app.get('/dashboard/ia/configuracoes', async (req, res) => {
  try {
    const configs = await SystemConfig.findAll({
      where: {
        chave: ['ia_ativa', 'ia_api_key', 'ia_api_url', 'ia_model']
      }
    });

    res.render('dashboard/ia/config', { configs });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).send('Erro ao buscar configurações');
  }
});

// IA em Lote - Geração automática de matérias
const iaLoteController = require('./controllers/iaLoteController');
app.get('/dashboard/ia/lote', isAuthenticated, iaLoteController.renderPage);
app.post('/api/ia/extrair-posts', isAuthenticated, iaLoteController.extrairPosts);
app.post('/api/ia/gerar-materias-lote', isAuthenticated, iaLoteController.gerarMaterias);
app.post('/api/ia/salvar-materia', isAuthenticated, iaLoteController.salvarMateria);
app.post('/api/ia/baixar-imagem-instagram', isAuthenticated, iaLoteController.baixarImagemInstagram);

// Rotas para perfis do Instagram
app.get('/api/ia/perfis', isAuthenticated, iaLoteController.listarPerfis);
app.post('/api/ia/perfis', isAuthenticated, iaLoteController.salvarPerfil);
app.delete('/api/ia/perfis/:id', isAuthenticated, iaLoteController.removerPerfil);

// Verificar posts publicados
app.post('/api/ia/verificar-posts-publicados', isAuthenticated, iaLoteController.verificarPostsPublicados);

// Postagem automática
app.put('/api/ia/perfis/:id/auto-post', isAuthenticated, iaLoteController.atualizarAutoPost);
app.post('/api/ia/perfis/:id/processar-manual', isAuthenticated, iaLoteController.processarPerfilManual);
app.get('/api/ia/auto-post/status', isAuthenticated, iaLoteController.getAutoPostStatus);

// Notificações
const notificationController = require('./controllers/notificationController');
app.get('/api/notifications/unread', isAuthenticated, notificationController.getUnreadNotifications);
app.get('/api/notifications/count', isAuthenticated, notificationController.getUnreadCount);
app.get('/api/notifications', isAuthenticated, notificationController.getAllNotifications);
app.put('/api/notifications/:id/read', isAuthenticated, notificationController.markAsRead);
app.put('/api/notifications/read-all', isAuthenticated, notificationController.markAllAsRead);
app.delete('/api/notifications/:id', isAuthenticated, notificationController.deleteNotification);
app.delete('/api/notifications/clean-old', isAuthenticated, notificationController.cleanOldNotifications);

// Atualizar configurações da IA
app.post('/dashboard/ia/configuracoes', async (req, res) => {
  try {
    const { ia_ativa, ia_api_key, ia_api_url, ia_model } = req.body;

    await Promise.all([
      SystemConfig.setConfig('ia_ativa', ia_ativa || 'false'),
      SystemConfig.setConfig('ia_api_key', ia_api_key),
      SystemConfig.setConfig('ia_api_url', ia_api_url),
      SystemConfig.setConfig('ia_model', ia_model)
    ]);

    res.redirect('/dashboard/ia/configuracoes?success=1');
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).send('Erro ao atualizar configurações');
  }
});

// Rota dinâmica universal - captura QUALQUER categoria/:slug
// DEVE VIR ANTES DO 404 para capturar novas categorias do banco
app.get('/:categorySlug/:articleSlug', async (req, res, next) => {
  try {
    const { categorySlug, articleSlug } = req.params;

    // Verificar se a categoria existe no banco
    const category = await Category.findOne({
      where: { slug: categorySlug }
    });

    // Se a categoria não existir, passa para o próximo middleware (404)
    if (!category) {
      return next();
    }

    // Verificar se é modo preview (permite visualizar rascunhos)
    const isPreview = req.query.preview === 'true';

    // Buscar o artigo
    const whereClause = {
      urlAmigavel: articleSlug,
      categoria: categorySlug
    };

    // Se não for preview, exigir que esteja publicado
    if (!isPreview) {
      whereClause.publicado = true;
    }

    const article = await Article.findOne({ where: whereClause });

    if (!article) {
      const recentArticles = await Article.findAll({
        where: { publicado: true },
        order: [['dataPublicacao', 'DESC']],
        limit: 3
      });
      return res.status(404).render('404', {
        recentArticles,
        user: req.session.userId ? {
          nome: req.session.userName,
          email: req.session.userEmail,
          role: req.session.userRole
        } : null
      });
    }

    // Incrementar visualizações
    await article.increment('visualizacoes');

    // Conteúdos relacionados
    const { Op } = require('sequelize');
    const related = await Article.findAll({
      where: {
        categoria: article.categoria,
        id: { [Op.ne]: article.id },
        publicado: true
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 4
    });

    // Verificar se AMP está habilitado
    const ampConfig = await SystemConfig.findOne({
      where: { chave: 'amp_habilitado' }
    });

    res.render('article', {
      article,
      related,
      ampEnabled: ampConfig && ampConfig.valor === 'true',
      isPreview: isPreview, // Passar flag de preview para o template
      user: req.session.userId ? {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      } : null
    });
  } catch (error) {
    console.error('Erro ao carregar artigo:', error);
    next(error);
  }
});

// Tratamento de erros 404
app.use(async (req, res) => {
  try {
    // Verificar configuração de redirecionamento 404
    const redirectEnabled = await SystemConfig.findOne({
      where: { chave: '404_redirect_enabled' }
    });

    const redirectType = await SystemConfig.findOne({
      where: { chave: '404_redirect_type' }
    });

    // Se redirecionamento está ativado
    if (redirectEnabled && redirectEnabled.valor === 'true') {
      const type = redirectType ? redirectType.valor : '301';

      if (type === '410') {
        // 410 Gone - Conteúdo removido permanentemente
        return res.status(410).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Conteúdo Removido - Obuxixo Gospel</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              h1 { color: #e74c3c; }
              p { color: #666; margin: 20px 0; }
              a { color: #3498db; text-decoration: none; font-weight: bold; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>⚠️ Conteúdo Removido</h1>
            <p>Esta página foi permanentemente removida do nosso site.</p>
            <p><a href="/">← Voltar para a página inicial</a></p>
          </body>
          </html>
        `);
      } else {
        // 301 Redirect - Redirecionar para home
        return res.redirect(301, '/');
      }
    }

    // Se redirecionamento está desativado, mostrar página 404 normal
    const recentArticles = await Article.findAll({
      where: { publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 3
    });

    res.status(404).render('404', {
      recentArticles,
      user: req.session.userId ? {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      } : null
    });
  } catch (error) {
    console.error('Erro ao carregar página 404:', error);
    res.status(404).send('Página não encontrada');
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);

  // Iniciar serviço de postagem automática
  try {
    const autoPostService = require('./services/AutoPostService');
    await autoPostService.start();
  } catch (error) {
    console.error('❌ Erro ao iniciar serviço de postagem automática:', error);
  }

  // Iniciar scheduler de publicação de matérias agendadas
  // Executa a cada 1 minuto
  console.log('📅 Scheduler de publicação agendada iniciado (verifica a cada 1 minuto)');
  setInterval(async () => {
    await publishScheduledPosts();
  }, 60000); // 60000ms = 1 minuto

  // Executar imediatamente ao iniciar
  await publishScheduledPosts();
});
