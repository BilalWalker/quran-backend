// scripts/migrate.js
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../quran_admin.sqlite');

function runMigration() {
  const db = new Database(dbPath);
  try {
    console.log('🔄 Running SQLite migration...');

    // ----------------------
    // Users table
    // ----------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin','editor','viewer')) DEFAULT 'editor',
        is_active INTEGER DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_role ON users(role);
    `);

    // ----------------------
    // Surahs table
    // ----------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS surahs (
        id INTEGER PRIMARY KEY,
        name_arabic TEXT NOT NULL,
        name_english TEXT NOT NULL,
        name_transliterated TEXT NOT NULL,
        revelation_type TEXT CHECK(revelation_type IN ('meccan','medinan')) NOT NULL,
        number_of_ayahs INTEGER NOT NULL,
        bismillah_pre INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_revelation_type ON surahs(revelation_type);
    `);

    // ----------------------
    // Ayahs table
    // ----------------------
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
        UNIQUE(surah_id, number_in_surah),
        UNIQUE(number_in_quran),
        FOREIGN KEY(surah_id) REFERENCES surahs(id) ON DELETE CASCADE
      );
    `);

    // ----------------------
// Languages table
// ----------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    direction TEXT CHECK(direction IN ('ltr','rtl')) DEFAULT 'ltr',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ----------------------
// Translation sources table
// ----------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS translation_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    author TEXT,
    language_id INTEGER,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(language_id) REFERENCES languages(id)
  );
`);
// ----------------------
// Translations table
// ----------------------
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

// ----------------------
// Audio files table
// ----------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_id INTEGER NOT NULL,
    reciter_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    duration REAL,
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

// ----------------------
// Activity logs
// ----------------------
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
// ----------------------
// Reciters table
// ----------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS reciters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    name_arabic TEXT,
    style TEXT,
    country TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ----------------------
// Settings table
// ----------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    data_type TEXT,
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);


    console.log('✅ Tables created successfully');

    // ----------------------
    // Populate basic Surah and Ayah data
    // ----------------------
    const count = db.prepare('SELECT COUNT(*) AS count FROM surahs').get().count;
    if (count === 0) {
      console.log('🔄 Populating basic Surah and Ayah data...');
      populateBasicData(db);
      console.log('✅ Basic data populated');
    }

    console.log('✅ SQLite migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

function populateBasicData(db) {
  const basicSurahs = [
    { id: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatihah', name_transliterated: 'Al-Faatiha', revelation_type: 'meccan', number_of_ayahs: 7 },
    { id: 2, name_arabic: 'البقرة', name_english: 'Al-Baqarah', name_transliterated: 'Al-Baqara', revelation_type: 'medinan', number_of_ayahs: 286 },
    { id: 3, name_arabic: 'آل عمران', name_english: 'Ali Imran', name_transliterated: 'Aal-i-Imraan', revelation_type: 'medinan', number_of_ayahs: 200 },
    { id: 4, name_arabic: 'النساء', name_english: 'An-Nisa', name_transliterated: 'An-Nisaa', revelation_type: 'medinan', number_of_ayahs: 176 },
    { id: 5, name_arabic: 'المائدة', name_english: 'Al-Maidah', name_transliterated: 'Al-Maaida', revelation_type: 'medinan', number_of_ayahs: 120 }
  ];

  const stmtSurah = db.prepare(`
    INSERT OR REPLACE INTO surahs 
      (id, name_arabic, name_english, name_transliterated, revelation_type, number_of_ayahs) 
    VALUES (@id, @name_arabic, @name_english, @name_transliterated, @revelation_type, @number_of_ayahs)
  `);

  const stmtAyah = db.prepare(`
    INSERT OR REPLACE INTO ayahs 
      (surah_id, number_in_surah, number_in_quran, text_arabic, juz_number)
    VALUES (@surah_id, @number_in_surah, @number_in_quran, @text_arabic, @juz_number)
  `);

  for (const surah of basicSurahs) {
    stmtSurah.run(surah);

    if (surah.id === 1) {
      const fatihahAyahs = [
        { number_in_surah: 1, text_arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', number_in_quran: 1 },
        { number_in_surah: 2, text_arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', number_in_quran: 2 },
        { number_in_surah: 3, text_arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', number_in_quran: 3 },
        { number_in_surah: 4, text_arabic: 'مَالِكِ يَوْمِ الدِّينِ', number_in_quran: 4 },
        { number_in_surah: 5, text_arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', number_in_quran: 5 },
        { number_in_surah: 6, text_arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', number_in_quran: 6 },
        { number_in_surah: 7, text_arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', number_in_quran: 7 }
      ];
      for (const ayah of fatihahAyahs) {
        stmtAyah.run({ ...ayah, surah_id: surah.id, juz_number: 1 });
      }
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, populateBasicData };
