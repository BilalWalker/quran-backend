const db = require('../config/db');
const fs = require('fs').promises;

class ImportExportController {
  async exportTranslations(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { surahNumber } = req.params;
      const { format = 'json', sourceId } = req.query;
      
      if (surahNumber < 1 || surahNumber > 114) {
        return res.status(400).json({ error: 'Invalid surah number' });
      }
      
      let query = `
        SELECT 
          a.number_in_surah as verse_number,
          a.text_arabic,
          t.text as translation,
          ts.name as source_name,
          l.code as language_code
        FROM ayahs a
        LEFT JOIN translations t ON a.id = t.ayah_id
        LEFT JOIN translation_sources ts ON t.source_id = ts.id
        LEFT JOIN languages l ON ts.language_id = l.id
        WHERE a.surah_id = ?
      `;
      const params = [surahNumber];
      
      if (sourceId) {
        query += ' AND t.source_id = ?';
        params.push(sourceId);
      }
      
      query += ' ORDER BY a.number_in_surah';
      
      const data = db.prepare(query).all(...params);
      
      if (format === 'csv') {
        // CSV format
        const csv = [
          'Verse Number,Arabic Text,Translation,Source,Language',
          ...data.map(row => 
            `${row.verse_number},"${row.text_arabic || ''}","${row.translation || ''}","${row.source_name || ''}","${row.language_code || ''}"`
          )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="surah_${surahNumber}_translations.csv"`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="surah_${surahNumber}_translations.json"`);
        res.json({ surah_number: parseInt(surahNumber), translations: data });
      }
      
      logger.info(`Translations exported for surah ${surahNumber} by ${req.user.username}`);
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Export translations error:', error);
      res.status(500).json({ error: 'Failed to export translations' });
    }
  }

  async importTranslations(req, res) {
    try {
      const logger = req.app.locals.logger;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      const { sourceId, format = 'json' } = req.body;
      
      if (!sourceId) {
        return res.status(400).json({ error: 'Source ID is required' });
      }
      
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      
      let translations = [];
      let imported = 0;
      let errors = [];
      
      if (format === 'json') {
        const jsonData = JSON.parse(fileContent);
        translations = jsonData.translations || jsonData;
      } else if (format === 'csv') {
        // Simple CSV parsing
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',');
            translations.push({
              verse_number: parseInt(values[0]),
              surah_id: parseInt(values[1] || 1),
              translation: values[2]?.replace(/^"|"$/g, '')
            });
          }
        }
      }
      
      // Import translations
      const stmt = db.prepare(`
        INSERT INTO translations (ayah_id, source_id, text)
        SELECT a.id, ?, ?
        FROM ayahs a
        WHERE a.surah_id = ? AND a.number_in_surah = ?
        ON CONFLICT(ayah_id, source_id) DO UPDATE SET text = excluded.text, updated_at = CURRENT_TIMESTAMP
      `);
      
      for (const item of translations) {
        try {
          stmt.run(sourceId, item.translation, item.surah_id || 1, item.verse_number);
          imported++;
        } catch (err) {
          errors.push(`Verse ${item.verse_number}: ${err.message}`);
        }
      }
      
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      
      logger.info(`${imported} translations imported by ${req.user.username}`);
      
      res.json({
        success: true,
        message: `Successfully imported ${imported} translations`,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Import translations error:', error);
      res.status(500).json({ error: 'Failed to import translations: ' + error.message });
    }
  }
}

module.exports = new ImportExportController();