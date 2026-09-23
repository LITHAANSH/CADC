const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

const supabaseService = require('./api/_supabase');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = __dirname;

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

        const result = await supabaseService.signUpUser({ name, email, phone, education, password });
        return sendJson(res, result.status || (result.success ? 201 : 400), result);
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

        const result = await supabaseService.signInUser(email, password);
        return sendJson(res, result.status || (result.success ? 200 : 401), result);
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 3. ADMIN USERS: GET /api/admin/users
    if (req.method === 'GET' && pathname === '/api/admin/users') {
      try {
        const result = await supabaseService.getUsers();
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 4. INQUIRIES: GET & POST /api/inquiries
    if (req.method === 'GET' && pathname === '/api/inquiries') {
      try {
        const result = await supabaseService.getInquiries();
        return sendJson(res, 200, result);
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

        if (!name || !email || !phone) {
          return sendJson(res, 400, {
            success: false,
            message: 'Name, Mail ID, and Phone Number are mandatory.'
          });
        }

        const result = await supabaseService.recordInquiry(body);
        return sendJson(res, 201, result);
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 5. ADMIN INQUIRY STATUS: POST / PUT / PATCH /api/admin/inquiry-status
    if ((req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') && pathname === '/api/admin/inquiry-status') {
      try {
        const body = await parseJsonBody(req);
        const id = (body.id || '').trim();
        const status = (body.status || '').trim();
        const notes = typeof body.notes === 'string' ? body.notes : undefined;

        if (!id || !status) {
          return sendJson(res, 400, { success: false, message: 'Inquiry ID and new status are required.' });
        }

        const validStatuses = ['new', 'in_review', 'contacted', 'converted', 'archived'];
        const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
        if (!validStatuses.includes(normalizedStatus)) {
          return sendJson(res, 400, {
            success: false,
            message: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`
          });
        }

        const result = await supabaseService.updateInquiryStatus(id, normalizedStatus, notes);
        return sendJson(res, result.success ? 200 : 404, result);
      } catch (err) {
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 6. ADMIN STATS: GET /api/admin/stats
    if (req.method === 'GET' && pathname === '/api/admin/stats') {
      try {
        const inquiriesRes = await supabaseService.getInquiries();
        const usersRes = await supabaseService.getUsers();

        const inquiries = inquiriesRes.inquiries || [];
        const users = usersRes.users || [];

        const stats = {
          totalInquiries: inquiries.length,
          totalUsers: users.length,
          newInquiries: inquiries.filter(i => ((i.status || '').toLowerCase() === 'new' || !i.status)).length,
          contactedInquiries: inquiries.filter(i => (i.status || '').toLowerCase() === 'contacted').length,
          convertedProjects: inquiries.filter(i => (i.status || '').toLowerCase() === 'converted').length,
          totalStudents: users.filter(u => u.role === 'student' || u.role !== 'admin').length,
          totalAdmins: users.filter(u => u.role === 'admin').length,
          engine: supabaseService.isSupabaseConfigured() ? 'Supabase Cloud (PostgreSQL)' : 'Local Embedded Engine',
          backendMode: supabaseService.isSupabaseConfigured() ? 'Supabase Cloud (PostgreSQL)' : 'Local Embedded Engine',
          isSupabaseConnected: supabaseService.isSupabaseConfigured()
        };

        return sendJson(res, 200, { success: true, stats, source: inquiriesRes.source });
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

    // Clean URL routing fallback (e.g. /about -> /about.html)
    if (!path.extname(reqPath)) {
      const candidateHtml = path.join(PUBLIC_DIR, `${reqPath}.html`);
      if (fs.existsSync(candidateHtml)) {
        reqPath = `${reqPath}.html`;
      }
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

// Start server
findFreePort(DEFAULT_PORT, (err, port) => {
  if (err) {
    console.error('Failed to find an open port:', err);
    process.exit(1);
  }

  const server = createServer();
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    const mode = supabaseService.isSupabaseConfigured()
      ? '🟢 Supabase Cloud (PostgreSQL)'
      : '🟡 Local Embedded Engine (Dual-Mode Ready)';

    console.log('\n======================================================');
    console.log(`  🚀 CADC Backend & Web Server is Live!`);
    console.log(`  🗄️  Backend Mode:       ${mode}`);
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
