const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

// GET /api/users - Get all users
router.get(
  '/',
  authenticateToken,
  authorize(['admin']),
  userController.getAll
);

// POST /api/users - Create new user
router.post(
  '/',
  authenticateToken,
  authorize(['admin']),
  logActivity('create_user'),
  userController.create
);

// GET /api/users/:userId - Get user by ID
router.get(
  '/:userId',
  authenticateToken,
  authorize(['admin']),
  userController.getById
);

// PUT /api/users/:userId - Update user
router.put(
  '/:userId',
  authenticateToken,
  authorize(['admin']),
  logActivity('update_user'),
  userController.update
);

// DELETE /api/users/:userId - Delete/Deactivate user
router.delete(
  '/:userId',
  authenticateToken,
  authorize(['admin']),
  logActivity('deactivate_user'),
  userController.delete
);

module.exports = router;