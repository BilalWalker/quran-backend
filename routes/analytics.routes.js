const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', authenticateToken, analyticsController.getDashboard);

// GET /api/activity-logs - Get activity logs
router.get(
  '/',
  authenticateToken,
  authorize(['admin']),
  analyticsController.getActivityLogs
);

module.exports = router;