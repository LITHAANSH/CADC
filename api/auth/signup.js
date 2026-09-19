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
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const education = (body.education || '').trim();
    const password = body.password || '';

    if (!name || !email || !phone || !education || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Name, Mail ID, Phone, Education Background, Password) are mandatory.'
      });
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      return res.status(409).json({
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
    saveDb(db);

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
