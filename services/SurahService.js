// services/SurahService.js
const fetch = require('node-fetch');

class SurahService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
    this.apiBase = 'https://api.alquran.cloud/v1';
  }

  async getAll() {
    try {
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
      const startTime = Date.now();
      console.log('🔍 Fetching surah:', surahNumber);
      
      // Get surah info
      const surah = this.db.prepare('SELECT * FROM surahs WHERE id = ?').get(surahNumber);
      if (!surah) throw new Error('Surah not found');
      
      // Get ayahs
      const ayahs = this.db.prepare(`
        SELECT * FROM ayahs 
        WHERE surah_id = ? 
        ORDER BY number_in_surah
      `).all(surahNumber);
      
      console.log('✅ Got', ayahs.length, 'ayahs in', Date.now() - startTime, 'ms');
      
      // ✅ OPTIMIZED: Get ALL audio in ONE query
      const audioStart = Date.now();
      const audioFiles = this.db.prepare(`
        SELECT 
          af.*,
          r.name as reciter_name,
          a.number_in_surah
        FROM audio_files af
        JOIN reciters r ON af.reciter_id = r.id
        JOIN ayahs a ON af.ayah_id = a.id
        WHERE a.surah_id = ? AND af.is_active = 1
      `).all(surahNumber);
      
      console.log('✅ Got', audioFiles.length, 'audio files in', Date.now() - audioStart, 'ms');
      
      // Map audio to ayahs
      const audioMap = {};
      audioFiles.forEach(audio => {
        if (!audioMap[audio.number_in_surah]) {
          audioMap[audio.number_in_surah] = [];
        }
        audioMap[audio.number_in_surah].push(audio);
      });
      
      const ayahsWithAudio = ayahs.map(ayah => ({
        ...ayah,
        hasAudio: (audioMap[ayah.number_in_surah] || []).length > 0,
        audioFiles: audioMap[ayah.number_in_surah] || []
      }));
      
      console.log('✅ Total time:', Date.now() - startTime, 'ms');
      
      return {
        ...surah,
        ayahs: ayahsWithAudio
      };
    } catch (error) {
      this.logger.error('Get surah with ayahs error:', error);
      throw error;
    }
  }

  async getAudioForAyah(surahNumber, verseNumber) {
    try {
      return this.db.prepare(`
        SELECT 
          af.*,
          r.name as reciter_name
        FROM audio_files af
        JOIN reciters r ON af.reciter_id = r.id
        JOIN ayahs a ON af.ayah_id = a.id
        WHERE a.surah_id = ? AND a.number_in_surah = ? AND af.is_active = 1
      `).all(surahNumber, verseNumber);
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