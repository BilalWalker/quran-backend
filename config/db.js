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
  );`
  // You can add more table creations here if needed
];

initQueries.forEach((q) => db.prepare(q).run());

console.log('SQLite database connected and tables ready.');

module.exports = db;
