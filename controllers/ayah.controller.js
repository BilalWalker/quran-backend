const db = require('../config/db');

class AyahController {
  // Update Ayah Arabic text
  // ayah.controller.js - Updated updateAyah method with full debugging

updateAyah(req, res) {
  try {
    const logger = req.app.locals.logger;
    const { ayahId } = req.params;
    const { text_arabic, text_uthmani } = req.body;
    
    if (!text_arabic) {
      return res.status(400).json({ error: 'Arabic text is required' });
    }

    const result = db.prepare(`
      UPDATE ayahs 
      SET text_arabic = ?, text_uthmani = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(text_arabic, text_uthmani || text_arabic, ayahId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ayah not found' });
    }
    
    // ✅ Return the updated ayah
    const updatedAyah = db.prepare('SELECT * FROM ayahs WHERE id = ?').get(ayahId);
    
    logger.info(`Ayah ${ayahId} updated by ${req.user.username}`);
    
    res.json({ 
      success: true, 
      message: 'Ayah updated successfully',
      data: updatedAyah // ✅ Return the updated data
    });
  } catch (error) {
    const logger = req.app.locals.logger;
    logger.error('Update ayah error:', error);
    res.status(500).json({ error: 'Failed to update ayah' });
  }
}

  // Update ayah indexing
  updateIndexing(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { ayahId } = req.params;
      const { surah_id, number_in_surah, number_in_quran } = req.body;
      
      // Validation
      if (!surah_id || surah_id < 1 || surah_id > 114) {
        return res.status(400).json({ 
          error: 'Surah ID must be between 1 and 114' 
        });
      }
      
      if (!number_in_surah || number_in_surah < 1) {
        return res.status(400).json({ 
          error: 'Number in surah must be greater than 0' 
        });
      }
      
      if (!number_in_quran || number_in_quran < 1 || number_in_quran > 6236) {
        return res.status(400).json({ 
          error: 'Number in Quran must be between 1 and 6236' 
        });
      }
      
      // Check for duplicate indexing
      const duplicate = db.prepare(`
        SELECT id FROM ayahs 
        WHERE (surah_id = ? AND number_in_surah = ? OR number_in_quran = ?) 
        AND id != ?
      `).get(surah_id, number_in_surah, number_in_quran, ayahId);
      
      if (duplicate) {
        return res.status(400).json({ 
          error: 'Indexing conflict: Another ayah already has these values' 
        });
      }

      const result = db.prepare(`
        UPDATE ayahs 
        SET surah_id = ?, number_in_surah = ?, number_in_quran = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(surah_id, number_in_surah, number_in_quran, ayahId);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Ayah not found' });
      }
      
      logger.info(`Ayah ${ayahId} indexing updated by ${req.user.username}`);
      res.json({ success: true, message: 'Indexing updated successfully' });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Update indexing error:', error);
      res.status(500).json({ error: 'Failed to update indexing' });
    }
  }

  // Get translations for a specific ayah
  getTranslations(req, res) {
    try {
      const { ayahId } = req.params;
      
      const translations = db.prepare(`
        SELECT 
          t.*,
          ts.name as source_name,
          ts.author as source_author,
          l.name as language_name,
          l.code as language_code,
          l.direction as language_direction
        FROM translations t
        JOIN translation_sources ts ON t.source_id = ts.id
        JOIN languages l ON ts.language_id = l.id
        WHERE t.ayah_id = ?
        ORDER BY l.name, ts.name
      `).all(ayahId);
      
      res.json({ success: true, data: translations });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get ayah translations error:', error);
      res.status(500).json({ error: 'Failed to fetch translations' });
    }
  }

  // Create or update translation for specific ayah and source
  updateTranslation(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { ayahId, sourceId } = req.params;
      const { text, footnotes } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Translation text is required' });
      }

      // Check if translation exists
      const existing = db.prepare(
        'SELECT id FROM translations WHERE ayah_id = ? AND source_id = ?'
      ).get(ayahId, sourceId);

      if (existing) {
        // Update
        db.prepare(`
          UPDATE translations 
          SET text = ?, footnotes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE ayah_id = ? AND source_id = ?
        `).run(text, footnotes, ayahId, sourceId);
      } else {
        // Insert
        db.prepare(`
          INSERT INTO translations (ayah_id, source_id, text, footnotes)
          VALUES (?, ?, ?, ?)
        `).run(ayahId, sourceId, text, footnotes);
      }
      
      logger.info(
        `Translation updated for ayah ${ayahId}, source ${sourceId} by ${req.user.username}`
      );
      res.json({ success: true, message: 'Translation saved successfully' });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Save translation error:', error);
      res.status(500).json({ error: 'Failed to save translation' });
    }
  }
}

module.exports = new AyahController();