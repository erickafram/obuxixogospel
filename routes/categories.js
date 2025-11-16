const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Rotas públicas da API
router.get('/', categoryController.getAllCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Rotas administrativas (usadas pelo dashboard)
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
