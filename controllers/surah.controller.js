const SurahService = require('../services/SurahService');
const db = require('../config/db');

const surahService = new SurahService(db);

class SurahController {
  async getAll(req, res) {
    try {
      const surahs = await surahService.getAll();
      res.json({ success: true, data: surahs });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get surahs error:', error);
      res.status(500).json({ error: 'Failed to fetch surahs' });
    }
  }

  async getByNumber(req, res) {
    try {
      const surahNumber = parseInt(req.params.number);
      
      if (surahNumber < 1 || surahNumber > 114) {
        return res.status(400).json({ error: 'Invalid surah number' });
      }

      const surahData = await surahService.getSurahWithAyahs(surahNumber);
      
      if (!surahData) {
        return res.status(404).json({ error: 'Surah not found' });
      }

      res.json({ success: true, data: surahData });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get surah error:', error);
      res.status(500).json({ error: 'Failed to fetch surah' });
    }
  }
}

module.exports = new SurahController();