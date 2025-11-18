const { Article, Category, Page } = require('../models');

exports.generateSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    
    console.log('🗺️ Gerando sitemap...');
    
    // Buscar todos os artigos publicados
    const articles = await Article.findAll({
      where: { publicado: true },
      order: [['dataPublicacao', 'DESC']]
    });

    // Buscar todas as categorias
    const categories = await Category.findAll({
      order: [['nome', 'ASC']]
    });

    // Buscar todas as páginas ativas
    const pages = await Page.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC']]
    });

    console.log(`📄 Encontrados ${articles.length} artigos, ${categories.length} categorias e ${pages.length} páginas`);

    // Gerar XML do sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Página inicial
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Página de busca
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/busca</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';

    // Categorias do banco de dados
    categories.forEach(cat => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/categoria/${cat.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(cat.updatedAt || cat.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    // Páginas do banco de dados
    pages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/pagina/${page.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(page.updatedAt || page.createdAt).toISOString()}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Artigos - usar slug da categoria diretamente do banco
    articles.forEach(article => {
      if (article.urlAmigavel && article.categoria) {
        const lastmod = article.updatedAt || article.dataPublicacao || new Date();
        
        // Usa o slug da categoria diretamente (já vem do banco)
        const categorySlug = article.categoria;
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/${categorySlug}/${article.urlAmigavel}</loc>\n`;
        xml += `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';

    console.log('✅ Sitemap gerado com sucesso');

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar sitemap:', error);
    console.error('Stack:', error.stack);
    res.status(500).send(`Erro ao gerar sitemap: ${error.message}`);
  }
};

// Gerar sitemap específico para Google News (últimas 48h)
exports.generateNewsSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    
    console.log('📰 Gerando Google News Sitemap...');
    
    // Buscar artigos publicados nas últimas 48 horas
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
    
    const recentArticles = await Article.findAll({
      where: { 
        publicado: true,
        dataPublicacao: {
          [require('sequelize').Op.gte]: twoDaysAgo
        }
      },
      order: [['dataPublicacao', 'DESC']],
      limit: 1000 // Google News aceita até 1000 artigos
    });

    console.log(`📄 Encontrados ${recentArticles.length} artigos recentes para Google News`);

    // Gerar XML do Google News Sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';

    // Artigos recentes
    recentArticles.forEach(article => {
      if (article.urlAmigavel && article.categoria) {
        const pubDate = new Date(article.dataPublicacao);
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/${article.categoria}/${article.urlAmigavel}</loc>\n`;
        xml += '    <news:news>\n';
        xml += '      <news:publication>\n';
        xml += '        <news:name>Obuxixo Gospel</news:name>\n';
        xml += '        <news:language>pt</news:language>\n';
        xml += '      </news:publication>\n';
        xml += `      <news:publication_date>${pubDate.toISOString()}</news:publication_date>\n`;
        xml += `      <news:title>${escapeXml(article.titulo)}</news:title>\n`;
        
        // Adicionar keywords se houver
        if (article.tags) {
          xml += `      <news:keywords>${escapeXml(article.tags)}</news:keywords>\n`;
        }
        
        xml += '    </news:news>\n';
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';

    console.log('✅ Google News Sitemap gerado com sucesso');

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erro ao gerar Google News Sitemap:', error);
    console.error('Stack:', error.stack);
    res.status(500).send(`Erro ao gerar Google News Sitemap: ${error.message}`);
  }
};

// Função auxiliar para escapar caracteres XML
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

exports.generateRobotsTxt = (req, res) => {
  const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/news-sitemap.xml

# Disallow admin areas
Disallow: /dashboard/
Disallow: /login
Disallow: /api/
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
};
