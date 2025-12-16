const { Redirect } = require('../models');

/**
 * Middleware para processar redirecionamentos 301/302/307
 * Deve ser adicionado ANTES das rotas principais no app.js
 */
async function redirectMiddleware(req, res, next) {
  try {
    // Ignorar requisições para assets estáticos e sitemaps
    if (
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/js/') ||
      req.path.startsWith('/images/') ||
      req.path.startsWith('/dashboard/') ||
      req.path.startsWith('/api/') ||
      req.path.endsWith('-sitemap.xml') ||
      req.path === '/sitemap.xml' ||
      req.path === '/sitemap_index.xml' ||
      req.path === '/robots.txt' ||
      req.path === '/feed'
    ) {
      return next();
    }
    
    // Normalizar URL
    const urlAtual = Redirect.normalizarUrl(req.path);
    
    // Buscar redirecionamento ativo
    const redirect = await Redirect.buscarPorUrlAntiga(urlAtual);
    
    if (redirect) {
      // Registrar acesso (async, não bloqueia)
      redirect.registrarAcesso().catch(err => {
        console.error('Erro ao registrar acesso ao redirect:', err);
      });
      
      // Preservar query string se existir
      let urlDestino = redirect.urlNova;
      if (req.query && Object.keys(req.query).length > 0) {
        const queryString = new URLSearchParams(req.query).toString();
        urlDestino += (urlDestino.includes('?') ? '&' : '?') + queryString;
      }
      
      // Fazer redirecionamento com código HTTP correto
      const statusCode = parseInt(redirect.tipoRedirecionamento);
      
      console.log(`🔀 Redirecionamento ${statusCode}: ${urlAtual} → ${urlDestino}`);
      
      return res.redirect(statusCode, urlDestino);
    }
    
    // Não há redirecionamento, continuar normalmente
    next();
    
  } catch (error) {
    console.error('Erro no middleware de redirecionamento:', error);
    // Em caso de erro, não bloquear a requisição
    next();
  }
}

module.exports = redirectMiddleware;
