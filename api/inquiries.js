const supabaseService = require('./_supabase');

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
      const result = await supabaseService.getInquiries();
      return res.status(200).json(result);
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

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, Mail ID, and Phone Number are mandatory.'
        });
      }

      const result = await supabaseService.recordInquiry(body);
      return res.status(201).json({
        success: true,
        message: 'Enquiry recorded successfully!',
        inquiry: result.inquiry,
        source: result.source
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
};
