// services/SurahService.js
const fetch = require('node-fetch');

class SurahService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.apiBase = 'https://api.alquran.cloud/v1';
  }

  async getAll() {
    try {
      // Get from local database
      return this.db.prepare(`
        SELECT 
          id, name_arabic, name_english, name_transliterated,
          revelation_type, number_of_ayahs, bismillah_pre
        FROM surahs
        ORDER BY id
      `).all();
    } catch (error) {
      this.logger.error('Get all surahs error:', error);
      throw error;
    }
  }

  async getSurahWithAyahs(surahNumber) {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔍 SurahService.getSurahWithAyahs called');
      console.log('Surah number:', surahNumber);
      
      // ✅ Get surah info from LOCAL database
      const surah = this.db.prepare('SELECT * FROM surahs WHERE id = ?').get(surahNumber);
      
      if (!surah) {
        console.log('❌ Surah not found in database');
        throw new Error('Surah not found');
      }
      
      console.log('✅ Surah found:', surah.name_english);
      
      // ✅ Get ayahs from LOCAL database
      const ayahs = this.db.prepare(`
        SELECT * FROM ayahs 
        WHERE surah_id = ? 
        ORDER BY number_in_surah
      `).all(surahNumber);
      
      console.log('✅ Ayahs found:', ayahs.length);
      
      if (ayahs.length > 0) {
        console.log('First ayah text_arabic:', ayahs[0].text_arabic?.substring(0, 50));
      }
      
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
      
      console.log('✅ Returning surah data with', ayahsWithAudioStatus.length, 'ayahs');
      console.log('═══════════════════════════════════════');

      return {
        ...surah,
        ayahs: ayahsWithAudioStatus
      };
      
    } catch (error) {
      this.logger.error('Get surah with ayahs error:', error);
      throw error;
    }
  }

  async getAudioForAyah(surahNumber, verseNumber) {
    try {
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
      let row = this.db.prepare(
        'SELECT * FROM ayahs WHERE surah_id = ? AND number_in_surah = ?'
      ).get(surahNumber, verseNumber);
      
      if (!row) {
        const stmt = this.db.prepare(`
          INSERT INTO ayahs (surah_id, number_in_surah, number_in_quran, text_arabic)
          VALUES (?, ?, ?, ?)
        `);
        
        const approxQuranNumber = (surahNumber - 1) * 100 + verseNumber;
        const result = stmt.run(surahNumber, verseNumber, approxQuranNumber, 'Text from API');
        
        row = this.db.prepare('SELECT * FROM ayahs WHERE id = ?').get(result.lastInsertRowid);
      }
      
      return row;
    } catch (error) {
      this.logger.error('Get ayah by surah and verse error:', error);
      throw error;
    }
  }

  getStats() {
    try {
      const row = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT a.surah_id) as custom_surahs,
          COUNT(a.id) as custom_ayahs,
          COUNT(DISTINCT af.id) as uploaded_audio_files
        FROM ayahs a
        LEFT JOIN audio_files af ON a.id = af.ayah_id
      `).get();
      
      return {
        total_surahs: 114,
        total_ayahs: 6236,
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