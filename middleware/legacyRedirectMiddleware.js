/**
 * Middleware para redirecionar URLs antigas/quebradas
 * Criado para lidar com posts deletados após recomeço do site
 */

module.exports = function (req, res, next) {
  const url = req.path;

  // Padrões de URLs antigas que devem ser redirecionadas
  // Padrões de URLs antigas que devem ser redirecionadas
  const legacyPatterns = [
    // Posts antigos no formato /YYYY/MM/DD/titulo/
    /^\/\d{4}\/\d{2}\/\d{2}\/.+/,

    // URLs do WordPress antigo
    /^\/wp-content\/.+/,
    // /^\/feed\/?$/, // Removido para permitir novo feed RSS nativo
    /^\/feed\/.+/,

    // Sitemaps antigos
    /^\/post-sitemap\d*\.xml$/,

    // Páginas de autor antigas
    /^\/author\/.+/,

    // Blog antigo
    /^\/blog\/.+/,

    // Tags antigas (com ou sem feed/amp)
    /^\/tag\/.+/,

    // Categorias antigas
    /^\/category\/.+/,

    // Outros padrões problemáticos
    /^\/show-da-fe-.+/,
    /^\/cantor-.+\/amp\/?$/,
    /^\/professor-.+\/amp\/?$/,
    /^\/presspulse-.+/,

    // Correção de typo (politicia -> politica)
    /^\/politicia\/.+/,

    // URLs de login do WordPress antigo
    /^\/wp-login\.php.*/
  ];

  // Verificar se a URL corresponde a algum padrão antigo
  const isLegacyUrl = legacyPatterns.some(pattern => pattern.test(url));

  if (isLegacyUrl) {
    // Tentar extrair palavras-chave para busca
    let keywords = '';

    // Extrair de /tag/slug
    if (url.includes('/tag/')) {
      const match = url.match(/\/tag\/([^/]+)/);
      if (match) keywords = match[1];
    }
    // Extrair de /category/slug
    else if (url.includes('/category/')) {
      const match = url.match(/\/category\/([^/]+)/);
      if (match) keywords = match[1];
    }
    // Correção direta de typo: politicia -> politica
    else if (url.includes('/politicia/')) {
      const newUrl = url.replace('/politicia/', '/politica/');
      console.log(`🔄 Redirecionando Typo: ${url} -> ${newUrl}`);
      return res.redirect(301, newUrl);
    }
    // Extrair de datas /YYYY/MM/DD/slug
    else if (url.match(/\/\d{4}\/\d{2}\/\d{2}\//)) {
      const parts = url.split('/');
      // O slug geralmente é a parte após a data
      // /2019/07/29/slug/ -> parts[4]
      if (parts.length >= 5) keywords = parts[4];
    }
    // Extrair de wp-login.php?redirect_to=...
    else if (url.includes('wp-login.php') && req.query.redirect_to) {
      const redirectTo = decodeURIComponent(req.query.redirect_to);
      // Tentar extrair slug da URL de redirecionamento
      // Ex: https://site.com/2019/09/16/slug/
      const match = redirectTo.match(/\/\d{4}\/\d{2}\/\d{2}\/([^/]+)/);
      if (match) {
        keywords = match[1];
      } else {
        // Tentar pegar o último segmento se não tiver data
        const parts = redirectTo.split('/').filter(p => p);
        if (parts.length > 0) keywords = parts[parts.length - 1];
      }
    }

    // Limpar keywords
    if (keywords) {
      keywords = keywords
        .replace(/-/g, ' ')
        .replace(/\/$/, '') // Remove barra final
        .replace(/\b(amp|feed)\b/g, '') // Remove amp/feed
        .trim();
    }

    // Log para monitoramento
    console.log(`🔄 Redirecionando URL antiga: ${url} -> ${keywords ? '/busca?q=' + keywords : '/'}`);

    if (keywords && keywords.length > 2) {
      return res.redirect(301, `/busca?q=${encodeURIComponent(keywords)}`);
    }

    return res.redirect(301, '/');
  }

  // Se não for URL antiga, continuar normalmente
  next();
};
