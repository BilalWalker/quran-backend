const { generateToken, comparePassword } = require('../config/database');
const UserService = require('../services/UserService');
const db = require('../config/db');

const userService = new UserService(db);

class AuthController {
  async login(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Username and password are required' 
        });
      }

      const user = userService.findByUsername(username);
      
      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await comparePassword(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      userService.updateLastLogin(user.id);

      const token = generateToken({ 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });
      
      logger.info(`User ${username} logged in successfully`, { userId: user.id });

      res.json({ 
        success: true, 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
}

module.exports = new AuthController();