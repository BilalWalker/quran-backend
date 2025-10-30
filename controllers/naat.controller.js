// controllers/naat.controller.js
const db = require('../config/db');
const fs = require('fs').promises;

class NaatController {
  // Get all naats
  async getAllNaats(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const naats = db.prepare(`
        SELECT * FROM naats 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const total = db.prepare('SELECT COUNT(*) as count FROM naats').get();

      res.json({
        success: true,
        data: {
          naats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total.count,
            pages: Math.ceil(total.count / limit)
          }
        }
      });

      // Only log if logger exists (don't fail if not available)
      if (req.app && req.app.locals && req.app.locals.logger) {
        req.app.locals.logger.info(`Naats retrieved: ${naats.length}`);
      }
    } catch (error) {
      console.error('Get all naats error:', error);
      if (req.app && req.app.locals && req.app.locals.logger) {
        req.app.locals.logger.error('Get all naats error:', error);
      }
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve naats' 
      });
    }
  }

  // Get single naat by ID
  async getNaatById(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { id } = req.params;

      const naat = db.prepare('SELECT * FROM naats WHERE id = ?').get(id);

      if (!naat) {
        return res.status(404).json({ error: 'Naat not found' });
      }

      res.json({
        success: true,
        data: naat
      });

      logger.info(`Naat retrieved: ${id}`);
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get naat by ID error:', error);
      res.status(500).json({ error: 'Failed to retrieve naat' });
    }
  }

  // Create new naat
  async createNaat(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { title, arabic_text, urdu_translation, english_translation } = req.body;

      if (!title || !arabic_text) {
        return res.status(400).json({ error: 'Title and Arabic text are required' });
      }

      const stmt = db.prepare(`
        INSERT INTO naats (title, arabic_text, urdu_translation, english_translation)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(
        title,
        arabic_text,
        urdu_translation || null,
        english_translation || null
      );

      const newNaat = db.prepare('SELECT * FROM naats WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Naat created successfully',
        data: newNaat
      });

      logger.info(`Naat created: ${newNaat.id} by ${req.user.username}`);
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Create naat error:', error);
      res.status(500).json({ error: 'Failed to create naat' });
    }
  }

  // Update existing naat
  async updateNaat(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { id } = req.params;
      const { title, arabic_text, urdu_translation, english_translation } = req.body;

      const existing = db.prepare('SELECT * FROM naats WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Naat not found' });
      }

      const stmt = db.prepare(`
        UPDATE naats 
        SET title = ?, 
            arabic_text = ?, 
            urdu_translation = ?, 
            english_translation = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        title || existing.title,
        arabic_text || existing.arabic_text,
        urdu_translation !== undefined ? urdu_translation : existing.urdu_translation,
        english_translation !== undefined ? english_translation : existing.english_translation,
        id
      );

      const updatedNaat = db.prepare('SELECT * FROM naats WHERE id = ?').get(id);

      res.json({
        success: true,
        message: 'Naat updated successfully',
        data: updatedNaat
      });

      logger.info(`Naat updated: ${id} by ${req.user.username}`);
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Update naat error:', error);
      res.status(500).json({ error: 'Failed to update naat' });
    }
  }

  // Delete naat
  async deleteNaat(req, res) {
    try {
      const logger = req.app.locals.logger;
      const { id } = req.params;

      const existing = db.prepare('SELECT * FROM naats WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Naat not found' });
      }

      db.prepare('DELETE FROM naats WHERE id = ?').run(id);

      res.json({
        success: true,
        message: 'Naat deleted successfully'
      });

      logger.info(`Naat deleted: ${id} by ${req.user.username}`);
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Delete naat error:', error);
      res.status(500).json({ error: 'Failed to delete naat' });
    }
  }

  // Import naats from CSV
  async importNaatsFromCSV(req, res) {
    try {
      const logger = req.app.locals.logger;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const fileContent = await fs.readFile(req.file.path, 'utf8');
      const lines = fileContent.split('\n');
      
      let imported = 0;
      let errors = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV line (simple parser - handles quoted fields)
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 2) {
            errors.push(`Line ${i + 1}: Invalid format`);
            continue;
          }

          const [title, arabic_text, urdu_translation, english_translation] = matches.map(
            field => field.replace(/^"|"$/g, '').trim()
          );

          if (!title || !arabic_text) {
            errors.push(`Line ${i + 1}: Missing required fields (title or arabic_text)`);
            continue;
          }

          const stmt = db.prepare(`
            INSERT INTO naats (title, arabic_text, urdu_translation, english_translation)
            VALUES (?, ?, ?, ?)
          `);

          stmt.run(
            title,
            arabic_text,
            urdu_translation || null,
            english_translation || null
          );

          imported++;
        } catch (err) {
          errors.push(`Line ${i + 1}: ${err.message}`);
        }
      }

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      logger.info(`${imported} naats imported by ${req.user.username}`);

      res.json({
        success: true,
        message: `Successfully imported ${imported} naats`,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Import naats error:', error);
      res.status(500).json({ error: 'Failed to import naats: ' + error.message });
    }
  }
}

module.exports = new NaatController();