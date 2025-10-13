/**
 * Migrate custom translations from JSON file to database
 * This script reads your customTranslation.json and imports it into the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

class TranslationMigrator {
  constructor(jsonFilePath) {
    this.jsonFilePath = jsonFilePath;
    this.progress = {
      surahs: 0,
      verses: 0,
      errors: []
    };
  }

  loadJSON() {
    console.log(`📄 Loading translations from: ${this.jsonFilePath}`);
    
    try {
      const fileContent = fs.readFileSync(this.jsonFilePath, 'utf8');
      const data = JSON.parse(fileContent);
      console.log(`✓ Successfully loaded JSON file\n`);
      return data;
    } catch (error) {
      console.error('❌ Failed to load JSON file:', error.message);
      throw error;
    }
  }

  getOrCreateTranslationSource(languageCode, sourceName) {
    // First, get language ID
    const language = db.prepare('SELECT id FROM languages WHERE code = ?').get(languageCode);
    
    if (!language) {
      throw new Error(`Language with code '${languageCode}' not found. Please run populateLanguages.js first.`);
    }

    // Check if source exists
    let source = db.prepare(`
      SELECT id FROM translation_sources 
      WHERE name = ? AND language_id = ?
    `).get(sourceName, language.id);

    if (!source) {
      // Create new source
      console.log(`Creating translation source: ${sourceName}`);
      const result = db.prepare(`
        INSERT INTO translation_sources (name, author, language_id, description, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(sourceName, 'Admin', language.id, `Custom ${languageCode.toUpperCase()} translation`);

      source = { id: result.lastInsertRowid };
      console.log(`✓ Created source with ID: ${source.id}\n`);
    }

    return source.id;
  }

  insertTranslation(surahId, verseNumber, sourceId, text) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO translations (ayah_id, source_id, text, is_approved)
      SELECT a.id, ?, ?, 1
      FROM ayahs a
      WHERE a.surah_id = ? AND a.number_in_surah = ?
    `);

    try {
      const result = stmt.run(sourceId, text, surahId, verseNumber);
      
      if (result.changes > 0) {
        this.progress.verses++;
        return true;
      } else {
        this.progress.errors.push({
          surah: surahId,
          verse: verseNumber,
          error: 'Ayah not found in database'
        });
        return false;
      }
    } catch (error) {
      this.progress.errors.push({
        surah: surahId,
        verse: verseNumber,
        error: error.message
      });
      return false;
    }
  }

  migrate(languageCode = 'en', sourceName = 'Custom English Translation') {
    console.log('🚀 Starting migration...\n');

    try {
      // Load JSON data
      const translations = this.loadJSON();

      // Get or create translation source
      const sourceId = this.getOrCreateTranslationSource(languageCode, sourceName);
      console.log(`Using translation source ID: ${sourceId}\n`);

      // Process each surah
      const surahNumbers = Object.keys(translations).sort((a, b) => parseInt(a) - parseInt(b));
      
      console.log(`Found ${surahNumbers.length} surahs to migrate\n`);

      for (const surahNum of surahNumbers) {
        const surahData = translations[surahNum];
        const surahId = parseInt(surahNum);

        console.log(`Migrating Surah ${surahId}: ${surahData.name}...`);

        if (!surahData.verses || !Array.isArray(surahData.verses)) {
          console.log(`⚠️  Skipped - no verses array found\n`);
          continue;
        }

        let successCount = 0;
        surahData.verses.forEach((verseText, index) => {
          const verseNumber = index + 1;
          
          if (this.insertTranslation(surahId, verseNumber, sourceId, verseText)) {
            successCount++;
          }
        });

        console.log(`✓ Migrated ${successCount}/${surahData.verses.length} verses\n`);
        this.progress.surahs++;
      }

      this.printSummary();
      this.backupJSON();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✓ Surahs processed: ${this.progress.surahs}`);
    console.log(`✓ Verses migrated: ${this.progress.verses}`);
    
    if (this.progress.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.progress.errors.length}`);
      console.log('First 10 errors:');
      this.progress.errors.slice(0, 10).forEach(err => {
        console.log(`   - Surah ${err.surah}, Verse ${err.verse}: ${err.error}`);
      });
      if (this.progress.errors.length > 10) {
        console.log(`   ... and ${this.progress.errors.length - 10} more errors`);
      }
    } else {
      console.log('\n✓ No errors encountered!');
    }
    
    console.log('='.repeat(50));
  }

  backupJSON() {
    const backupDir = path.join(path.dirname(this.jsonFilePath), 'backups');
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `customTranslation_backup_${timestamp}.json`);

    try {
      fs.copyFileSync(this.jsonFilePath, backupPath);
      console.log(`\n💾 Backup created: ${backupPath}`);
    } catch (error) {
      console.error('⚠️  Failed to create backup:', error.message);
    }
  }

  verify() {
    console.log('\n🔍 Verifying migration...');

    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM translations t
      JOIN translation_sources ts ON t.source_id = ts.id
      WHERE ts.name LIKE 'Custom%'
    `).get();

    console.log(`Custom translations in database: ${result.count}`);
    
    if (result.count > 0) {
      console.log('✅ Verification passed!\n');
      return true;
    } else {
      console.log('⚠️  No custom translations found in database\n');
      return false;
    }
  }
}

// Main execution
async function main() {
  // Default path - adjust if your JSON file is elsewhere
  const defaultJsonPath = path.join(__dirname, '../data/customTranslation.json');
  
  // You can pass custom path as argument
  const jsonPath = process.argv[2] || defaultJsonPath;
  
  // You can specify language code and source name
  const languageCode = process.argv[3] || 'en';
  const sourceName = process.argv[4] || 'Custom English Translation';

  console.log('📚 Custom Translation Migration Tool');
  console.log('='.repeat(50));
  console.log(`JSON File: ${jsonPath}`);
  console.log(`Language: ${languageCode}`);
  console.log(`Source Name: ${sourceName}`);
  console.log('='.repeat(50) + '\n');

  // Check if file exists
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    console.log('\nUsage: node migrateCustomTranslations.js [json-path] [language-code] [source-name]');
    console.log('Example: node migrateCustomTranslations.js ./data/customTranslation.json en "Custom English"');
    process.exit(1);
  }

  const migrator = new TranslationMigrator(jsonPath);
  
  try {
    migrator.migrate(languageCode, sourceName);
    migrator.verify();
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n💡 Tip: Your JSON file has been backed up. You can now safely use the database.');
    console.log('The original JSON file is preserved for reference.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TranslationMigrator;