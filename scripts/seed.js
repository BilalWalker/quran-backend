// scripts/seed.js
require('dotenv').config();
const Database = require('better-sqlite3');
const { hashPassword } = require('../config/auth');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../quran_admin.sqlite');

async function seedDatabase() {
  const db = new Database(dbPath);
  try {
    console.log('🔄 Seeding SQLite database...');

    // Hash passwords
if (!process.env.ADMIN_PASSWORD || !process.env.EDITOR_PASSWORD) {
  throw new Error("ADMIN_PASSWORD and EDITOR_PASSWORD must be set in .env");
}

const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD);
const editorPassword = await hashPassword(process.env.EDITOR_PASSWORD);


    // ----------------------
    // Users
    // ----------------------
    // After
const users = [
  { username: 'admin', email: 'admin@quran-admin.com', password_hash: adminPassword, role: 'admin' },
  { username: 'editor', email: 'editor@quran-admin.com', password_hash: editorPassword, role: 'editor' }
];


const stmtUser = db.prepare(`
  INSERT INTO users (username, email, password_hash, role, is_active)
  VALUES (@username, @email, @password_hash, @role, 1)
  ON CONFLICT(username) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = 1
`);


    for (const user of users) {
      stmtUser.run(user);
    }

    console.log('✅ Users seeded successfully');

    // ----------------------
    // Languages
    // ----------------------
    const languages = [
      { code: 'ar', name: 'Arabic', direction: 'rtl' },
      { code: 'en', name: 'English', direction: 'ltr' },
      { code: 'ur', name: 'Urdu', direction: 'rtl' },
      { code: 'fr', name: 'French', direction: 'ltr' },
      { code: 'es', name: 'Spanish', direction: 'ltr' },
      { code: 'tr', name: 'Turkish', direction: 'ltr' },
      { code: 'id', name: 'Indonesian', direction: 'ltr' },
      { code: 'ms', name: 'Malay', direction: 'ltr' }
    ];

    const stmtLang = db.prepare(`
      INSERT INTO languages (code, name, direction, is_active)
      VALUES (@code, @name, @direction, 1)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        direction = excluded.direction,
        is_active = 1
    `);

    for (const lang of languages) {
      stmtLang.run(lang);
    }

    console.log('✅ Languages seeded successfully');

    // ----------------------
    // Translation Sources
    // ----------------------
    const translationSources = [
      { name: 'Sahih International', author: 'Sahih International', language_code: 'en', description: 'Clear and easy to understand English translation' },
      { name: 'Pickthall', author: 'Mohammed Marmaduke William Pickthall', language_code: 'en', description: 'The Meaning of the Glorious Qur\'an' },
      { name: 'Yusuf Ali', author: 'Abdullah Yusuf Ali', language_code: 'en', description: 'The Holy Qur\'an: Text, Translation and Commentary' },
      { name: 'Tafseer Ahsan ul-Bayan', author: 'Hafiz Salah ud Din Yusuf', language_code: 'ur', description: 'Urdu translation and commentary' }
    ];

    const stmtSource = db.prepare(`
      INSERT INTO translation_sources (name, author, language_id, description, is_active, created_at, updated_at)
      VALUES (@name, @author,
        (SELECT id FROM languages WHERE code = @language_code),
        @description, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET
        author = excluded.author,
        language_id = excluded.language_id,
        description = excluded.description,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const source of translationSources) {
      stmtSource.run(source);
    }

    console.log('✅ Translation sources seeded successfully');

    // ----------------------
    // Reciters
    // ----------------------
    const reciters = [
      { name: 'Abdul Basit Abdul Samad', name_arabic: 'عبد الباسط عبد الصمد', style: 'Hafs', country: 'Egypt', description: 'Renowned Egyptian Qari' },
      { name: 'Mishary Rashid Alafasy', name_arabic: 'مشاري بن راشد العفاسي', style: 'Hafs', country: 'Kuwait', description: 'Popular contemporary reciter' },
      { name: 'Saad Al Ghamidi', name_arabic: 'سعد بن سعيد الغامدي', style: 'Hafs', country: 'Saudi Arabia', description: 'Imam of the Grand Mosque' }
    ];

    const stmtReciter = db.prepare(`
      INSERT INTO reciters (name, name_arabic, style, country, description, is_active, created_at, updated_at)
      VALUES (@name, @name_arabic, @style, @country, @description, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET
        name_arabic = excluded.name_arabic,
        style = excluded.style,
        country = excluded.country,
        description = excluded.description,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const reciter of reciters) {
      stmtReciter.run(reciter);
    }

    console.log('✅ Reciters seeded successfully');

    // ----------------------
    // Settings
    // ----------------------
    const settings = [
      { key_name: 'app_name', value: 'Quran Admin Panel', description: 'Application name', data_type: 'string', is_public: 1 },
      { key_name: 'version', value: '1.0.0', description: 'Application version', data_type: 'string', is_public: 1 },
      { key_name: 'max_file_size', value: '52428800', description: 'Maximum file size for uploads in bytes', data_type: 'number', is_public: 0 },
      { key_name: 'allowed_audio_formats', value: '["mp3", "wav", "m4a"]', description: 'Allowed audio formats', data_type: 'json', is_public: 0 },
      { key_name: 'default_reciter_id', value: '1', description: 'Default reciter for new audio uploads', data_type: 'number', is_public: 0 },
      { key_name: 'backup_retention_days', value: '30', description: 'Number of days to retain backups', data_type: 'number', is_public: 0 }
    ];

    const stmtSettings = db.prepare(`
      INSERT INTO settings (key_name, value, description, data_type, is_public, created_at, updated_at)
      VALUES (@key_name, @value, @description, @data_type, @is_public, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(key_name) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        data_type = excluded.data_type,
        is_public = excluded.is_public,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const setting of settings) {
      stmtSettings.run(setting);
    }

    console.log('✅ Settings seeded successfully');
    console.log('✅ SQLite database seeding completed!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
