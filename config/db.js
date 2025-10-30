// config/db.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '../database/quran_admin.sqlite');

// Ensure database folder exists
const dbFolder = path.dirname(dbPath);
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

// Connect to SQLite
const db = new Database(dbPath);

// ✅ CRITICAL: Set UTF-8 encoding for Arabic text support
db.pragma('encoding = "UTF-8"');

// ✅ Recommended: Enable foreign keys and WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ✅ ADD THIS: Check the ayahs table structure
console.log('🔍 Checking ayahs table structure...');
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ayahs'").get();
  console.log('Ayahs table SQL:', tableInfo?.sql);
} catch (error) {
  console.log('⚠️ Ayahs table does not exist yet');
}

// Initialize tables if they don't exist
const initQueries = [
  `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin','editor','user')) DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  
  // ✅ NEW: Naats table
  `CREATE TABLE IF NOT EXISTS naats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      arabic_text TEXT NOT NULL,
      urdu_translation TEXT,
      english_translation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`
];

initQueries.forEach((q) => db.prepare(q).run());

console.log('SQLite database connected and tables ready.');

module.exports = db;