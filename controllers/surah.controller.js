const SurahService = require('../services/SurahService');
const db = require('../config/db');

// Create service instance
const surahService = new SurahService(db, console);

// Export plain functions (not class methods)
const getAll = async (req, res) => {
  try {
    const surahs = await surahService.getAll();
    res.json({ success: true, data: surahs });
  } catch (error) {
    console.error('Get surahs error:', error);
    res.status(500).json({ error: 'Failed to fetch surahs' });
  }
};

const getByNumber = async (req, res) => {
  try {
    const surahNumber = parseInt(req.params.surahNumber);
    
    if (surahNumber < 1 || surahNumber > 114) {
      return res.status(400).json({ error: 'Invalid surah number' });
    }

    const surahData = await surahService.getSurahWithAyahs(surahNumber);
    
    if (!surahData) {
      return res.status(404).json({ error: 'Surah not found' });
    }

    res.json({ success: true, data: surahData });
  } catch (error) {
    console.error('Get surah error:', error);
    res.status(500).json({ error: 'Failed to fetch surah' });
  }
};

const getSurahTranslations = async (req, res) => {
  try {
    const { surahNumber, sourceId } = req.params;
    
    console.log('📖 Fetching bulk translations for surah:', surahNumber, 'source:', sourceId);
    
    const translations = db.prepare(`
      SELECT 
        a.id,
        a.number_in_quran,
        a.number_in_surah,
        t.text,
        t.footnotes
      FROM ayahs a
      LEFT JOIN translations t ON a.id = t.ayah_id AND t.source_id = ?
      WHERE a.surah_id = ?
      ORDER BY a.number_in_surah ASC
    `).all(sourceId, surahNumber);
    
    console.log('✅ Fetched', translations.length, 'translations in bulk');
    
    res.json({ 
      success: true,
      data: translations 
    });
  } catch (error) {
    console.error('Error fetching surah translations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch translations' 
    });
  }
};

const updateSurah = async (req, res) => {
  try {
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
    console.error('Update surah error:', error);
    res.status(500).json({ error: 'Failed to update surah' });
  }
};

module.exports = {
  getAll,
  getByNumber,
  getSurahTranslations,
  updateSurah
};