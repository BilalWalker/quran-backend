/**
 * Reset and Repopulate Database
 * Clears old data and starts fresh
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

console.log('\n🔄 RESET AND REPOPULATE DATABASE\n');
console.log('='.repeat(60));

async function resetDatabase() {
  console.log('\n🗑️  Step 1: Clearing old data...\n');
  
  try {
    // Delete all data from tables (in correct order due to foreign keys)
    db.prepare('DELETE FROM activity_logs').run();
    console.log('✓ Cleared activity_logs');
    
    db.prepare('DELETE FROM audio_files').run();
    console.log('✓ Cleared audio_files');
    
    db.prepare('DELETE FROM translations').run();
    console.log('✓ Cleared translations');
    
    db.prepare('DELETE FROM ayahs').run();
    console.log('✓ Cleared ayahs');
    
    db.prepare('DELETE FROM surahs').run();
    console.log('✓ Cleared surahs');
    
    db.prepare('DELETE FROM translation_sources').run();
    console.log('✓ Cleared translation_sources');
    
    db.prepare('DELETE FROM languages').run();
    console.log('✓ Cleared languages');
    
    db.prepare('DELETE FROM reciters').run();
    console.log('✓ Cleared reciters');
    
    // Reset auto-increment counters
    db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?)').run('ayahs');
    console.log('✓ Reset ayah ID counter');
    
    console.log('\n✅ Database cleared!\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear database:', error.message);
    return false;
  }
}

async function repopulate() {
  console.log('📦 Step 2: Repopulating database...\n');
  
  try {
    // Run populate scripts
    console.log('Adding languages...');
    const { populateLanguages, populateTranslationSources } = require('./populateLanguages');
    await populateLanguages();
    await populateTranslationSources();
    
    console.log('\nFetching Quran data from API...');
    const QuranDataPopulator = require('./populateQuranData');
    const populator = new QuranDataPopulator();
    await populator.populateAll();
    
    console.log('\nMigrating custom translations...');
    const jsonPath = path.join(__dirname, '../data/customTranslation.json');
    
    if (fs.existsSync(jsonPath)) {
      const TranslationMigrator = require('./migrateCustomTranslations');
      const migrator = new TranslationMigrator(jsonPath);
      migrator.migrate('en', 'Custom English Translation');
    } else {
      console.log('⚠️  customTranslation.json not found, skipping');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Repopulation failed:', error.message);
    return false;
  }
}

async function verify() {
  console.log('\n🔍 Step 3: Verifying data...\n');
  
  try {
    const checks = [
      { query: 'SELECT COUNT(*) as c FROM surahs', expected: 114, name: 'Surahs' },
      { query: 'SELECT COUNT(*) as c FROM ayahs', expected: 6236, name: 'Ayahs' },
      { query: 'SELECT COUNT(*) as c FROM languages', expected: 12, name: 'Languages' },
      { query: 'SELECT COUNT(*) as c FROM translations', expected: 5890, name: 'Translations' }
    ];
    
    let allGood = true;
    
    for (const check of checks) {
      const result = db.prepare(check.query).get();
      const status = result.c >= (check.expected * 0.9) ? '✓' : '✗';
      console.log(`  ${status} ${check.name}: ${result.c}${check.expected ? ` (expected ~${check.expected})` : ''}`);
      if (result.c < (check.expected * 0.9)) allGood = false;
    }
    
    // Check ayah IDs
    const firstAyah = db.prepare('SELECT id, surah_id, number_in_surah FROM ayahs ORDER BY id LIMIT 1').get();
    const lastAyah = db.prepare('SELECT id, surah_id, number_in_surah FROM ayahs ORDER BY id DESC LIMIT 1').get();
    
    console.log(`\n  Ayah ID range: ${firstAyah.id} to ${lastAyah.id}`);
    
    if (firstAyah.id !== 1) {
      console.log('  ⚠️  WARNING: First ayah ID is not 1!');
    }
    
    // Check if translations are linked correctly
    const translationCheck = db.prepare(`
      SELECT COUNT(*) as c 
      FROM translations t
      JOIN ayahs a ON t.ayah_id = a.id
      WHERE a.surah_id = 1 AND a.number_in_surah = 1
    `).get();
    
    console.log(`  ${translationCheck.c > 0 ? '✓' : '✗'} Surah 1, Verse 1 has translations: ${translationCheck.c > 0 ? 'YES' : 'NO'}`);
    
    console.log();
    return allGood && firstAyah.id === 1 && translationCheck.c > 0;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n⚠️  WARNING: This will DELETE all data and start fresh!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Step 1: Reset
    const resetOk = await resetDatabase();
    if (!resetOk) {
      console.log('\n❌ Reset failed. Exiting.\n');
      process.exit(1);
    }
    
    // Step 2: Repopulate
    const populateOk = await repopulate();
    if (!populateOk) {
      console.log('\n❌ Repopulation failed. Exiting.\n');
      process.exit(1);
    }
    
    // Step 3: Verify
    const verifyOk = await verify();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(60));
    if (verifyOk) {
      console.log('✅ RESET AND REPOPULATION SUCCESSFUL!');
      console.log(`⏱️  Total time: ${duration} seconds`);
      console.log('\n📌 Next steps:');
      console.log('   1. Restart your server: npm start');
      console.log('   2. Test AyahEditor - it should work now!');
    } else {
      console.log('⚠️  COMPLETED WITH WARNINGS');
      console.log(`⏱️  Total time: ${duration} seconds`);
      console.log('\nPlease check the warnings above.');
    }
    console.log('='.repeat(60) + '\n');
    
    process.exit(verifyOk ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();