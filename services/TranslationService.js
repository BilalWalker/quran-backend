// services/TranslationService.js
class TranslationService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  getSources() {
    try {
      const rows = this.db
        .prepare(`
          SELECT 
            ts.*,
            l.name as language_name,
            l.code as language_code,
            l.direction as language_direction
          FROM translation_sources ts
          JOIN languages l ON ts.language_id = l.id
          WHERE ts.is_active = 1
          ORDER BY l.name, ts.name
        `)
        .all();
      return rows;
    } catch (error) {
      this.logger.error('Get translation sources error:', error);
      throw error;
    }
  }

  getBySurahAndSource(surahNumber, sourceId) {
    try {
      const rows = this.db
        .prepare(`
          SELECT 
            t.*,
            a.number_in_surah,
            a.number_in_quran,
            a.text_arabic
          FROM translations t
          JOIN ayahs a ON t.ayah_id = a.id
          WHERE a.surah_id = ? AND t.source_id = ?
          ORDER BY a.number_in_surah
        `)
        .all(surahNumber, sourceId);
      return rows;
    } catch (error) {
      this.logger.error('Get translation by surah and source error:', error);
      throw error;
    }
  }

  updateTranslation(ayahId, sourceId, data) {
    try {
      const { text, footnotes, is_approved } = data;

      const existing = this.db
        .prepare('SELECT id FROM translations WHERE ayah_id = ? AND source_id = ?')
        .get(ayahId, sourceId);

      if (existing) {
        // Update existing
        this.db
          .prepare(`
            UPDATE translations 
            SET text = ?, footnotes = ?, is_approved = ?, updated_at = CURRENT_TIMESTAMP
            WHERE ayah_id = ? AND source_id = ?
          `)
          .run(text, footnotes, is_approved ? 1 : 0, ayahId, sourceId);
      } else {
        // Insert new
        this.db
          .prepare(`
            INSERT INTO translations (ayah_id, source_id, text, footnotes, is_approved, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `)
          .run(ayahId, sourceId, text, footnotes, is_approved ? 1 : 0);
      }
    } catch (error) {
      this.logger.error('Update translation error:', error);
      throw error;
    }
  }

  search(query, sourceId = null, limit = 50) {
    try {
      let sql = `
        SELECT 
          t.*,
          a.number_in_surah,
          a.number_in_quran,
          a.surah_id,
          s.name_english as surah_name,
          ts.name as source_name
        FROM translations t
        JOIN ayahs a ON t.ayah_id = a.id
        JOIN surahs s ON a.surah_id = s.id
        JOIN translation_sources ts ON t.source_id = ts.id
        WHERE t.text LIKE ?
      `;
      const params = [`%${query}%`];

      if (sourceId) {
        sql += ' AND t.source_id = ?';
        params.push(sourceId);
      }

      sql += ' ORDER BY a.number_in_quran LIMIT ?';
      params.push(limit);

      const rows = this.db.prepare(sql).all(...params);
      return rows;
    } catch (error) {
      this.logger.error('Translation search error:', error);
      throw error;
    }
  }

  getStats() {
    try {
      const row = this.db
        .prepare(`
          SELECT 
            COUNT(*) as total_translations,
            COUNT(DISTINCT source_id) as total_sources,
            SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_translations,
            COUNT(DISTINCT ayah_id) as translated_ayahs
          FROM translations
        `)
        .get();
      return row;
    } catch (error) {
      this.logger.error('Get translation stats error:', error);
      throw error;
    }
  }
}

module.exports = TranslationService;
