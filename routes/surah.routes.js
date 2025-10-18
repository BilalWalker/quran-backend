const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const surahController = require('../controllers/surah.controller');

const router = express.Router();

// GET /api/surahs - Get all surahs
router.get('/', surahController.getAll);

// GET /api/surah/:number - Get surah by number with ayahs
router.get('/:number', surahController.getByNumber);

module.exports = router;