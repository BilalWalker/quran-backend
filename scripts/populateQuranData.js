/**
 * Populate Quran data from API
 * This script fetches Arabic text and surah metadata from external API
 */

require('dotenv').config();
const axios = require('axios');
const db = require('../config/db');

const QURAN_API = 'https://api.alquran.cloud/v1';

class QuranDataPopulator {
  constructor() {
    this.progress = {
      surahs: 0,
      ayahs: 0,
      errors: []
    };
  }

  async fetchSurahList() {
    console.log('📚 Fetching Surah metadata...');
    try {
      const response = await axios.get(`${QURAN_API}/surah`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch surah list:', error.message);
      throw error;
    }
  }

  async fetchSurahWithAyahs(surahNumber) {
    try {
      // Fetch both regular and Uthmani script
      const [regular, uthmani] = await Promise.all([
        axios.get(`${QURAN_API}/surah/${surahNumber}`),
        axios.get(`${QURAN_API}/surah/${surahNumber}/ar.asad`) // or another Uthmani edition
      ]);

      return {
        regular: regular.data.data,
        uthmani: uthmani.data.data
      };
    } catch (error) {
      console.error(`Failed to fetch Surah ${surahNumber}:`, error.message);
      return null;
    }
  }

  insertSurah(surah) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO surahs 
      (id, name_arabic, name_english, name_transliterated, revelation_type, number_of_ayahs, bismillah_pre)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      surah.number,
      surah.name,
      surah.englishName,
      surah.englishNameTranslation,
      surah.revelationType.toLowerCase(),
      surah.numberOfAyahs,
      surah.number === 1 || surah.number === 9 ? 0 : 1 // Surah 1 and 9 don't have separate Bismillah
    );

    this.progress.surahs++;
  }

  insertAyah(surahId, ayah, uthmaniText, globalNumber) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ayahs 
      (surah_id, number_in_surah, number_in_quran, text_arabic, text_uthmani, juz_number, hizb_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        surahId,
        ayah.numberInSurah,
        globalNumber,
        ayah.text,
        uthmaniText || ayah.text,
        ayah.juz || null,
        ayah.hizbQuarter ? Math.ceil(ayah.hizbQuarter / 4) : null
      );

      this.progress.ayahs++;
    } catch (error) {
      this.progress.errors.push({
        surah: surahId,
        ayah: ayah.numberInSurah,
        error: error.message
      });
    }
  }

  async populateAll() {
    console.log('🚀 Starting Quran data population...\n');

    try {
      // Fetch surah list
      const surahList = await this.fetchSurahList();
      console.log(`✓ Found ${surahList.length} surahs\n`);

      let globalAyahNumber = 1;

      // Process each surah
      for (const surahMeta of surahList) {
        console.log(`Processing Surah ${surahMeta.number}: ${surahMeta.englishName}...`);

        // Insert surah metadata
        this.insertSurah(surahMeta);

        // Fetch and insert ayahs
        const surahData = await this.fetchSurahWithAyahs(surahMeta.number);
        
        if (!surahData) {
          console.log(`⚠️  Skipped Surah ${surahMeta.number} due to fetch error`);
          continue;
        }

        const ayahs = surahData.regular.ayahs;
        const uthmaniAyahs = surahData.uthmani.ayahs;

        for (let i = 0; i < ayahs.length; i++) {
          this.insertAyah(
            surahMeta.number,
            ayahs[i],
            uthmaniAyahs[i]?.text,
            globalAyahNumber++
          );
        }

        console.log(`✓ Completed Surah ${surahMeta.number} (${ayahs.length} ayahs)\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.printSummary();

    } catch (error) {
      console.error('❌ Population failed:', error);
      throw error;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✓ Surahs inserted: ${this.progress.surahs}`);
    console.log(`✓ Ayahs inserted: ${this.progress.ayahs}`);
    
    if (this.progress.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.progress.errors.length}`);
      this.progress.errors.forEach(err => {
        console.log(`   - Surah ${err.surah}, Ayah ${err.ayah}: ${err.error}`);
      });
    } else {
      console.log('\n✓ No errors encountered!');
    }
    
    console.log('='.repeat(50));
    console.log('✅ Population completed successfully!\n');
  }

  async verify() {
    console.log('\n🔍 Verifying data...');

    const surahCount = db.prepare('SELECT COUNT(*) as count FROM surahs').get();
    const ayahCount = db.prepare('SELECT COUNT(*) as count FROM ayahs').get();

    console.log(`Surahs in database: ${surahCount.count}/114`);
    console.log(`Ayahs in database: ${ayahCount.count}/6236`);

    if (surahCount.count === 114 && ayahCount.count === 6236) {
      console.log('✅ Verification passed!\n');
      return true;
    } else {
      console.log('⚠️  Data incomplete. Please check errors.\n');
      return false;
    }
  }
}

// Main execution
async function main() {
  const populator = new QuranDataPopulator();
  
  try {
    await populator.populateAll();
    await populator.verify();
    
    console.log('🎉 Quran data population completed successfully!');
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

module.exports = QuranDataPopulator;