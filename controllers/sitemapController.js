const { Article, Category, Page } = require('../models');
const { Op } = require('sequelize');

const BASE_URL = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
const SITE_NAME = 'O Buxixo Gospel';
const MAX_URLS_PER_SITEMAP = 1000; // Google permite até 50.000, mas sitemaps menores são processados mais rápido

// Função auxiliar para escapar caracteres XML
function escapeXml(unsafe) {
  if (!unsafe) return '';
  // Remover caracteres de controle inválidos (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F)
  const clean = unsafe.toString().replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Função para obter URL da imagem
function getImageUrl(imagem) {
  if (!imagem) return '';
  if (imagem.startsWith('http')) return imagem;
  return BASE_URL + (imagem.startsWith('/') ? imagem : '/' + imagem);
}

// Função para codificar URLs para XML (encodeURI + escapeXml)
function safeUrl(url) {
  if (!url) return '';
  try {
    // encodeURI resolve espaços e caracteres especiais em URLs
    const encoded = encodeURI(url);
    // escapeXml resolve & < > " ' para o XML
    return escapeXml(encoded);
  } catch (e) {
    return escapeXml(url);
  }
}

// Headers padrão para todos os sitemaps
function setSitemapHeaders(res) {
  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1 hora de cache
  res.header('X-Robots-Tag', 'noindex'); // Sitemaps não devem ser indexados como páginas
}

// Resposta de erro padronizada em XML
function sendSitemapError(res, error, sitemapName) {
  console.error(`❌ Erro ao gerar ${sitemapName}:`, error);
  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('X-Content-Type-Options', 'nosniff');
  res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>\n<error>Erro ao gerar ${escapeXml(sitemapName)}: ${escapeXml(error.message)}</error>`);
}

// XSL stylesheet inline reference para sitemaps legíveis em navegadores
const XSL_SITEMAP_INDEX = `<?xml-stylesheet type="text/xsl" href="${BASE_URL}/sitemap-style.xsl"?>`;
const XSL_URLSET = `<?xml-stylesheet type="text/xsl" href="${BASE_URL}/sitemap-style.xsl"?>`;

// ============================================
// SITEMAP INDEX (Principal - estilo Yoast)
// ============================================
exports.generateSitemapIndex = async (req, res) => {
  try {
    console.log('🗺️ Gerando Sitemap Index...');
    setSitemapHeaders(res);

    // Contar total de artigos publicados para calcular páginas
    const agora = new Date();
    const totalArticles = await Article.count({
      where: { publicado: true, dataPublicacao: { [Op.lte]: agora } }
    });
    const totalPostPages = Math.ceil(totalArticles / MAX_URLS_PER_SITEMAP) || 1;

    // Buscar última modificação de cada tipo
    const [lastArticle, lastCategory, lastPage] = await Promise.all([
      Article.findOne({
        where: { publicado: true },
        order: [['updatedAt', 'DESC']],
        attributes: ['updatedAt']
      }),
      Category.findOne({
        order: [['updatedAt', 'DESC']],
        attributes: ['updatedAt']
      }),
      Page.findOne({
        where: { ativo: true },
        order: [['updatedAt', 'DESC']],
        attributes: ['updatedAt']
      })
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_SITEMAP_INDEX}\n`;
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Sitemap de Posts/Artigos (paginado)
    for (let page = 1; page <= totalPostPages; page++) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${safeUrl(BASE_URL + '/post-sitemap' + (page > 1 ? '-' + page : '') + '.xml')}</loc>\n`;
      if (lastArticle) {
        xml += `    <lastmod>${new Date(lastArticle.updatedAt).toISOString()}</lastmod>\n`;
      }
      xml += '  </sitemap>\n';
    }

    // Sitemap de Páginas
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/page-sitemap.xml')}</loc>\n`;
    if (lastPage) {
      xml += `    <lastmod>${new Date(lastPage.updatedAt).toISOString()}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';

    // Sitemap de Categorias
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/category-sitemap.xml')}</loc>\n`;
    if (lastCategory) {
      xml += `    <lastmod>${new Date(lastCategory.updatedAt).toISOString()}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';

    // Sitemap de Autores
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/author-sitemap.xml')}</loc>\n`;
    if (lastArticle) {
      xml += `    <lastmod>${new Date(lastArticle.updatedAt).toISOString()}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';

    // News Sitemap (Google News)
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/news-sitemap.xml')}</loc>\n`;
    if (lastArticle) {
      xml += `    <lastmod>${new Date(lastArticle.updatedAt).toISOString()}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';

    xml += '</sitemapindex>';

    console.log(`✅ Sitemap Index gerado com sucesso (${totalPostPages} página(s) de posts)`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'Sitemap Index');
  }
};


// ============================================
// POST SITEMAP (Artigos) - COM PAGINAÇÃO
// ============================================
exports.generatePostSitemap = async (req, res) => {
  try {
    // Extrair número da página do URL: /post-sitemap.xml = 1, /post-sitemap-2.xml = 2
    const pageMatch = req.path.match(/post-sitemap-?(\d+)?\.xml/);
    const page = pageMatch && pageMatch[1] ? parseInt(pageMatch[1]) : 1;
    const offset = (page - 1) * MAX_URLS_PER_SITEMAP;

    console.log(`📰 Gerando Post Sitemap (página ${page})...`);
    setSitemapHeaders(res);

    const agora = new Date();
    const articles = await Article.findAll({
      where: {
        publicado: true,
        dataPublicacao: { [Op.lte]: agora }
      },
      order: [['dataPublicacao', 'DESC']],
      limit: MAX_URLS_PER_SITEMAP,
      offset: offset,
      attributes: ['id', 'titulo', 'descricao', 'urlAmigavel', 'categoria', 'imagem', 'dataPublicacao', 'updatedAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_URLSET}\n`;
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    articles.forEach(article => {
      if (article.urlAmigavel && article.categoria) {
        const lastmod = article.updatedAt || article.dataPublicacao;
        const imageUrl = getImageUrl(article.imagem);
        const articleUrl = `${BASE_URL}/${article.categoria}/${article.urlAmigavel}`;

        // Calcular prioridade dinâmica baseada na idade do artigo
        const ageInDays = (agora - new Date(article.dataPublicacao)) / (1000 * 60 * 60 * 24);
        let priority = '0.8';
        if (ageInDays <= 7) priority = '0.9';
        else if (ageInDays <= 30) priority = '0.8';
        else if (ageInDays <= 90) priority = '0.7';
        else priority = '0.6';

        xml += '  <url>\n';
        xml += `    <loc>${safeUrl(articleUrl)}</loc>\n`;
        xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
        xml += `    <priority>${priority}</priority>\n`;

        if (imageUrl) {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${safeUrl(imageUrl)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(article.titulo)}</image:title>\n`;
          xml += `      <image:caption>${escapeXml(article.descricao || article.titulo)}</image:caption>\n`;
          xml += '    </image:image>\n';
        }

        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';

    console.log(`✅ Post Sitemap (p${page}) gerado: ${articles.length} artigos`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'Post Sitemap');
  }
};

// ============================================
// PAGE SITEMAP (Páginas estáticas)
// ============================================
exports.generatePageSitemap = async (req, res) => {
  try {
    console.log('📄 Gerando Page Sitemap...');
    setSitemapHeaders(res);

    const pages = await Page.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC']],
      attributes: ['titulo', 'slug', 'updatedAt', 'createdAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_URLSET}\n`;
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Página inicial - maior prioridade
    xml += '  <url>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/')}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Páginas do banco de dados
    pages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/pagina/${page.slug}`)}</loc>\n`;
      xml += `    <lastmod>${new Date(page.updatedAt || page.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Page Sitemap gerado: ${pages.length + 1} páginas`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'Page Sitemap');
  }
};

// ============================================
// CATEGORY SITEMAP (Categorias)
// ============================================
exports.generateCategorySitemap = async (req, res) => {
  try {
    console.log('📁 Gerando Category Sitemap...');
    setSitemapHeaders(res);

    const categories = await Category.findAll({
      order: [['ordem', 'ASC']],
      attributes: ['nome', 'slug', 'updatedAt', 'createdAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_URLSET}\n`;
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    categories.forEach(cat => {
      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/categoria/${cat.slug}`)}</loc>\n`;
      xml += `    <lastmod>${new Date(cat.updatedAt || cat.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Category Sitemap gerado: ${categories.length} categorias`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'Category Sitemap');
  }
};

// ============================================
// AUTHOR SITEMAP (Autores - E-E-A-T)
// ============================================
exports.generateAuthorSitemap = async (req, res) => {
  try {
    console.log('👤 Gerando Author Sitemap...');
    setSitemapHeaders(res);

    // Buscar autores únicos com a data do último artigo publicado
    const articles = await Article.findAll({
      where: { publicado: true },
      attributes: [
        'autor',
        [require('sequelize').fn('MAX', require('sequelize').col('updatedAt')), 'lastUpdated'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalArticles']
      ],
      group: ['autor']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_URLSET}\n`;
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    articles.forEach(a => {
      if (!a.autor) return;
      const autorSlug = a.autor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const lastmod = a.getDataValue('lastUpdated');

      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/autor/${autorSlug}`)}</loc>\n`;
      if (lastmod) {
        xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
      }
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Author Sitemap gerado: ${articles.length} autores`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'Author Sitemap');
  }
};


// ============================================
// NEWS SITEMAP (Google News - últimas 48h)
// ============================================
exports.generateNewsSitemap = async (req, res) => {
  try {
    console.log('📰 Gerando Google News Sitemap...');
    setSitemapHeaders(res);

    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const agora = new Date();
    const recentArticles = await Article.findAll({
      where: {
        publicado: true,
        dataPublicacao: {
          [Op.gte]: twoDaysAgo,
          [Op.lte]: agora
        }
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 1000,
      attributes: ['titulo', 'descricao', 'urlAmigavel', 'categoria', 'imagem', 'dataPublicacao', 'updatedAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `${XSL_URLSET}\n`;
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    recentArticles.forEach(article => {
      if (article.urlAmigavel && article.categoria) {
        const pubDate = new Date(article.dataPublicacao);
        const imageUrl = getImageUrl(article.imagem);

        xml += '  <url>\n';
        xml += `    <loc>${safeUrl(`${BASE_URL}/${article.categoria}/${article.urlAmigavel}`)}</loc>\n`;
        xml += '    <news:news>\n';
        xml += '      <news:publication>\n';
        xml += `        <news:name>${escapeXml(SITE_NAME)}</news:name>\n`;
        xml += '        <news:language>pt</news:language>\n';
        xml += '      </news:publication>\n';
        xml += `      <news:publication_date>${pubDate.toISOString()}</news:publication_date>\n`;
        xml += `      <news:title>${escapeXml(article.titulo)}</news:title>\n`;
        xml += '    </news:news>\n';

        // Imagem - CRUCIAL para Google News/Discover
        if (imageUrl) {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${safeUrl(imageUrl)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(article.titulo)}</image:title>\n`;
          xml += `      <image:caption>${escapeXml(article.descricao || article.titulo)}</image:caption>\n`;
          xml += '    </image:image>\n';
        }

        xml += `    <lastmod>${new Date(article.updatedAt || article.dataPublicacao).toISOString()}</lastmod>\n`;
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';

    console.log(`✅ News Sitemap gerado: ${recentArticles.length} artigos`);
    res.send(xml);
  } catch (error) {
    sendSitemapError(res, error, 'News Sitemap');
  }
};

// ============================================
// ROBOTS.TXT
// ============================================
exports.generateRobotsTxt = (req, res) => {
  const robotsTxt = `# Robots.txt - ${SITE_NAME}
# Última atualização: ${new Date().toISOString().split('T')[0]}

# Regras para todos os bots
User-agent: *
Allow: /

# Bloquear áreas administrativas e APIs
Disallow: /dashboard/
Disallow: /login
Disallow: /logout
Disallow: /api/

# Bloquear URLs legadas do WordPress
Disallow: /wp-content/
Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /wp-login.php
Disallow: /wp-json/

# Bloquear URLs de datas antigas (formato WordPress)
Disallow: /2017/
Disallow: /2018/
Disallow: /2019/
Disallow: /2020/
Disallow: /2021/
Disallow: /2022/
Disallow: /2023/
Disallow: /2024/

# Bloquear parâmetros de query desnecessários
Disallow: /*?amp=
Disallow: /*?noamp=
Disallow: /*&amp=
Disallow: /*&noamp=

# Bloquear tags e categorias antigas do WordPress
Disallow: /tag/
Disallow: /category/
Disallow: /author/

# Bloquear página de busca (resultados dinâmicos não devem ser indexados)
Disallow: /busca
Disallow: /busca?*

# Crawl-delay para bots agressivos (Google ignora, mas Bing/Yandex respeitam)
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/news-sitemap.xml

# Host preferido
Host: ${BASE_URL.replace('https://', '')}
`;

  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400'); // 24h cache
  res.send(robotsTxt);
};

// ============================================
// SITEMAP LEGADO (mantém compatibilidade)
// ============================================
exports.generateSitemap = exports.generateSitemapIndex;
