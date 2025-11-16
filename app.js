const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const multer = require('multer');
require('dotenv').config();

// Sequelize MySQL
const { sequelize, Article, User, Media, SystemConfig, Page } = require('./models');
const AIService = require('./services/AIService');

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
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Erro: Apenas imagens, vídeos, áudios e PDFs são permitidos!');
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function para gerar URLs de artigos
app.locals.getArticleUrl = function(article) {
  const categoryRoutes = {
    'g1': 'noticia',
    'ge': 'musica',
    'gshow': 'evento',
    'quem': 'ministerio',
    'valor': 'estudo'
  };
  const routeName = categoryRoutes[article.categoria] || 'noticia';
  return `/${routeName}/${article.urlAmigavel}`;
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
const { isAuthenticated, isAdmin } = require('./middleware/auth');

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
    const articles = await Article.findAll({
      order: [['dataPublicacao', 'DESC']]
    });
    
    res.render('dashboard/posts/index', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      articles,
      success: req.query.success
    });
  } catch (error) {
    console.error('Erro ao carregar posts:', error);
    res.status(500).send('Erro ao carregar posts');
  }
});

app.get('/dashboard/posts/novo', isAuthenticated, (req, res) => {
  res.render('dashboard/posts/form', {
    user: {
      nome: req.session.userName,
      email: req.session.userEmail,
      role: req.session.userRole
    },
    isEdit: false,
    article: {}
  });
});

app.post('/dashboard/posts/criar', isAuthenticated, async (req, res) => {
  try {
    const { titulo, descricao, conteudo, imagem, categoria, subcategoria, autor, publicado, destaque } = req.body;
    
    console.log('Dados recebidos:', { titulo, descricao, categoria, imagem });
    
    // Validar campos obrigatórios
    if (!titulo || !descricao || !conteudo || !imagem || !categoria) {
      return res.status(400).send('Campos obrigatórios faltando');
    }
    
    // Gerar URL amigável
    const urlAmigavel = titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now();
    
    const article = await Article.create({
      titulo,
      descricao,
      conteudo,
      imagem,
      categoria,
      subcategoria: subcategoria || null,
      autor: autor || 'Redação Obuxixo Gospel',
      publicado: publicado === 'true' || publicado === true,
      destaque: destaque === 'true' || destaque === true,
      dataPublicacao: new Date(),
      visualizacoes: 0,
      urlAmigavel
    });
    
    console.log('Post criado com sucesso:', article.id);
    res.redirect('/dashboard/posts?success=Post criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar post:', error);
    console.error('Stack:', error.stack);
    res.status(500).send(`Erro ao criar post: ${error.message}`);
  }
});

app.get('/dashboard/posts/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).send('Post não encontrado');
    }
    
    res.render('dashboard/posts/form', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      isEdit: true,
      article
    });
  } catch (error) {
    console.error('Erro ao carregar post:', error);
    res.status(500).send('Erro ao carregar post');
  }
});

