const TranslationService = require('../services/TranslationService');
const db = require('../config/db');

const translationService = new TranslationService(db);

class TranslationController {
  getSources(req, res) {
    try {
      const sources = translationService.getSources();
      res.json({ success: true, data: sources });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get translation sources error:', error);
      res.status(500).json({ error: 'Failed to fetch translation sources' });
    }
  }

  getBySurahAndSource(req, res) {
    try {
      const { surahNumber, sourceId } = req.params;
      const translations = translationService.getBySurahAndSource(
        surahNumber, 
        sourceId
      );
      res.json({ success: true, data: translations });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get translation error:', error);
      res.status(404).json({ error: 'Translation not found' });
    }
  }

  update(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { ayahId, sourceId } = req.params;
      const { text, footnotes } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Translation text is required' });
      }

      translationService.updateTranslation(ayahId, sourceId, {
        text,
        footnotes,
        is_approved: req.user.role === 'admin'
      });
      
      res.json({ success: true, message: 'Translation updated successfully' });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Update translation error:', error);
      res.status(500).json({ error: 'Failed to update translation' });
    }
  }
}

module.exports = new TranslationController();