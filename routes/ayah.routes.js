const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const ayahController = require('../controllers/ayah.controller');

const router = express.Router();

// PUT /api/ayah/:ayahId - Update Ayah Arabic text
router.put(
  '/:ayahId',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('update_ayah'),
  ayahController.updateAyah
);

// PUT /api/ayah/:ayahId/indexing - Update ayah indexing
router.put(
  '/:ayahId/indexing',
  authenticateToken,
  authorize(['admin']),
  logActivity('update_ayah_indexing'),
  ayahController.updateIndexing
);

// GET /api/ayah/:ayahId/translations - Get translations for a specific ayah
router.get(
  '/:ayahId/translations',
  
  ayahController.getTranslations
);

// PUT /api/ayah/:ayahId/translation/:sourceId - Create or update translation
router.put(
  '/:ayahId/translation/:sourceId',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('update_translation'),
  ayahController.updateTranslation
);

module.exports = router;