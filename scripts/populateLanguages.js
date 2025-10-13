/**
 * Populate Languages and Translation Sources
 */

require('dotenv').config();
const db = require('../config/db');

const languages = [
  { code: 'ar', name: 'Arabic', direction: 'rtl' },
  { code: 'en', name: 'English', direction: 'ltr' },
  { code: 'ur', name: 'Urdu', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', direction: 'ltr' },
  { code: 'fa', name: 'Persian', direction: 'rtl' },
  { code: 'id', name: 'Indonesian', direction: 'ltr' },
  { code: 'ms', name: 'Malay', direction: 'ltr' },
  { code: 'fr', name: 'French', direction: 'ltr' },
  { code: 'es', name: 'Spanish', direction: 'ltr' },
  { code: 'de', name: 'German', direction: 'ltr' }
];

const translationSources = [
  {
    name: 'Custom English Translation',
    author: 'Admin',
    language_code: 'en',
    description: 'Custom English translation for the application',
    is_active: 1
  },
  {
    name: 'Custom Urdu Translation',
    author: 'Admin',
    language_code: 'ur',
    description: 'Custom Urdu translation for the application',
    is_active: 1
  },
  {
    name: 'Sahih International',
    author: 'Sahih International',
    language_code: 'en',
    description: 'English translation by Sahih International',
    is_active: 1
  },
  {
    name: 'Pickthall',
    author: 'Mohammed Marmaduke Pickthall',
    language_code: 'en',
    description: 'The Meaning of the Glorious Quran',
    is_active: 1
  },
  {
    name: 'Yusuf Ali',
    author: 'Abdullah Yusuf Ali',
    language_code: 'en',
    description: 'The Holy Quran: Text, Translation and Commentary',
    is_active: 1
  },
  {
    name: 'Maulana Fateh Muhammad Jalandhari',
    author: 'Maulana Fateh Muhammad Jalandhari',
    language_code: 'ur',
    description: 'Urdu translation by Maulana Fateh Muhammad Jalandhari',
    is_active: 1
  },
  {
    name: 'Ahmed Raza Khan',
    author: 'Ahmed Raza Khan Barelvi',
    language_code: 'ur',
    description: 'Kanz-ul-Iman - Urdu translation',
    is_active: 1
  }
];

async function populateLanguages() {
  console.log('🌍 Populating languages...');

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO languages (code, name, direction, is_active)
    VALUES (?, ?, ?, 1)
  `);

  let count = 0;
  for (const lang of languages) {
    const result = stmt.run(lang.code, lang.name, lang.direction);
    if (result.changes > 0) count++;
  }

  console.log(`✓ Inserted ${count} languages\n`);
}

async function populateTranslationSources() {
  console.log('📖 Populating translation sources...');

  const getLanguageId = db.prepare('SELECT id FROM languages WHERE code = ?');
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO translation_sources (name, author, language_id, description, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const source of translationSources) {
    const language = getLanguageId.get(source.language_code);
    
    if (!language) {
      console.log(`⚠️  Language ${source.language_code} not found for ${source.name}`);
      continue;
    }

    const result = insertSource.run(
      source.name,
      source.author,
      language.id,
      source.description,
      source.is_active
    );

    if (result.changes > 0) {
      count++;
      console.log(`  ✓ Added: ${source.name}`);
    }
  }

  console.log(`\n✓ Inserted ${count} translation sources\n`);
}

async function main() {
  console.log('🚀 Starting language and translation source population...\n');

  try {
    await populateLanguages();
    await populateTranslationSources();

    // Verify
    const langCount = db.prepare('SELECT COUNT(*) as count FROM languages').get();
    const sourceCount = db.prepare('SELECT COUNT(*) as count FROM translation_sources').get();

    console.log('='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Languages in database: ${langCount.count}`);
    console.log(`Translation sources in database: ${sourceCount.count}`);
    console.log('='.repeat(50));
    console.log('✅ Population completed successfully!\n');

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

module.exports = { populateLanguages, populateTranslationSources };