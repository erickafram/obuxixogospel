const { Article, Category, Page } = require('../models');

exports.generateSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
    
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
Allow: /categoria/
Allow: /busca
Allow: /noticias/
Allow: /musica/
Allow: /eventos/
Allow: /ministerio/
Allow: /testemunhos/
Allow: /estudo-biblico/
Allow: /familia/
Allow: /jovens/
`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
};
