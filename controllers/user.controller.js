const { hashPassword } = require('../config/database');
const UserService = require('../services/UserService');
const db = require('../config/db');

const userService = new UserService(db);

class UserController {
  getAll(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const users = userService.getAll(page, limit, search);
      res.json({ success: true, data: users });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async create(req, res) {
  try {
    const logger = req.app.locals.logger;
    const { username, email, password, role = 'editor' } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // ✅ Validate password strength on backend too
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // ✅ Check if username already exists
    const existingUser = db.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).get(username);
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already exists' 
      });
    }

    // ✅ Check if email already exists (if provided)
    if (email && email.trim() !== '') {
      const existingEmail = db.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).get(email);
      
      if (existingEmail) {
        return res.status(400).json({ 
          error: 'Email already exists' 
        });
      }
    }

    const hashedPassword = await hashPassword(password);
    const userId = userService.create({
      username,
      email,
      password_hash: hashedPassword,
      role
    });

    logger.info(`User ${username} created successfully`);
    res.json({ success: true, data: { id: userId } });
  } catch (error) {
    const logger = req.app.locals.logger;
    logger.error('Create user error:', error);
    
    // ✅ Return the actual error message
    res.status(500).json({ 
      error: error.message || 'Failed to create user' 
    });
  }
}

  getById(req, res) {
    try {
      const user = userService.findById(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  async update(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { userId } = req.params;
      const { username, email, role, is_active, password } = req.body;
      
      // Don't allow changing your own role
      if (parseInt(userId) === req.user.id && role && role !== req.user.role) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }
      
      // Build update query dynamically
      let updates = [];
      let params = [];
      
      if (username) {
        // Check if username is already taken
        const existing = db.prepare(
          'SELECT id FROM users WHERE username = ? AND id != ?'
        ).get(username, userId);
        
        if (existing) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        updates.push('username = ?');
        params.push(username);
      }
      
      if (email !== undefined) {
        if (email && email.trim() !== '') {
          // Check if email is already taken
          const existing = db.prepare(
            'SELECT id FROM users WHERE email = ? AND id != ?'
          ).get(email, userId);
          
          if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
          }
        }
        updates.push('email = ?');
        params.push(email || null);
      }
      
      if (role) {
        if (!['admin', 'editor', 'viewer'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        updates.push('role = ?');
        params.push(role);
      }
      
      if (is_active !== undefined) {
        // Don't allow deactivating yourself
        if (parseInt(userId) === req.user.id && !is_active) {
          return res.status(400).json({ 
            error: 'Cannot deactivate your own account' 
          });
        }
        updates.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      
      if (password && password.trim() !== '') {
        // Validate password strength
        if (password.length < 8) {
          return res.status(400).json({ 
            error: 'Password must be at least 8 characters long' 
          });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          return res.status(400).json({ 
            error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
          });
        }
        
        const hashedPassword = await hashPassword(password);
        updates.push('password_hash = ?');
        params.push(hashedPassword);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);
      
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      const result = db.prepare(query).run(...params);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info(`User ${userId} updated by ${req.user.username}`);
      res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  hardDelete(req, res) {
  try {
    const logger = req.app.locals.logger;
    const { userId } = req.params;
    
    // Only allow admins to hard delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can permanently delete users' });
    }
    
    // Don't allow deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const user = userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // HARD DELETE - permanently remove from database
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    
    if (result.changes > 0) {
      logger.warn(`User ${userId} (${user.username}) PERMANENTLY DELETED by ${req.user.username}`);
      res.json({ success: true, message: 'User permanently deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  } catch (error) {
    const logger = req.app.locals.logger;
    logger.error('Hard delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

  delete(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { userId } = req.params;
      
      // Don't allow deleting yourself
      if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      // Check if user exists
      const user = userService.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Soft delete - just deactivate
      const result = db.prepare(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(userId);
      
      if (result.changes > 0) {
        logger.info(`User ${userId} (${user.username}) deactivated by ${req.user.username}`);
        res.json({ success: true, message: 'User deactivated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to deactivate user' });
      }
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
}

module.exports = new UserController();