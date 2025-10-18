const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Auth rate limiter
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000,
//   message: { error: 'Too many authentication attempts, please try again later.' },
// });

// POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;