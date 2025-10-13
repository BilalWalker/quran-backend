const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { upload } = require('../config/upload');
const importExportController = require('../controllers/importExport.controller');

const router = express.Router();

// GET /api/export/translations/:surahNumber - Export translations for a surah
router.get(
  '/translations/:surahNumber',
  authenticateToken,
  importExportController.exportTranslations
);

// POST /api/import/translations - Import translations from file
router.post(
  '/translations',
  authenticateToken,
  authorize(['admin', 'editor']),
  upload.single('file'),
  logActivity('import_translations'),
  importExportController.importTranslations
);

module.exports = router;