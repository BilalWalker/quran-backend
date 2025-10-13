// services/UserService.js
class UserService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  findById(id) {
    try {
      const row = this.db
        .prepare('SELECT id, username, email, role, is_active, last_login, created_at FROM users WHERE id = ?')
        .get(id);
      return row;
    } catch (error) {
      this.logger.error('Find user by ID error:', error);
      throw error;
    }
  }

  findByUsername(username) {
    try {
      const row = this.db
        .prepare('SELECT * FROM users WHERE username = ?')
        .get(username);
      return row;
    } catch (error) {
      this.logger.error('Find user by username error:', error);
      throw error;
    }
  }

  getAll(page = 1, limit = 10, search = '') {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT id, username, email, role, is_active, last_login, created_at 
        FROM users 
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ' AND (username LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = this.db.prepare(query).all(...params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams = [];
      if (search) {
        countQuery += ' AND (username LIKE ? OR email LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const countRow = this.db.prepare(countQuery).get(...countParams);
      const total = countRow.total;

      return {
        users: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Get all users error:', error);
      throw error;
    }
  }

  create(userData) {
    try {
      const { username, email, password_hash, role } = userData;
      const info = this.db
        .prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(username, email, password_hash, role);
      return info.lastInsertRowid;
    } catch (error) {
      this.logger.error('Create user error:', error);
      throw error;
    }
  }

  updateLastLogin(userId) {
    try {
      this.db
        .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
        .run(userId);
    } catch (error) {
      this.logger.error('Update last login error:', error);
      throw error;
    }
  }

  getStats() {
    try {
      const row = this.db
        .prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN role = 'editor' THEN 1 ELSE 0 END) as editors
          FROM users
        `)
        .get();
      return row;
    } catch (error) {
      this.logger.error('Get user stats error:', error);
      throw error;
    }
  }
}

module.exports = UserService;
