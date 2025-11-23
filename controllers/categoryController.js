const { sequelize } = require('../models');

// Listar todas as categorias
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await sequelize.query('SELECT * FROM categories ORDER BY nome ASC');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obter categoria específica
exports.getCategoryBySlug = async (req, res) => {
  try {
    const [categories] = await sequelize.query('SELECT * FROM categories WHERE slug = ?', {
      replacements: [req.params.slug]
    });
    
    if (!categories || categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    res.json({ success: true, data: categories[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Criar nova categoria
exports.createCategory = async (req, res) => {
  try {
    const { nome, slug, cor, icone, descricao } = req.body;
    
    if (!nome || !slug || !cor) {
      return res.status(400).json({ success: false, message: 'Nome, slug e cor são obrigatórios' });
    }

    await sequelize.query(
      'INSERT INTO categories (nome, slug, cor, icone, descricao, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      {
        replacements: [nome, slug, cor, icone || '', descricao || '']
      }
    );

    res.json({ success: true, message: 'Categoria criada com sucesso' });
  } catch (error) {
    if (error.parent && error.parent.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Já existe uma categoria com este nome ou slug' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Atualizar categoria
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, slug, cor, icone, descricao } = req.body;
    
    if (!nome || !slug || !cor) {
      return res.status(400).json({ success: false, message: 'Nome, slug e cor são obrigatórios' });
    }

    const [result] = await sequelize.query(
      'UPDATE categories SET nome = ?, slug = ?, cor = ?, icone = ?, descricao = ?, updated_at = NOW() WHERE id = ?',
      {
        replacements: [nome, slug, cor, icone || '', descricao || '', id]
      }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    res.json({ success: true, message: 'Categoria atualizada com sucesso' });
  } catch (error) {
    if (error.parent && error.parent.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Já existe uma categoria com este nome ou slug' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Deletar categoria
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await sequelize.query(
      'DELETE FROM categories WHERE id = ?',
      {
        replacements: [id]
      }
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
    }

    res.json({ success: true, message: 'Categoria deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reordenar categorias
exports.reorderCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ success: false, message: 'Dados inválidos' });
    }

    // Atualizar ordem de cada categoria
    for (let i = 0; i < categories.length; i++) {
      await sequelize.query(
        'UPDATE categories SET ordem = ? WHERE id = ?',
        {
          replacements: [i + 1, categories[i].id]
        }
      );
    }

    res.json({ success: true, message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar categorias:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
