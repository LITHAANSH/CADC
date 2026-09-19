const fs = require('fs');
const path = require('path');
const os = require('os');

// On Vercel / serverless environment, use os.tmpdir() for write permissions
const IS_VERCEL = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DB_TMP_PATH = path.join(os.tmpdir(), 'cadc_db.json');
const LOCAL_DB_PATH = path.join(process.cwd(), 'data', 'db.json');

const DEFAULT_DB = {
  users: [
    {
      id: 'USR-ADMIN-01',
      name: 'Lithaansh (Admin)',
      email: 'lithaansh06@gmail.com',
      phone: '+91 7483271232',
      education: 'Aerospace & Automotive Engineering Leadership',
      password: 'liki',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  inquiries: []
};

let memoryDb = null;

function getDbPath() {
  if (IS_VERCEL) {
    return DB_TMP_PATH;
  }
  return fs.existsSync(path.join(process.cwd(), 'data')) ? LOCAL_DB_PATH : DB_TMP_PATH;
}

function initDb() {
  if (memoryDb) return memoryDb;

  const targetPath = getDbPath();

  if (fs.existsSync(targetPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      memoryDb = ensureAdmin(data);
      return memoryDb;
    } catch (e) {
      console.warn('Failed to parse existing DB, checking local fallback:', e.message);
    }
  }

  // If on Vercel and tmp doesn't have it yet, check if project has data/db.json
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      memoryDb = ensureAdmin(data);
      saveDb(memoryDb);
      return memoryDb;
    } catch (e) {
      console.warn('Failed to parse local DB:', e.message);
    }
  }

  memoryDb = JSON.parse(JSON.stringify(DEFAULT_DB));
  saveDb(memoryDb);
  return memoryDb;
}

function ensureAdmin(db) {
  if (!db.users) db.users = [];
  if (!db.inquiries) db.inquiries = [];
  const hasAdmin = db.users.some(u => u.email === 'lithaansh06@gmail.com');
  if (!hasAdmin) {
    db.users.unshift(DEFAULT_DB.users[0]);
  }
  return db;
}

function readDb() {
  return initDb();
}

function saveDb(data) {
  memoryDb = ensureAdmin(data);
  try {
    const targetPath = getDbPath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(memoryDb, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn('Error saving DB file (using in-memory fallback):', err.message);
    return false;
  }
}

module.exports = {
  readDb,
  saveDb
};
