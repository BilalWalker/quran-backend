const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const searchController = require('../controllers/search.controller');

const router = express.Router();

// GET /api/search/translations/:query - Search translations
router.get('/translations/:query', authenticateToken, searchController.searchTranslations);

module.exports = router;