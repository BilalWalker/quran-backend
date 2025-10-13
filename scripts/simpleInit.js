/**
 * Simple Database Initialization
 * Creates only the essential tables needed for your setup
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('\n🗄️  Simple Database Initialization\n');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'quran.db');
console.log(`📁 Database: ${dbPath}\n`);

// Delete existing database for fresh start
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Removed old database\n');
}

// Create new database
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔨 Creating tables...\n');

try {
  // Create tables one by one for better error handling
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ users');

  // Surahs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS surahs (
      id INTEGER PRIMARY KEY,
      name_arabic TEXT NOT NULL,
      name_english TEXT NOT NULL,
      name_transliterated TEXT NOT NULL,
      revelation_type TEXT NOT NULL,
      number_of_ayahs INTEGER NOT NULL,
      bismillah_pre INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ surahs');

  // Ayahs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ayahs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_id INTEGER NOT NULL,
      number_in_surah INTEGER NOT NULL,
      number_in_quran INTEGER NOT NULL,
      text_arabic TEXT NOT NULL,
      text_uthmani TEXT,
      juz_number INTEGER,
      hizb_number INTEGER,
      rub_number INTEGER,
      sajdah_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (surah_id) REFERENCES surahs(id) ON DELETE CASCADE,
      UNIQUE(surah_id, number_in_surah),
      UNIQUE(number_in_quran)
    );
  `);
  console.log('✓ ayahs');

  // Languages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      direction TEXT DEFAULT 'ltr',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ languages');

  // Translation sources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      author TEXT,
      language_id INTEGER NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(language_id) REFERENCES languages(id)
    );
  `);
  console.log('✓ translation_sources');

  // Translations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ayah_id INTEGER NOT NULL,
      source_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      footnotes TEXT,
      is_approved INTEGER DEFAULT 0,
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ayah_id) REFERENCES ayahs(id) ON DELETE CASCADE,
      FOREIGN KEY(source_id) REFERENCES translation_sources(id),
      FOREIGN KEY(approved_by) REFERENCES users(id),
      UNIQUE(ayah_id, source_id)
    );
  `);
  console.log('✓ translations');

  // Reciters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reciters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_arabic TEXT,
      style TEXT,
      country TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ reciters');

  // Audio files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ayah_id INTEGER NOT NULL,
      reciter_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      duration REAL,
      bit_rate INTEGER,
      sample_rate INTEGER,
      format TEXT DEFAULT 'mp3',
      quality TEXT DEFAULT 'medium',
      is_active INTEGER DEFAULT 1,
      uploaded_by INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ayah_id) REFERENCES ayahs(id) ON DELETE CASCADE,
      FOREIGN KEY(reciter_id) REFERENCES reciters(id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id),
      UNIQUE(ayah_id, reciter_id)
    );
  `);
  console.log('✓ audio_files');

  // Activity logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  console.log('✓ activity_logs');

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      data_type TEXT DEFAULT 'string',
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ settings\n');

  // Create essential indexes
  console.log('📇 Creating indexes...\n');
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ayahs_surah_id ON ayahs(surah_id);
    CREATE INDEX IF NOT EXISTS idx_ayahs_number_in_quran ON ayahs(number_in_quran);
    CREATE INDEX IF NOT EXISTS idx_translations_ayah_id ON translations(ayah_id);
    CREATE INDEX IF NOT EXISTS idx_translations_source_id ON translations(source_id);
  `);
  console.log('✓ Essential indexes created\n');

  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();

  console.log('✅ Database initialized successfully!\n');
  console.log('📊 Tables created:', tables.length);
  console.log();

  db.close();

  console.log('='.repeat(60));
  console.log('✅ Database is ready!\n');
  console.log('📌 Next step:');
  console.log('   Run: node scripts/quickSetup.js\n');
  console.log('='.repeat(60) + '\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  db.close();
  process.exit(1);
}