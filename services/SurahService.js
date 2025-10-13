// services/SurahService.js
const fetch = require('node-fetch'); // You may need: npm install node-fetch@2

class SurahService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.apiBase = 'https://api.alquran.cloud/v1';
  }

  async getAll() {
    try {
      // Try to get from API first
      const response = await fetch(`${this.apiBase}/surah`);
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        return data.data.map(surah => ({
          id: surah.number,
          name_arabic: surah.name,
          name_english: surah.englishName,
          name_transliterated: surah.englishNameTranslation,
          revelation_type: surah.revelationType.toLowerCase(),
          number_of_ayahs: surah.numberOfAyahs
        }));
      }
      
      // Fallback to database
      return this.db.prepare(`
        SELECT 
          id, name_arabic, name_english, name_transliterated,
          revelation_type, number_of_ayahs, bismillah_pre
        FROM surahs
        ORDER BY id
      `).all();
    } catch (error) {
      this.logger.error('Get all surahs error:', error);
      // If API fails, try database
      try {
        return this.db.prepare(`
          SELECT 
            id, name_arabic, name_english, name_transliterated,
            revelation_type, number_of_ayahs, bismillah_pre
          FROM surahs
          ORDER BY id
        `).all();
      } catch (dbError) {
        this.logger.error('Database fallback also failed:', dbError);
        throw error;
      }
    }
  }

  async getSurahWithAyahs(surahNumber) {
    try {
      // Fetch from API
      const response = await fetch(`${this.apiBase}/surah/${surahNumber}`);
      const data = await response.json();
      
      if (data.code !== 200 || !data.data) {
        throw new Error('Failed to fetch from API');
      }

      const surahData = data.data;
      
      // Convert API format to our format
      const ayahs = surahData.ayahs.map(ayah => ({
        id: ayah.number,
        number_in_surah: ayah.numberInSurah,
        number_in_quran: ayah.number,
        text_arabic: ayah.text,
        text_uthmani: ayah.text,
        juz_number: ayah.juz,
        surah_id: surahNumber
      }));

      // Check which ayahs have custom audio in database
      const ayahsWithAudioStatus = await Promise.all(
        ayahs.map(async (ayah) => {
          const audioFiles = await this.getAudioForAyah(surahNumber, ayah.number_in_surah);
          return {
            ...ayah,
            hasAudio: audioFiles.length > 0,
            audioFiles
          };
        })
      );

      return {
        id: surahNumber,
        name_arabic: surahData.name,
        name_english: surahData.englishName,
        name_transliterated: surahData.englishNameTranslation,
        revelation_type: surahData.revelationType.toLowerCase(),
        number_of_ayahs: surahData.numberOfAyahs,
        ayahs: ayahsWithAudioStatus
      };
    } catch (error) {
      this.logger.error('Get surah with ayahs error:', error);
      throw error;
    }
  }

  async getAudioForAyah(surahNumber, verseNumber) {
    try {
      // Check if there's custom uploaded audio for this ayah
      const rows = this.db.prepare(`
        SELECT 
          af.*,
          r.name as reciter_name
        FROM audio_files af
        JOIN reciters r ON af.reciter_id = r.id
        JOIN ayahs a ON af.ayah_id = a.id
        WHERE a.surah_id = ? AND a.number_in_surah = ? AND af.is_active = 1
      `).all(surahNumber, verseNumber);
      
      return rows;
    } catch (error) {
      this.logger.error('Get audio for ayah error:', error);
      return [];
    }
  }

  getAyahBySurahAndVerse(surahNumber, verseNumber) {
    try {
      // Try to find in database first (for custom uploads)
      let row = this.db.prepare(
        'SELECT * FROM ayahs WHERE surah_id = ? AND number_in_surah = ?'
      ).get(surahNumber, verseNumber);
      
      if (!row) {
        // Create a placeholder record for audio upload
        const stmt = this.db.prepare(`
          INSERT INTO ayahs (surah_id, number_in_surah, number_in_quran, text_arabic)
          VALUES (?, ?, ?, ?)
        `);
        
        // Approximate number_in_quran (you can calculate properly later)
        const approxQuranNumber = (surahNumber - 1) * 100 + verseNumber;
        
        const result = stmt.run(surahNumber, verseNumber, approxQuranNumber, 'Text from API');
        
        row = this.db.prepare(
          'SELECT * FROM ayahs WHERE id = ?'
        ).get(result.lastInsertRowid);
      }
      
      return row;
    } catch (error) {
      this.logger.error('Get ayah by surah and verse error:', error);
      throw error;
    }
  }

  getStats() {
    try {
      // Return stats from database for custom content
      const row = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT a.surah_id) as custom_surahs,
          COUNT(a.id) as custom_ayahs,
          COUNT(DISTINCT af.id) as uploaded_audio_files
        FROM ayahs a
        LEFT JOIN audio_files af ON a.id = af.ayah_id
      `).get();
      
      return {
        total_surahs: 114, // Fixed - Quran has 114 surahs
        total_ayahs: 6236, // Fixed - Quran has 6236 verses
        custom_ayahs: row.custom_ayahs || 0,
        uploaded_audio: row.uploaded_audio_files || 0
      };
    } catch (error) {
      this.logger.error('Get surah stats error:', error);
      throw error;
    }
  }
}

module.exports = SurahService;