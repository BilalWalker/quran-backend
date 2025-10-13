const db = require('../config/db');

console.log('Checking Ayah 1:');
const ayah = db.prepare('SELECT * FROM ayahs WHERE id = 1').get();
console.table(ayah);

console.log('\nChecking Translations for Ayah 1:');
const translations = db.prepare(`
  SELECT 
    t.id, t.ayah_id, t.source_id, t.text,
    ts.name as source_name,
    l.code as language_code
  FROM translations t
  JOIN translation_sources ts ON t.source_id = ts.id
  JOIN languages l ON ts.language_id = l.id
  WHERE t.ayah_id = 1
`).all();

if (translations.length > 0) {
  console.table(translations);
} else {
  console.log('❌ NO TRANSLATIONS FOUND FOR AYAH 1!');
  
  console.log('\nChecking first 5 translations:');
  const firstTranslations = db.prepare(`
    SELECT 
      t.ayah_id, 
      a.surah_id, 
      a.number_in_surah,
      t.text,
      l.code as language_code
    FROM translations t
    JOIN ayahs a ON t.ayah_id = a.id
    JOIN translation_sources ts ON t.source_id = ts.id
    JOIN languages l ON ts.language_id = l.id
    LIMIT 5
  `).all();
  console.table(firstTranslations);
}