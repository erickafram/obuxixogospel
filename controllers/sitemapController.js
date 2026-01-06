const { Article, Category, Page } = require('../models');
const { Op } = require('sequelize');

const BASE_URL = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';

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

// ============================================
// SITEMAP INDEX (Principal - estilo Yoast)
// ============================================
exports.generateSitemapIndex = async (req, res) => {
  try {
    console.log('🗺️ Gerando Sitemap Index...');

    // Definir Content-Type como XML imediatamente
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('X-Content-Type-Options', 'nosniff');

    // Buscar última modificação de cada tipo
    const lastArticle = await Article.findOne({
      where: { publicado: true },
      order: [['updatedAt', 'DESC']],
      attributes: ['updatedAt']
    });

    const lastCategory = await Category.findOne({
      order: [['updatedAt', 'DESC']],
      attributes: ['updatedAt']
    });

    const lastPage = await Page.findOne({
      where: { ativo: true },
      order: [['updatedAt', 'DESC']],
      attributes: ['updatedAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Sitemap de Posts/Artigos
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/post-sitemap.xml')}</loc>\n`;
    if (lastArticle) {
      xml += `    <lastmod>${new Date(lastArticle.updatedAt).toISOString()}</lastmod>\n`;
    }
    xml += '  </sitemap>\n';

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
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '  </sitemap>\n';

    // News Sitemap (Google News)
    xml += '  <sitemap>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/news-sitemap.xml')}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '  </sitemap>\n';

    xml += '</sitemapindex>';

    console.log('✅ Sitemap Index gerado com sucesso');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Sitemap Index:', error);
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>\n<error>Erro ao gerar sitemap: ${escapeXml(error.message)}</error>`);
  }
};


// ============================================
// POST SITEMAP (Artigos)
// ============================================
exports.generatePostSitemap = async (req, res) => {
  try {
    console.log('📰 Gerando Post Sitemap...');

    // Definir Content-Type como XML imediatamente
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('X-Content-Type-Options', 'nosniff');

    const agora = new Date();
    const articles = await Article.findAll({
      where: {
        publicado: true,
        dataPublicacao: { [Op.lte]: agora }
      },
      order: [['dataPublicacao', 'DESC']],
      attributes: ['id', 'titulo', 'descricao', 'urlAmigavel', 'categoria', 'imagem', 'dataPublicacao', 'updatedAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    articles.forEach(article => {
      if (article.urlAmigavel && article.categoria) {
        const lastmod = article.updatedAt || article.dataPublicacao;
        const imageUrl = getImageUrl(article.imagem);

        xml += '  <url>\n';
        xml += `    <loc>${safeUrl(`${BASE_URL}/${article.categoria}/${article.urlAmigavel}`)}</loc>\n`;
        xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';

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

    console.log(`✅ Post Sitemap gerado: ${articles.length} artigos`);
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Post Sitemap:', error);
    // Retornar XML de erro em vez de HTML
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>\n<error>Erro ao gerar sitemap: ${escapeXml(error.message)}</error>`);
  }
};

