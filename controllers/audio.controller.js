const AudioService = require('../services/AudioService');
const SurahService = require('../services/SurahService');
const db = require('../config/db');

const audioService = new AudioService(db);
const surahService = new SurahService(db);

class AudioController {
  getReciters(req, res) {
    try {
      const reciters = audioService.getReciters();
      res.json({ success: true, data: reciters });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get reciters error:', error);
      res.status(500).json({ error: 'Failed to fetch reciters' });
    }
  }

  async upload(req, res) {
    try {
      const logger = req.app.locals.logger;
      
      console.log('📥 Audio upload request received');
      console.log('Body:', req.body);
      console.log('File:', req.file);
      console.log('User:', req.user);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Your upload.js uses 'surah' and 'verse' field names
      const { surah, verse, reciterId = 1 } = req.body;
      
      console.log('🔍 Upload details:', { surah, verse, reciterId, filename: req.file.filename });
      
      if (!surah || !verse) {
        return res.status(400).json({ 
          error: 'Surah and verse numbers are required' 
        });
      }

      const surahNumber = parseInt(surah);
      const verseNumber = parseInt(verse);
      const reciterIdNum = parseInt(reciterId);

      // VERIFY: Check if reciter exists
      const reciterExists = db.prepare('SELECT id, name FROM reciters WHERE id = ?').get(reciterIdNum);
      console.log('🔍 Checking reciter ID:', reciterIdNum, '→', reciterExists);
      
      if (!reciterExists) {
        return res.status(400).json({ 
          error: `Reciter with ID ${reciterIdNum} not found. Please select a valid reciter.` 
        });
      }

      // VERIFY: Check if user exists
      const userExists = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.user.id);
      console.log('🔍 Checking user ID:', req.user.id, '→', userExists);
      
      if (!userExists) {
        return res.status(400).json({ 
          error: 'User not found in database' 
        });
      }

      // Get ayah record
      const ayah = db.prepare(`
        SELECT id FROM ayahs 
        WHERE surah_id = ? AND number_in_surah = ?
      `).get(surahNumber, verseNumber);
      
      if (!ayah) {
        return res.status(404).json({ 
          error: `Ayah not found: Surah ${surahNumber}, Verse ${verseNumber}` 
        });
      }

      console.log('✓ Ayah found with ID:', ayah.id);

      // Check if audio already exists for this ayah and reciter
      const existing = db.prepare(`
        SELECT id FROM audio_files 
        WHERE ayah_id = ? AND reciter_id = ?
      `).get(ayah.id, reciterIdNum);

      if (existing) {
        // Update existing record
        db.prepare(`
          UPDATE audio_files 
          SET file_path = ?, file_name = ?, file_size = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(req.file.path, req.file.filename, req.file.size, existing.id);
        
        console.log('✓ Updated existing audio record:', existing.id);
        
        logger.info(`Audio updated for Surah ${surahNumber}, Verse ${verseNumber}`, {
          userId: req.user?.id,
          audioId: existing.id,
          filename: req.file.filename
        });
      } else {
        // Create new record
        const uploadedBy = req.user?.id;
        
        console.log('📝 Inserting new audio record:', {
          ayah_id: ayah.id,
          reciter_id: reciterIdNum,
          uploaded_by: uploadedBy
        });
        
        try {
          const result = db.prepare(`
            INSERT INTO audio_files (ayah_id, reciter_id, file_path, file_name, file_size, format, uploaded_by)
            VALUES (?, ?, ?, ?, ?, 'mp3', ?)
          `).run(
            ayah.id, 
            reciterIdNum, 
            req.file.path, 
            req.file.filename, 
            req.file.size, 
            uploadedBy
          );
          
          console.log('✓ Created new audio record:', result.lastInsertRowid);
          
          logger.info(`Audio uploaded for Surah ${surahNumber}, Verse ${verseNumber}`, {
            userId: req.user?.id,
            audioId: result.lastInsertRowid,
            filename: req.file.filename
          });
        } catch (insertError) {
          console.error('❌ INSERT failed:', insertError.message);
          console.error('Error code:', insertError.code);
          
          // Check what's in the database
          console.log('\n🔍 Debugging foreign keys:');
          const fkList = db.prepare('PRAGMA foreign_key_list(audio_files)').all();
          console.table(fkList);
          
          console.log('\n🔍 Checking referenced tables:');
          console.log('Ayah ID', ayah.id, 'exists:', db.prepare('SELECT id FROM ayahs WHERE id = ?').get(ayah.id));
          console.log('Reciter ID', reciterIdNum, 'exists:', db.prepare('SELECT id FROM reciters WHERE id = ?').get(reciterIdNum));
          console.log('User ID', uploadedBy, 'exists:', db.prepare('SELECT id FROM users WHERE id = ?').get(uploadedBy));
          
          throw insertError;
        }
      }

      res.json({
        success: true,
        message: 'Audio uploaded successfully',
        data: {
          surahNumber: surahNumber,
          verseNumber: verseNumber,
          filename: req.file.filename,
          size: req.file.size,
          path: `/audio/${req.file.filename}`
        }
      });
    } catch (error) {
      const logger = req.app.locals.logger;
      console.error('❌ Audio upload error:', error);
      logger.error('Audio upload error:', error);
      res.status(500).json({ error: 'Failed to upload audio file: ' + error.message });
    }
  }

  async delete(req, res) {
    try {
      const audioId = parseInt(req.params.audioId);
      const deleted = await audioService.delete(audioId);
      
      if (deleted) {
        res.json({ success: true, message: 'Audio file deleted successfully' });
      } else {
        res.status(404).json({ error: 'Audio file not found' });
      }
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Delete audio error:', error);
      res.status(500).json({ error: 'Failed to delete audio file' });
    }
  }

  getStatus(req, res) {
    try {
      const surahNumber = parseInt(req.params.surahNumber);
      const audioStatus = audioService.getSurahAudioStatus(surahNumber);
      res.json({ success: true, data: audioStatus });
    } catch (error) {
      const logger = req.app.locals.logger;
      logger.error('Get audio status error:', error);
      res.status(500).json({ error: 'Failed to get audio status' });
    }
  }
}

module.exports = new AudioController();