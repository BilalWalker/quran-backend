// routes/naat.routes.js
const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const { upload } = require('../config/upload');
const naatController = require('../controllers/naat.controller');

const router = express.Router();

// Public routes - NO authentication required (for frontend display)
router.get('/', naatController.getAllNaats);
router.get('/:id', naatController.getNaatById);

// Protected routes - Admin/Editor only
router.post(
  '/',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('create_naat'),
  naatController.createNaat
);

router.put(
  '/:id',
  authenticateToken,
  authorize(['admin', 'editor']),
  logActivity('update_naat'),
  naatController.updateNaat
);

router.delete(
  '/:id',
  authenticateToken,
  authorize(['admin']),
  logActivity('delete_naat'),
  naatController.deleteNaat
);

// Import naats from CSV
router.post(
  '/import/csv',
  authenticateToken,
  authorize(['admin', 'editor']),
  upload.single('file'),
  logActivity('import_naats'),
  naatController.importNaatsFromCSV
);

module.exports = router;