const express = require('express');
const { authenticateToken, authorize, logActivity } = require('../middleware/auth');
const userController = require('../controllers/user.controller');

const router = express.Router();

// GET /api/users - Get all users with pagination and search
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

// GET /api/users/:userId - Get specific user
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

router.delete(
  '/:userId/permanent',
  authenticateToken,
  authorize(['admin']),
  logActivity('hard_delete_user'),
  userController.hardDelete
);

// DELETE /api/users/:userId - Deactivate user (soft delete)
router.delete(
  '/:userId',
  authenticateToken,
  authorize(['admin']),
  logActivity('delete_user'),
  userController.delete
);


module.exports = router;