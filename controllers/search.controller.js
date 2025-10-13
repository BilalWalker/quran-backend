const TranslationService = require('../services/TranslationService');
const db = require('../config/db');

const translationService = new TranslationService(db);

class SearchController {
  searchTranslations(req, res) {
    try {
      const query = req.params.query;
      const { sourceId, limit = 50 } = req.query;
      
      if (query.length < 3) {
        return res.status(400).json({ 
          error: 'Search query must be at least 3 characters long' 
        });
      }

      const results = translationService.search(query, sourceId, limit);
      res.json({ success: true, data: results });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Translation search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
}

module.exports = new SearchController();