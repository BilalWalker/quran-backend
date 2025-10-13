// services/ActivityService.js
class ActivityService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  log(activityData) {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress,
        userAgent
      } = activityData;

      const stmt = this.db.prepare(`
        INSERT INTO activity_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      );
    } catch (error) {
      this.logger.error('Activity log error:', error);
      // Don't throw error as logging shouldn't break main operation
    }
  }

  getAll(page = 1, limit = 50, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          al.*,
          u.username
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
      }

      query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = this.db.prepare(query).all(...params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
      const countParams = [];
      if (filters.userId) {
        countQuery += ' AND user_id = ?';
        countParams.push(filters.userId);
      }
      if (filters.action) {
        countQuery += ' AND action = ?';
        countParams.push(filters.action);
      }

      const countRow = this.db.prepare(countQuery).get(...countParams);
      const total = countRow.total;

      return {
        logs: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Get activity logs error:', error);
      throw error;
    }
  }
}

module.exports = ActivityService;
