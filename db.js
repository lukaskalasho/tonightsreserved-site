// Simple file-based datastore.
// This keeps things zero-setup for the MVP: all data lives in data/db.json.
// When you're ready to scale, this single file is the only thing that needs to
// be swapped for a real database (e.g. Postgres) — the rest of the app talks to
// these helper functions, not to the file directly.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function emptyDb() {
  return { users: [], marketers: [], services: [], bookings: [], sessions: [] };
}

function load() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    // make sure every collection exists
    return Object.assign(emptyDb(), data);
  } catch (e) {
    return emptyDb();
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function id(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

module.exports = { load, save, id, emptyDb, DB_PATH };
