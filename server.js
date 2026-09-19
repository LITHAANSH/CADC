const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// --- In-Memory & Persistent JSON Database ---
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const defaultDb = {
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

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure admin exists
    const hasAdmin = (parsed.users || []).some(u => u.email === 'lithaansh06@gmail.com');
    if (!hasAdmin) {
      parsed.users = parsed.users || [];
      parsed.users.unshift(defaultDb.users[0]);
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch (err) {
    console.warn('Error loading db.json, re-initializing with defaults:', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    return initDatabase();
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to db.json:', err);
    return false;
  }
}

// Initial DB Check
initDatabase();

// --- Helper Functions ---
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Body payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

// --- Main HTTP Server with REST APIs & Static Assets ---
function createServer() {
  return http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // BACKEND REST API ENDPOINTS
    // ==========================================

    // 1. SIGNUP: POST /api/auth/signup
    if (req.method === 'POST' && pathname === '/api/auth/signup') {
      try {
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const phone = (body.phone || '').trim();
        const education = (body.education || '').trim();
        const password = body.password || '';

        if (!name || !email || !phone || !education || !password) {
          return sendJson(res, 400, {
            success: false,
            message: 'All fields (Name, Mail ID, Phone, Education Background, Password) are mandatory.'
          });
        }

        const db = readDb();
        const existing = db.users.find(u => u.email.toLowerCase() === email);
        if (existing) {
          return sendJson(res, 409, {
            success: false,
            message: 'An account with this email address already exists. Please log in.'
          });
        }

        const newUser = {
          id: 'USR-' + Math.floor(100000 + Math.random() * 900000),
          name,
          email,
          phone,
          education,
          password,
          role: email === 'lithaansh06@gmail.com' ? 'admin' : 'student',
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        writeDb(db);

        // Strip password for response
        const { password: _, ...safeUser } = newUser;
        return sendJson(res, 201, {
          success: true,
          message: 'Account created successfully!',
          user: safeUser
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 2. LOGIN: POST /api/auth/login
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      try {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        if (!email || !password) {
          return sendJson(res, 400, {
            success: false,
            message: 'Email ID and password are required.'
          });
        }

        const db = readDb();

        // Check for Admin credentials
        if (email === 'lithaansh06@gmail.com' && password === 'liki') {
          let adminUser = db.users.find(u => u.email === 'lithaansh06@gmail.com');
          if (!adminUser) {
            adminUser = {
              id: 'USR-ADMIN-01',
              name: 'Lithaansh (Admin)',
              email: 'lithaansh06@gmail.com',
              phone: '+91 7483271232',
              education: 'Aerospace & Automotive Engineering Leadership',
              password: 'liki',
              role: 'admin',
              createdAt: new Date().toISOString()
            };
            db.users.push(adminUser);
            writeDb(db);
          }
          const { password: _, ...safeAdmin } = adminUser;
          return sendJson(res, 200, {
            success: true,
            message: 'Admin authentication successful!',
            user: safeAdmin,
            redirect: '/dashboard.html'
          });
        }

        // Check regular user login
        const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
        if (!user) {
          return sendJson(res, 401, {
            success: false,
            message: 'Invalid email address or password. Please try again.'
          });
        }

        const { password: _, ...safeUser } = user;
        return sendJson(res, 200, {
          success: true,
          message: `Welcome back, ${user.name}!`,
          user: safeUser,
          redirect: user.role === 'admin' ? '/dashboard.html' : '/academy.html'
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 3. ADMIN: GET /api/admin/users
    if (req.method === 'GET' && pathname === '/api/admin/users') {
      try {
        const db = readDb();
        const safeUsers = db.users.map(({ password, ...u }) => u);
        return sendJson(res, 200, {
          success: true,
          count: safeUsers.length,
          users: safeUsers
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 4. INQUIRIES: GET & POST /api/inquiries
    if (req.method === 'GET' && pathname === '/api/inquiries') {
      try {
        const db = readDb();
        return sendJson(res, 200, {
          success: true,
          count: (db.inquiries || []).length,
          inquiries: db.inquiries || []
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    if (req.method === 'POST' && pathname === '/api/inquiries') {
      try {
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim();
        const phone = (body.phone || '').trim();
        const preferredCallTime = body.preferred_call_time || body.preferredCallTime || 'Anytime';
        const touchpointChannel = body.touchpoint_channel || body.touchpointChannel || 'Phone Call';
        const service = body.interest || body.program || body.service || 'General Enquiry';
        const message = body.message || '';
        const formType = body.formType || 'Homepage Quick Enquiry';

        if (!name || !email || !phone) {
          return sendJson(res, 400, {
            success: false,
            message: 'Name, Mail ID, and Phone Number are mandatory.'
          });
        }

        const db = readDb();
        db.inquiries = db.inquiries || [];

        const newInquiry = {
          id: 'REQ-' + Math.floor(100000 + Math.random() * 900000),
          timestamp: new Date().toISOString(),
          name,
          email,
          phone,
          service,
          preferredCallTime,
          touchpointChannel,
          message,
          formType
        };

        db.inquiries.unshift(newInquiry);
        writeDb(db);

        return sendJson(res, 201, {
          success: true,
          message: 'Enquiry recorded successfully!',
          inquiry: newInquiry
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let reqPath = decodeURI(pathname);
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, reqPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1><p>The requested page does not exist.</p><a href="/">Back to Home</a>');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      fs.createReadStream(filePath).pipe(res);
    });
  });
}

function findFreePort(port, callback) {
  const tester = net.createServer()
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findFreePort(port + 1, callback);
      } else {
        callback(err);
      }
    })
    .once('listening', () => {
      tester.once('close', () => callback(null, port)).close();
    })
    .listen(port);
}

// Kill previous server instance if any and start fresh
findFreePort(DEFAULT_PORT, (err, port) => {
  if (err) {
    console.error('Failed to find an open port:', err);
    process.exit(1);
  }

  const server = createServer();
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n======================================================');
    console.log(`  🚀 CADC Backend & Web Server is Live!`);
    console.log(`  🌐 Website URL:        ${url}`);
    console.log(`  🔐 Login & Sign-up:    ${url}/login.html`);
    console.log(`  📊 Admin Dashboard:    ${url}/dashboard.html`);
    console.log(`  🔑 Admin Credentials:  lithaansh06@gmail.com / liki`);
    console.log('======================================================\n');

    if (process.argv.includes('--open-dashboard')) {
      const startCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
      exec(`${startCmd} ${url}/dashboard.html`, () => {});
    }
  });
});
