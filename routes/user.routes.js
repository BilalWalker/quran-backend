const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const surahController = require('../controllers/surah.controller');

const router = express.Router();

// GET /api/surahs - Get all surahs
router.get('/', surahController.getAll);

// GET /api/surah/:surahNumber/translations/:sourceId - Get all translations for a surah
// IMPORTANT: This must come BEFORE the generic /:surahNumber route
router.get(
  '/:surahNumber/translations/:sourceId',
  surahController.getSurahTranslations
);

// GET /api/surah/:surahNumber - Get specific surah with ayahs
router.get('/:surahNumber', surahController.getByNumber);

// PUT /api/surah/:surahNumber - Update surah metadata
router.put(
  '/:surahNumber',
  authenticateToken,
  authorize(['admin']),
  logActivity('update_surah'),
  surahController.updateSurah
);

module.exports = router;