const { readDb, saveDb } = require('../_db');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ID and password are required.'
      });
    }

    const db = readDb();

    // Admin authentication
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
        saveDb(db);
      }
      const { password: _, ...safeAdmin } = adminUser;
      return res.status(200).json({
        success: true,
        message: 'Admin authentication successful!',
        user: safeAdmin,
        redirect: '/dashboard.html'
      });
    }

    // Student authentication
    const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please try again.'
      });
    }

    const { password: _, ...safeUser } = user;
    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: safeUser,
      redirect: user.role === 'admin' ? '/dashboard.html' : '/academy.html'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
