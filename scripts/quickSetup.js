/**
 * Quick Setup - Populate Arabic + English Translation Only
 * Run this for your initial test
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

console.log('\n🚀 Quick Setup - Arabic + English Translation\n');
console.log('='.repeat(60) + '\n');

async function checkDatabase() {
  console.log('📋 Step 1: Checking database...\n');
  
  try {
    // Test database connection
    const test = db.prepare('SELECT 1 as test').get();
    console.log('✓ Database connection successful\n');
    
    // Check if schema exists
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('surahs', 'ayahs', 'translations')
    `).all();
    
    if (tables.length < 3) {
      console.log('⚠️  Database schema incomplete');
      console.log('   Please run: sqlite3 data/quran.db < schema.sql\n');
      return false;
    }
    
    console.log('✓ Database schema exists\n');
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\n💡 Make sure data/quran.db exists and schema.sql has been run\n');
    return false;
  }
}

async function populateLanguages() {
  console.log('🌍 Step 2: Setting up languages...\n');
  
  try {
    const { populateLanguages: populate, populateTranslationSources } = require('./populateLanguages');
    await populate();
    await populateTranslationSources();
    console.log('✓ Languages and sources ready\n');
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function populateQuranData() {
  console.log('📚 Step 3: Fetching Arabic Quran text from API...\n');
  console.log('⏳ This will take 2-3 minutes...\n');
  
  try {
    const QuranDataPopulator = require('./populateQuranData');
    const populator = new QuranDataPopulator();
    await populator.populateAll();
    await populator.verify();
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.log('\n💡 Check your internet connection and try again\n');
    return false;
  }
}

async function migrateEnglishTranslation() {
  console.log('📖 Step 4: Migrating English translation...\n');
  
  const jsonPath = path.join(__dirname, '../data/customTranslation.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️  File not found: ${jsonPath}`);
    console.log('   Please ensure customTranslation.json is in the data/ folder\n');
    return false;
  }
  
  try {
    const TranslationMigrator = require('./migrateCustomTranslations');
    const migrator = new TranslationMigrator(jsonPath);
    migrator.migrate('en', 'Custom English Translation');
    migrator.verify();
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function verifySetup() {
  console.log('\n🔍 Final Verification...\n');
  
  try {
    const checks = [
      { query: 'SELECT COUNT(*) as count FROM surahs', expected: 114, name: 'Surahs' },
      { query: 'SELECT COUNT(*) as count FROM ayahs', expected: 6236, name: 'Ayahs' },
      { query: 'SELECT COUNT(*) as count FROM languages', expected: '>=1', name: 'Languages' },
      { query: 'SELECT COUNT(*) as count FROM translation_sources WHERE language_id = (SELECT id FROM languages WHERE code="en")', expected: '>=1', name: 'English sources' },
      { query: 'SELECT COUNT(*) as count FROM translations', expected: 6236, name: 'English translations' }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      const result = db.prepare(check.query).get();
      const count = result.count;
      
      let passed = false;
      if (typeof check.expected === 'string' && check.expected.startsWith('>=')) {
        const min = parseInt(check.expected.slice(2));
        passed = count >= min;
      } else {
        passed = count === check.expected;
      }
      
      const status = passed ? '✓' : '✗';
      const color = passed ? '' : '⚠️  ';
      console.log(`  ${status} ${color}${check.name}: ${count} (expected ${check.expected})`);
      
      if (!passed) allPassed = false;
    }
    
    console.log();
    return allPassed;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function printSummary(success) {
  console.log('='.repeat(60));
  console.log('📊 SETUP SUMMARY');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ Quick setup completed successfully!\n');
    console.log('📌 What was set up:');
    console.log('   ✓ 114 Surahs');
    console.log('   ✓ 6,236 Arabic Ayahs');
    console.log('   ✓ 6,236 English Translations\n');
    console.log('📌 Next steps:');
    console.log('   1. Start server: npm start');
    console.log('   2. Open AyahEditor in your admin panel');
    console.log('   3. Select any Surah and Ayah');
    console.log('   4. You should see Arabic text + English translation');
    console.log('   5. Try editing and saving!\n');
  } else {
    console.log('❌ Setup completed with errors\n');
    console.log('💡 Please review the errors above and:');
    console.log('   1. Make sure schema.sql has been run');
    console.log('   2. Check your internet connection');
    console.log('   3. Verify customTranslation.json exists\n');
  }
  
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Check database
    const dbOk = await checkDatabase();
    if (!dbOk) {
      await printSummary(false);
      process.exit(1);
    }
    
    // Run setup steps
    const step2 = await populateLanguages();
    if (!step2) {
      await printSummary(false);
      process.exit(1);
    }
    
    const step3 = await populateQuranData();
    if (!step3) {
      await printSummary(false);
      process.exit(1);
    }
    
    const step4 = await migrateEnglishTranslation();
    if (!step4) {
      await printSummary(false);
      process.exit(1);
    }
    
    // Verify everything
    const success = await verifySetup();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Total time: ${duration} seconds\n`);
    
    await printSummary(success);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await printSummary(false);
    process.exit(1);
  }
}

// Run
main();