const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const translationController = require('../controllers/translation.controller');

const router = express.Router();

// GET /api/translations/sources - Get all translation sources
router.get('/sources', authenticateToken, translationController.getSources);

// GET /api/translation/:surahNumber/:sourceId - Get translation by surah and source
router.get(
  '/:surahNumber/:sourceId',
  authenticateToken,
  translationController.getBySurahAndSource
);

// PUT /api/translation/:ayahId/:sourceId - Update translation
router.put(
  '/:ayahId/:sourceId',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('update_translation'),
  translationController.update
);

module.exports = router;