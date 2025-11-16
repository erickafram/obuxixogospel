const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// Rotas públicas
router.get('/', articleController.getAllArticles);
router.get('/destaque', articleController.getFeaturedArticle);
router.get('/search', articleController.searchArticles);
router.get('/categoria/:categoria', articleController.getArticlesByCategory);
router.get('/:slug', articleController.getArticleBySlug);

// Rotas administrativas (sem autenticação por simplicidade)
router.post('/', articleController.createArticle);
router.put('/:id', articleController.updateArticle);
router.delete('/:id', articleController.deleteArticle);

module.exports = router;
