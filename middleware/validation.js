// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Authentication validation
const validateLogin = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

// User creation validation
const validateCreateUser = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional().isEmail().withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional().isIn(['admin', 'editor', 'viewer']).withMessage('Role must be admin, editor, or viewer'),
  handleValidationErrors
];

// Surah/Verse validation
const validateSurahNumber = [
  param('number')
    .isInt({ min: 1, max: 114 }).withMessage('Surah number must be between 1 and 114'),
  handleValidationErrors
];

const validateVerseNumber = [
  param('verseNumber')
    .isInt({ min: 1, max: 286 }).withMessage('Verse number must be between 1 and 286'),
  handleValidationErrors
];

// Translation validation
const validateTranslationUpdate = [
  param('ayahId').isInt({ min: 1 }).withMessage('Ayah ID must be a positive integer'),
  param('sourceId').isInt({ min: 1 }).withMessage('Source ID must be a positive integer'),
  body('text')
    .notEmpty().withMessage('Translation text is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Translation text must be between 1 and 5000 characters'),
  body('footnotes').optional().isLength({ max: 2000 }).withMessage('Footnotes cannot exceed 2000 characters'),
  handleValidationErrors
];

// Audio upload validation
const validateAudioUpload = [
  body('surahNumber').isInt({ min: 1, max: 114 }).withMessage('Surah number must be between 1 and 114'),
  body('verseNumber').isInt({ min: 1, max: 286 }).withMessage('Verse number must be between 1 and 286'),
  body('reciterId').optional().isInt({ min: 1 }).withMessage('Reciter ID must be a positive integer'),
  handleValidationErrors
];

// Search validation - uses query param ?query=...
const validateSearch = [
  query('query')
    .isLength({ min: 3, max: 100 }).withMessage('Search query must be between 3 and 100 characters')
    .trim(),
  query('sourceId').optional().isInt({ min: 1 }).withMessage('Source ID must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateCreateUser,
  validateSurahNumber,
  validateVerseNumber,
  validateTranslationUpdate,
  validateAudioUpload,
  validateSearch,
  validatePagination,
  handleValidationErrors
};