// ============================================
// PAGE SITEMAP (Páginas estáticas)
// ============================================
exports.generatePageSitemap = async (req, res) => {
  try {
    console.log('📄 Gerando Page Sitemap...');

    const pages = await Page.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC']],
      attributes: ['titulo', 'slug', 'updatedAt', 'createdAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Página inicial
    xml += '  <url>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/')}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Página de busca
    xml += '  <url>\n';
    xml += `    <loc>${safeUrl(BASE_URL + '/busca')}</loc>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.5</priority>\n';
    xml += '  </url>\n';

    // Páginas do banco
    pages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/pagina/${page.slug}`)}</loc>\n`;
      xml += `    <lastmod>${new Date(page.updatedAt || page.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Page Sitemap gerado: ${pages.length + 2} páginas`);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Page Sitemap:', error);
    res.status(500).send(`Erro: ${error.message}`);
  }
};

// ============================================
// CATEGORY SITEMAP (Categorias)
// ============================================
exports.generateCategorySitemap = async (req, res) => {
  try {
    console.log('📁 Gerando Category Sitemap...');

    const categories = await Category.findAll({
      order: [['ordem', 'ASC']],
      attributes: ['nome', 'slug', 'updatedAt', 'createdAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    categories.forEach(cat => {
      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/categoria/${cat.slug}`)}</loc>\n`;
      xml += `    <lastmod>${new Date(cat.updatedAt || cat.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Category Sitemap gerado: ${categories.length} categorias`);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Category Sitemap:', error);
    res.status(500).send(`Erro: ${error.message}`);
  }
};

// ============================================
// AUTHOR SITEMAP (Autores - E-E-A-T)
// ============================================
exports.generateAuthorSitemap = async (req, res) => {
  try {
    console.log('👤 Gerando Author Sitemap...');

    // Buscar autores únicos dos artigos
    const articles = await Article.findAll({
      where: { publicado: true },
      attributes: ['autor'],
      group: ['autor']
    });

    const autores = [...new Set(articles.map(a => a.autor).filter(Boolean))];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    autores.forEach(autor => {
      const autorSlug = autor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      xml += '  <url>\n';
      xml += `    <loc>${safeUrl(`${BASE_URL}/autor/${autorSlug}`)}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    console.log(`✅ Author Sitemap gerado: ${autores.length} autores`);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Author Sitemap:', error);
    res.status(500).send(`Erro: ${error.message}`);
  }
};


// ============================================
// NEWS SITEMAP (Google News - últimas 48h)
// ============================================
exports.generateNewsSitemap = async (req, res) => {
  try {
    console.log('📰 Gerando Google News Sitemap...');

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
      attributes: ['titulo', 'descricao', 'urlAmigavel', 'categoria', 'imagem', 'keywords', 'dataPublicacao', 'updatedAt']
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
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
        xml += '        <news:name>Obuxixo Gospel</news:name>\n';
        xml += '        <news:language>pt</news:language>\n';
        xml += '      </news:publication>\n';
        xml += `      <news:publication_date>${pubDate.toISOString()}</news:publication_date>\n`;
        xml += `      <news:title>${escapeXml(article.titulo)}</news:title>\n`;

        if (article.keywords) {
          xml += `      <news:keywords>${escapeXml(article.keywords)}</news:keywords>\n`;
        }

        xml += '    </news:news>\n';

        // Imagem - IMPORTANTE para Google News/Discover
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
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar News Sitemap:', error);
    res.status(500).send(`Erro: ${error.message}`);
  }
};

// ============================================
// ROBOTS.TXT
// ============================================
exports.generateRobotsTxt = (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /

# Bloquear áreas administrativas
Disallow: /dashboard/
Disallow: /login/
Disallow: /api/
Disallow: /admin/

# Bloquear URLs antigas do WordPress
Disallow: /wp-content/
Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /wp-login.php

# Bloquear URLs com datas antigas (formato WordPress)
Disallow: /2017/
Disallow: /2018/
Disallow: /2019/
Disallow: /2020/
Disallow: /2021/
Disallow: /2022/
Disallow: /2023/
Disallow: /2024/

# Bloquear parâmetros AMP antigos
Disallow: /*?amp=
Disallow: /*?noamp=
Disallow: /*&amp=
Disallow: /*&noamp=

# Bloquear lixo de ads
Disallow: /*adsbygoogle*

# Bloquear tags e categorias antigas
Disallow: /tag/
Disallow: /category/
Disallow: /author/

# Bloquear busca (evita indexação de páginas de resultado vazias - soft 404)
Disallow: /busca
Disallow: /busca?
Disallow: /busca/*

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/news-sitemap.xml

# RSS Feed
# ${BASE_URL}/feed
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
};

// ============================================
// SITEMAP LEGADO (mantém compatibilidade)
// ============================================
exports.generateSitemap = exports.generateSitemapIndex;
