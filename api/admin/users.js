const { readDb } = require('../_db');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const db = readDb();
    const safeUsers = (db.users || []).map(({ password, ...u }) => u);
    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      users: safeUsers
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
