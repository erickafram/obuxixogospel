const Category = require('../models/Category');

// Listar todas as categorias
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ nome: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obter categoria específica
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
