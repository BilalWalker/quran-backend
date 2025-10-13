/**
 * Fix Reciters - Force clear and repopulate
 */

const db = require('../config/db');

console.log('\n🔧 Fixing Reciters Table\n');

// Step 1: Clear existing data
console.log('1. Clearing existing reciters...');
db.prepare('DELETE FROM reciters').run();
db.prepare('DELETE FROM sqlite_sequence WHERE name = \'reciters\'').run();
console.log('✓ Cleared\n');

// Step 2: Insert reciters with explicit IDs
console.log('2. Inserting reciters with explicit IDs...\n');

const reciters = [
  { id: 1, name: 'Abdul Basit Abdul Samad', name_arabic: 'عبد الباسط عبد الصمد', style: 'Murattal', country: 'Egypt' },
  { id: 2, name: 'Mishary Rashid Alafasy', name_arabic: 'مشاري بن راشد العفاسي', style: 'Murattal', country: 'Kuwait' },
  { id: 3, name: 'Saad Al-Ghamdi', name_arabic: 'سعد الغامدي', style: 'Murattal', country: 'Saudi Arabia' },
  { id: 4, name: 'Abdul Rahman Al-Sudais', name_arabic: 'عبد الرحمن السديس', style: 'Murattal', country: 'Saudi Arabia' },
  { id: 5, name: 'Saud Al-Shuraim', name_arabic: 'سعود الشريم', style: 'Murattal', country: 'Saudi Arabia' }
];

const stmt = db.prepare(`
  INSERT INTO reciters (id, name, name_arabic, style, country, is_active)
  VALUES (?, ?, ?, ?, ?, 1)
`);

for (const reciter of reciters) {
  stmt.run(reciter.id, reciter.name, reciter.name_arabic, reciter.style, reciter.country);
  console.log(`  ✓ ID ${reciter.id}: ${reciter.name}`);
}

console.log('\n3. Verifying...\n');
const all = db.prepare('SELECT id, name FROM reciters ORDER BY id').all();
console.table(all);

console.log('\n✅ Reciters fixed successfully!\n');
console.log('Now restart your server and try uploading audio.\n');