app.post('/dashboard/posts/editar/:id', isAuthenticated, async (req, res) => {
  try {
    const { titulo, descricao, conteudo, imagem, categoria, subcategoria, autor, publicado, destaque } = req.body;
    
    const article = await Article.findByPk(req.params.id);
    
    if (!article) {
      return res.status(404).send('Post não encontrado');
    }
    
    await article.update({
      titulo,
      descricao,
      conteudo,
      imagem,
      categoria,
      subcategoria: subcategoria || null,
      autor: autor || 'Redação Obuxixo Gospel',
      publicado: publicado === 'true',
      destaque: destaque === 'true'
    });
    
    res.redirect('/dashboard/posts?success=Post atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    res.status(500).send('Erro ao atualizar post');
  }
});

app.delete('/dashboard/posts/deletar/:id', isAuthenticated, async (req, res) => {
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
    const [categories] = await sequelize.query('SELECT * FROM categories ORDER BY nome ASC');
    
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
app.get('/dashboard/usuarios', isAuthenticated, userController.listarUsuarios);
app.get('/dashboard/usuarios/novo', isAuthenticated, userController.novoUsuarioForm);
app.post('/dashboard/usuarios', isAuthenticated, userController.criarUsuario);
app.get('/dashboard/usuarios/:id/editar', isAuthenticated, userController.editarUsuarioForm);
app.put('/dashboard/usuarios/:id', isAuthenticated, userController.atualizarUsuario);
app.delete('/dashboard/usuarios/:id', isAuthenticated, userController.deletarUsuario);
app.post('/dashboard/usuarios/:id/toggle-status', isAuthenticated, userController.toggleStatus);

// CONFIGURAÇÕES
const configController = require('./controllers/configController');
app.get('/dashboard/configuracoes', isAuthenticated, configController.getAllConfigs);
app.post('/dashboard/configuracoes', isAuthenticated, configController.updateConfigs);

// API de configurações
app.get('/api/config/:chave', configController.getConfig);
app.post('/api/config/:chave', isAuthenticated, configController.setConfig);

// PÁGINAS ESTÁTICAS
const pageController = require('./controllers/pageController');
app.get('/dashboard/paginas', isAuthenticated, pageController.index);
app.get('/dashboard/paginas/novo', isAuthenticated, pageController.novo);
app.get('/dashboard/paginas/:id/editar', isAuthenticated, pageController.editar);
app.post('/dashboard/paginas/criar', isAuthenticated, pageController.criar);
app.post('/dashboard/paginas/:id/atualizar', isAuthenticated, pageController.atualizar);
app.delete('/dashboard/paginas/:id', isAuthenticated, pageController.deletar);

// Rota pública para exibir páginas
app.get('/pagina/:slug', pageController.exibir);

// BIBLIOTECA DE MÍDIA
app.post('/dashboard/media/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }

    const file = req.file;
    const url = `/uploads/${file.filename}`;
    
    // Determinar tipo
    let tipo = 'documento';
    if (file.mimetype.startsWith('image/')) tipo = 'imagem';
    else if (file.mimetype.startsWith('video/')) tipo = 'video';
    else if (file.mimetype.startsWith('audio/')) tipo = 'audio';

    // Salvar no banco
    const media = await Media.create({
      nome: file.filename,
      nomeOriginal: file.originalname,
      tipo: tipo,
      mimeType: file.mimetype,
      tamanho: file.size,
      url: url,
      userId: req.session.userId
    });

    res.json({ 
      success: true, 
      media: {
        id: media.id,
        url: url,
        tipo: tipo,
        nome: file.originalname
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

    // Gerar nome único
    const ext = url.split('.').pop().split('?')[0] || 'jpg';
    const filename = `bing-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
    const filepath = path.join(__dirname, 'public', 'uploads', filename);

    // Salvar arquivo
    const fs = require('fs');
    fs.writeFileSync(filepath, response.data);

    const fileUrl = `/uploads/${filename}`;
    const fileSize = response.data.length;

    // Salvar no banco
    const media = await Media.create({
      nome: filename,
      nomeOriginal: descricao || 'Imagem do Bing',
      tipo: 'imagem',
      mimeType: response.headers['content-type'] || 'image/jpeg',
      tamanho: fileSize,
      url: fileUrl,
      userId: req.session.userId
    });

    res.json({ 
      success: true, 
      media: {
        id: media.id,
        url: fileUrl,
        tipo: 'imagem',
        nome: descricao || 'Imagem do Bing'
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

// Sitemap e Robots.txt
const sitemapController = require('./controllers/sitemapController');
app.get('/sitemap.xml', sitemapController.generateSitemap);
app.get('/robots.txt', sitemapController.generateRobotsTxt);

// Rotas de páginas públicas
app.get('/', async (req, res) => {
  try {
    const destaque = await Article.findOne({ 
      where: { destaque: true, publicado: true },
      order: [['dataPublicacao', 'DESC']]
    });
    
    const g1Articles = await Article.findAll({ 
      where: { categoria: 'g1', publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 6
    });
    
    const geArticles = await Article.findAll({ 
      where: { categoria: 'ge', publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 6
    });
    
    const gshowArticles = await Article.findAll({ 
      where: { categoria: 'gshow', publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 6
    });
    
    const quemArticles = await Article.findAll({ 
      where: { categoria: 'quem', publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 4
    });
    
    const valorArticles = await Article.findAll({ 
      where: { categoria: 'valor', publicado: true },
      order: [['dataPublicacao', 'DESC']],
      limit: 4
    });

    res.render('index', {
      destaque,
      g1Articles,
      geArticles,
      gshowArticles,
      quemArticles,
      valorArticles
    });
  } catch (error) {
    console.error('Erro ao carregar homepage:', error);
    res.status(500).send('Erro ao carregar página');
  }
});

// Rotas dinâmicas por categoria (noticia, musica, evento, ministerio, estudo)
const categoryRoutes = {
  'g1': 'noticia',
  'ge': 'musica',
  'gshow': 'evento',
  'quem': 'ministerio',
  'valor': 'estudo'
};

// Criar rotas para cada categoria
Object.entries(categoryRoutes).forEach(([categoryCode, routeName]) => {
  app.get(`/${routeName}/:slug`, async (req, res) => {
    try {
      const article = await Article.findOne({ 
        where: { urlAmigavel: req.params.slug, publicado: true }
      });
      
      if (!article) {
        return res.status(404).send('Conteúdo não encontrado');
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

      res.render('article', { 
        article, 
        related,
        user: req.user || null
      });
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      res.status(500).send('Erro ao carregar conteúdo');
    }
  });
});

// Rota legada /noticia/ (redireciona para categoria apropriada)
app.get('/noticia/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ 
      where: { urlAmigavel: req.params.slug, publicado: true }
    });
    
    if (!article) {
      return res.status(404).send('Notícia não encontrada');
    }

    // Redirecionar para a categoria correta
    const categoryRoute = categoryRoutes[article.categoria] || 'noticia';
    return res.redirect(301, `/${categoryRoute}/${article.urlAmigavel}`);
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

    const { count, rows: articles } = await Article.findAndCountAll({ 
      where: { 
        categoria: req.params.categoria,
        publicado: true
      },
      order: [['dataPublicacao', 'DESC']],
      offset: offset,
      limit: limit
    });

    res.render('category', {
      categoria: req.params.categoria,
      articles,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
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

    res.render('search', {
      query,
      articles,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
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
    
    // Se tem link, extrair conteúdo
    if (link) {
      console.log('Extraindo conteúdo do link:', link);
      const conteudoExtraido = await AIService.extrairConteudoURL(link);
      
      // Se não conseguiu extrair e não tem texto manual, retornar erro
      if (!conteudoExtraido || conteudoExtraido.includes('Não foi possível extrair')) {
        if (!conteudo) {
          return res.status(400).json({ 
            error: 'Não foi possível extrair o conteúdo automaticamente. Por favor, cole o texto manualmente no campo opcional.' 
          });
        }
      } else {
        // Usar conteúdo extraído (ou combinar com manual se houver)
        conteudo = conteudo ? `${conteudoExtraido}\n\n${conteudo}` : conteudoExtraido;
      }
    }

    if (!conteudo || conteudo.trim().length < 50) {
      return res.status(400).json({ error: 'Conteúdo insuficiente para gerar matéria (mínimo 50 caracteres)' });
    }

    // Construir o tema baseado no título sugerido ou nas informações
    let tema = tituloSugerido || conteudo.substring(0, 200);
    
    // Se tem título sugerido, adicionar as informações como contexto adicional
    if (tituloSugerido && informacoes) {
      tema = `${tituloSugerido}\n\nCONTEXTO E INFORMAÇÕES:\n${informacoes}`;
    }

    // Usar o método criarMateria (igual ao "Por Tema") para gerar conteúdo mais humanizado
    const materia = await AIService.criarMateria(
      tema,
      categoria || 'Notícias',
      palavrasChave || '',
      false, // pesquisarInternet = false (já temos as informações)
      link ? [link] : [] // links para referência
    );
    
    res.json({ success: true, materia });
  } catch (error) {
    console.error('❌ Erro ao criar matéria:', error);
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

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).send('Página não encontrada');
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
});
