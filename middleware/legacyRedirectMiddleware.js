/**
 * Middleware para redirecionar URLs antigas/quebradas
 * Criado para lidar com posts deletados após recomeço do site
 */

module.exports = function (req, res, next) {
  const url = req.path;

  // Padrões de URLs antigas que devem ser redirecionadas
  const legacyPatterns = [
    // Posts antigos no formato /YYYY/MM/DD/titulo/
    /^\/\d{4}\/\d{2}\/\d{2}\/.+/,

    // URLs do WordPress antigo
    /^\/wp-content\/.+/,
    /^\/feed\/?$/,
    /^\/feed\/.+/,

    // Sitemaps antigos
    /^\/post-sitemap\d*\.xml$/,

    // Páginas de autor antigas
    /^\/author\/.+/,

    // Blog antigo
    /^\/blog\/.+/,

    // Tags antigas
    /^\/tag\/.+\/feed\/?$/,
    /^\/tag\/.+\/amp\/?$/,

    // Categorias antigas
    /^\/category\/.+\/amp\/?$/,
    /^\/category\/.+\/feed\/?$/,

    // Outros padrões problemáticos
    /^\/show-da-fe-.+/,
    /^\/cantor-.+\/amp\/?$/,
    /^\/professor-.+\/amp\/?$/,
    /^\/presspulse-.+/
  ];

  // Verificar se a URL corresponde a algum padrão antigo
  const isLegacyUrl = legacyPatterns.some(pattern => pattern.test(url));

  if (isLegacyUrl) {
    // Log para monitoramento (opcional - remover em produção se gerar muito log)
    console.log(`🔄 Redirecionando URL antiga: ${url} -> /`);

    // ESTRATÉGIA ATUALIZADA: Redirecionar 301 para a home para recuperar tráfego
    // O usuário relatou perda de acessos, então 410 (Gone) está prejudicando o SEO
    // Redirecionar para a home mantém o usuário no site

    return res.redirect(301, '/');
  }

  // Se não for URL antiga, continuar normalmente
  next();
};
