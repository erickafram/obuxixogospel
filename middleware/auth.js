// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Acesso negado. Apenas administradores.');
};

// Middleware para verificar se é admin ou editor
const isAdminOrEditor = (req, res, next) => {
  if (req.session && req.session.userId && 
      (req.session.userRole === 'admin' || req.session.userRole === 'editor')) {
    return next();
  }
  res.status(403).send('Acesso negado.');
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isAdminOrEditor
};
