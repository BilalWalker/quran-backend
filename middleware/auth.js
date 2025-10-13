const { verifyToken } = require('../config/database');
const UserService = require('../services/UserService');
const ActivityService = require('../services/ActivityService');
const db = require('../config/db');

const userService = new UserService(db);
const activityService = new ActivityService(db);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    const user = userService.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    const logger = req.app.locals.logger;
    if (logger) logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Activity logging middleware
const logActivity = (action) => {
  return (req, res, next) => {
    try {
      req.activityAction = action;
      
      res.on('finish', () => {
        if (req.user && res.statusCode < 400) {
          try {
            activityService.log({
              userId: req.user.id,
              action,
              entityType: req.params.entityType,
              entityId: req.params.id,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              newValues: req.body,
            });
          } catch (err) {
            const logger = req.app.locals.logger;
            if (logger) logger.error('Activity log error:', err);
          }
        }
      });
      
      next();
    } catch (error) {
      const logger = req.app.locals.logger;
      if (logger) logger.error('Activity logging error:', error);
      next();
    }
  };
};

module.exports = {
  authenticateToken,
  authorize,
  logActivity
};