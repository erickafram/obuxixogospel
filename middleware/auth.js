// Middleware para verificar se o usuário está autenticado
const isAuthenticated = async (req, res, next) => {
  if (req.session && req.session.userId) {
    // Se user já está na sessão, continuar
    if (req.session.user) {
      return next();
    }
    
    // Caso contrário, carregar do banco
    try {
      const { User } = require('../models');
      const user = await User.findByPk(req.session.userId, {
        attributes: ['id', 'nome', 'email', 'role', 'ativo']
      });
      
      if (user && user.ativo) {
        req.session.user = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role
        };
        return next();
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    }
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

// Middleware para verificar se tem permissão para deletar posts
const canDeletePosts = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).json({ 
    success: false, 
    message: 'Apenas administradores podem deletar publicações.' 
  });
};

// Middleware para verificar se tem acesso à página de usuários
const canAccessUsers = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Acesso negado. Apenas administradores podem gerenciar usuários.');
};

// Middleware para verificar se tem acesso à página de configurações
const canAccessSettings = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Acesso negado. Apenas administradores podem acessar configurações.');
};

// Middleware para verificar se tem acesso à página de páginas estáticas
const canAccessPages = (req, res, next) => {
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  res.status(403).send('Acesso negado. Apenas administradores podem gerenciar páginas.');
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isAdminOrEditor,
  canDeletePosts,
  canAccessUsers,
  canAccessSettings,
  canAccessPages
};
