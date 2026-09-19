const { readDb, saveDb } = require('./_db');

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

  // GET: Retrieve inquiries list
  if (req.method === 'GET') {
    try {
      const db = readDb();
      return res.status(200).json({
        success: true,
        count: (db.inquiries || []).length,
        inquiries: db.inquiries || []
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  // POST: Create new inquiry
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = (body.name || '').trim();
      const email = (body.email || '').trim();
      const phone = (body.phone || '').trim();
      const preferredCallTime = body.preferred_call_time || body.preferredCallTime || 'Anytime';
      const touchpointChannel = body.touchpoint_channel || body.touchpointChannel || 'Phone Call';
      const service = body.interest || body.program || body.service || 'General Enquiry';
      const message = body.message || '';
      const formType = body.formType || 'Homepage Quick Enquiry';

      if (!name || !email || !phone) {
        return res.status(400).json({
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
      saveDb(db);

      return res.status(201).json({
        success: true,
        message: 'Enquiry recorded successfully!',
        inquiry: newInquiry
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
