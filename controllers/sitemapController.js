const { Article } = require('../models');

exports.generateSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
    
    console.log('🗺️ Gerando sitemap...');
    
    // Buscar todos os artigos publicados
    const articles = await Article.findAll({
      where: { publicado: true },
      order: [['dataPublicacao', 'DESC']]
    });

    console.log(`📄 Encontrados ${articles.length} artigos publicados`);

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

    // Categorias
    const categories = ['g1', 'ge', 'gshow', 'quem', 'valor', 'globoplay'];
    categories.forEach(cat => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/categoria/${cat}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    // Artigos
    articles.forEach(article => {
      if (article.urlAmigavel) {
        const lastmod = article.updatedAt || article.dataPublicacao || new Date();
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/noticia/${article.urlAmigavel}</loc>\n`;
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

exports.generateRobotsTxt = (req, res) => {
  const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /dashboard/
Disallow: /login
Disallow: /api/

# Allow important pages
Allow: /noticia/
Allow: /categoria/
Allow: /busca
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
};
