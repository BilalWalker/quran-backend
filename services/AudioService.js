// services/AudioService.js
const fs = require('fs').promises;
const path = require('path');

class AudioService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  getReciters() {
    try {
      const rows = this.db.prepare('SELECT * FROM reciters WHERE is_active = 1 ORDER BY name').all();
      return rows;
    } catch (error) {
      this.logger.error('Get reciters error:', error);
      throw error;
    }
  }

  getByAyahId(ayahId) {
    try {
      const rows = this.db.prepare(`
        SELECT 
          af.*,
          r.name as reciter_name
        FROM audio_files af
        JOIN reciters r ON af.reciter_id = r.id
        WHERE af.ayah_id = ? AND af.is_active = 1
      `).all(ayahId);
      return rows;
    } catch (error) {
      this.logger.error('Get audio by ayah ID error:', error);
      throw error;
    }
  }

  create(audioData) {
    try {
      const {
        ayah_id,
        reciter_id,
        file_path,
        file_name,
        file_size,
        duration,
        format,
        quality = 'medium',
        uploaded_by
      } = audioData;

      const stmt = this.db.prepare(`
        INSERT INTO audio_files 
        (ayah_id, reciter_id, file_path, file_name, file_size, duration, format, quality, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        ayah_id, reciter_id, file_path, file_name, file_size, duration, format, quality, uploaded_by
      );

      return info.lastInsertRowid;
    } catch (error) {
      this.logger.error('Create audio error:', error);
      throw error;
    }
  }

  async delete(audioId) {
    try {
      // Get file info first
      const row = this.db.prepare('SELECT file_path FROM audio_files WHERE id = ?').get(audioId);

      if (!row) return false;

      const filePath = row.file_path;

      // Delete from database
      const result = this.db.prepare('DELETE FROM audio_files WHERE id = ?').run(audioId);

      if (result.changes > 0) {
        // Delete file from filesystem
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          this.logger.warn('Could not delete audio file from filesystem:', fileError);
        }
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Delete audio error:', error);
      throw error;
    }
  }

  getSurahAudioStatus(surahNumber) {
    try {
      const rows = this.db.prepare(`
        SELECT 
          a.number_in_surah,
          a.id as ayah_id,
          COUNT(af.id) as audio_count,
          MAX(af.uploaded_at) as latest_upload
        FROM ayahs a
        LEFT JOIN audio_files af ON a.id = af.ayah_id AND af.is_active = 1
        WHERE a.surah_id = ?
        GROUP BY a.id, a.number_in_surah
        ORDER BY a.number_in_surah
      `).all(surahNumber);

      return rows.map(row => ({
        verse: row.number_in_surah,
        ayah_id: row.ayah_id,
        hasAudio: row.audio_count > 0,
        audioCount: row.audio_count,
        latestUpload: row.latest_upload
      }));
    } catch (error) {
      this.logger.error('Get surah audio status error:', error);
      throw error;
    }
  }

  getStats() {
    try {
      const row = this.db.prepare(`
        SELECT 
          COUNT(*) as total_audio_files,
          COUNT(DISTINCT reciter_id) as total_reciters,
          COUNT(DISTINCT ayah_id) as ayahs_with_audio,
          SUM(file_size) as total_file_size,
          AVG(duration) as avg_duration
        FROM audio_files 
        WHERE is_active = 1
      `).get();

      return row;
    } catch (error) {
      this.logger.error('Get audio stats error:', error);
      throw error;
    }
  }
}

module.exports = AudioService;
