const UserService = require('../services/UserService');
const SurahService = require('../services/SurahService');
const TranslationService = require('../services/TranslationService');
const AudioService = require('../services/AudioService');
const ActivityService = require('../services/ActivityService');
const db = require('../config/db');

const userService = new UserService(db);
const surahService = new SurahService(db);
const translationService = new TranslationService(db);
const audioService = new AudioService(db);
const activityService = new ActivityService(db);

class AnalyticsController {
  getDashboard(req, res) {
    try {
      const stats = {
        surahs: surahService.getStats(),
        translations: translationService.getStats(),
        audio: audioService.getStats(),
        users: userService.getStats()
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Dashboard analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;
      const logs = activityService.getAll(page, limit, { userId, action });
      res.json({ success: true, data: logs });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get activity logs error:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  }
}

module.exports = new AnalyticsController();