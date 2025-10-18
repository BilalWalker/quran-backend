const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const translationController = require('../controllers/translation.controller');

const router = express.Router();

// GET /api/translations/sources - Get all translation sources
router.get('/sources', translationController.getSources);

// GET /api/translation/:surahNumber/:sourceId - Get translation by surah and source
router.get(
  '/:surahNumber/:sourceId',
  translationController.getBySurahAndSource
);

// PUT /api/translation/:ayahId/:sourceId - Update translation
router.put(
  '/:ayahId/:sourceId',
  authorize(['admin', 'editor']),
  logActivity('update_translation'),
  translationController.update
);

module.exports = router;