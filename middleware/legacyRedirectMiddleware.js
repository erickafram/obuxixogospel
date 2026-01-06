/**
 * Middleware para redirecionar URLs antigas/quebradas
 * Criado para lidar com posts deletados após recomeço do site
 */

module.exports = function (req, res, next) {
  const url = req.path;
  const fullUrl = req.originalUrl;

  // Remover parâmetros AMP antigos e redirecionar
  if (req.query.amp === '1' || req.query.noamp === 'mobile') {
    const cleanUrl = url.replace(/\/$/, '');
    console.log(`🔄 Removendo parâmetro AMP antigo: ${fullUrl} -> ${cleanUrl}`);
    return res.redirect(301, cleanUrl);
  }

  // Remover lixo de adsbygoogle das URLs
  if (url.includes('/adsbygoogle')) {
    const cleanUrl = url.split('/adsbygoogle')[0];
    console.log(`🔄 Removendo lixo adsbygoogle: ${url} -> ${cleanUrl || '/'}`);
    return res.redirect(301, cleanUrl || '/');
  }

  // Correção de typo: /politicia/ -> /politica/
  if (url.includes('/politicia/')) {
    const newUrl = url.replace('/politicia/', '/politica/');
    console.log(`🔄 Corrigindo typo politicia: ${url} -> ${newUrl}`);
    return res.redirect(301, newUrl);
  }

  // Correção: /noticia/ (singular) -> /noticias/ (plural)
  if (url.startsWith('/noticia/') && !url.startsWith('/noticias/')) {
    const newUrl = url.replace('/noticia/', '/noticias/');
    console.log(`🔄 Corrigindo singular noticia: ${url} -> ${newUrl}`);
    return res.redirect(301, newUrl);
  }

  // Remover números longos no final da URL (timestamps acidentais)
  const timestampMatch = url.match(/^(\/[^/]+\/[^/]+)-\d{10,}$/);
  if (timestampMatch) {
    const cleanUrl = timestampMatch[1];
    console.log(`🔄 Removendo timestamp da URL: ${url} -> ${cleanUrl}`);
    return res.redirect(301, cleanUrl);
  }

  // Remover timestamps de URLs com categoria/slug-timestamp
  const timestampMatch2 = url.match(/^(\/[^/]+\/[^/]+)-\d{10,}(\/.*)?$/);
  if (timestampMatch2) {
    const cleanUrl = timestampMatch2[1] + (timestampMatch2[2] || '');
    console.log(`🔄 Removendo timestamp da URL: ${url} -> ${cleanUrl}`);
    return res.redirect(301, cleanUrl);
  }

  // Remover "porcento" e substituir por símbolo na URL
  if (url.includes('porcento')) {
    const cleanUrl = url.replace(/porcento/g, '%');
    console.log(`🔄 Corrigindo porcento na URL: ${url} -> ${cleanUrl}`);
    return res.redirect(301, cleanUrl);
  }

  // Padrões de URLs antigas que devem ser redirecionadas
  const legacyPatterns = [
    // Posts antigos no formato /YYYY/MM/DD/titulo/
    /^\/\d{4}\/\d{2}\/\d{2}\/.+/,

    // URLs do WordPress antigo
    /^\/wp-content\/.+/,
    /^\/wp-admin\/.*/,
    /^\/wp-includes\/.*/,
    // /^\/feed\/?$/, // Removido para permitir novo feed RSS nativo
    /^\/feed\/.+/,

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

    // URLs de login do WordPress antigo
    /^\/wp-login\.php.*/,

    // Rascunhos automáticos
    /^\/.*rascunho-automatico.*/,

    // URLs antigas sem categoria (slug direto na raiz com hífen)
    // Ex: /os-baroes-da-pisadinha-se-consagra-como-melhores-de-2021/
    // Mas NÃO capturar: /noticias, /politica, /geral, /autor, /pagina, /categoria, /busca
    /^\/[a-z0-9]+-[a-z0-9-]+-[a-z0-9-]+\/?$/i
  ];

  // Categorias válidas do sistema (não redirecionar)
  const validPrefixes = [
    '/noticias', '/politica', '/geral', '/musica', '/eventos', '/ministerios',
    '/estudos', '/autor', '/pagina', '/categoria', '/busca', '/dashboard',
    '/login', '/api', '/feed', '/sitemap', '/robots', '/css', '/js', '/images',
    '/uploads', '/amp'
  ];

  // Verificar se a URL corresponde a algum padrão antigo
  // Mas primeiro verificar se NÃO é um prefixo válido do sistema
  const isValidPrefix = validPrefixes.some(prefix => url.startsWith(prefix));
  const isLegacyUrl = !isValidPrefix && legacyPatterns.some(pattern => pattern.test(url));

  if (isLegacyUrl) {
    // URLs antigas do WordPress - redirecionar para home com 301
    // Não redirecionar para busca pois causa "soft 404" no Google
    console.log(`🔄 Redirecionando URL antiga para home: ${url}`);
    return res.redirect(301, '/');
  }

  // Se não for URL antiga, continuar normalmente
  next();
};
