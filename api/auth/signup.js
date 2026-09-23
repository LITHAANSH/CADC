const supabaseService = require('../_supabase');

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

    const result = await supabaseService.signUpUser({ name, email, phone, education, password });
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: result.user,
      source: result.source
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
