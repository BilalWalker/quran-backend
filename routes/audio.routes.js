const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { upload, moveToFinalDestination } = require('../config/upload');
const audioController = require('../controllers/audio.controller');

const router = express.Router();

// GET /api/reciters - Get all reciters
router.get('/reciters', authenticateToken, audioController.getReciters);

// POST /api/audio/upload - Upload audio file
router.post(
  '/upload',
  authenticateToken,
  authorize(['admin', 'editor']),
  upload.single('audio'),
  moveToFinalDestination, // ✅ Move file after body is parsed
  logActivity('upload_audio'),
  audioController.upload
);

// DELETE /api/audio/:audioId - Delete audio file
router.delete(
  '/:audioId',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('delete_audio'),
  audioController.delete
);

// GET /api/audio/:surahNumber - Get audio status for surah
router.get('/:surahNumber', authenticateToken, audioController.getStatus);

module.exports = router;