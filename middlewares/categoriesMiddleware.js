const { Category } = require('../models');

// Middleware para carregar categorias e disponibilizar em todas as views
const loadCategories = async (req, res, next) => {
  try {
    // Tentar ordenar por ordem, se falhar, ordenar por nome
    let categories;
    try {
      categories = await Category.findAll({
        order: [['ordem', 'ASC'], ['nome', 'ASC']]
      });
    } catch (orderError) {
      // Campo ordem não existe ainda, ordenar apenas por nome
      categories = await Category.findAll({
        order: [['nome', 'ASC']]
      });
    }
    
    // Disponibilizar para todas as views
    res.locals.categories = categories;
    
    next();
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    // Mesmo com erro, continuar (com array vazio)
    res.locals.categories = [];
    next();
  }
};

module.exports = loadCategories;
