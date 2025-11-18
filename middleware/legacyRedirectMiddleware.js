/**
 * Middleware para redirecionar URLs antigas/quebradas
 * Criado para lidar com posts deletados após recomeço do site
 */

module.exports = function(req, res, next) {
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
    
    // ESTRATÉGIA MELHOR: Retornar 410 (Gone) em vez de 301 para conteúdo deletado
    // 410 informa ao Google que o conteúdo foi PERMANENTEMENTE removido
    // Isso é MELHOR que 301→home para conteúdo que não existe mais
    // Google remove da indexação mais rápido e não penaliza
    
    // Renderizar página 404 personalizada com status 410
    return res.status(410).render('404', {
      title: 'Conteúdo Removido - Obuxixo Gospel',
      recentArticles: [], // Pode adicionar artigos recentes aqui se quiser
      categories: res.locals.categories || []
    });
  }
  
  // Se não for URL antiga, continuar normalmente
  next();
};
