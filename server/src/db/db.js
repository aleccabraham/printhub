const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config/env');

const dbPath = path.join(config.dataDir, 'printhub.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
