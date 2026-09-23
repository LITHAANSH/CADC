const supabaseService = require('../_supabase');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = (body.id || '').trim();
    const status = (body.status || '').trim();
    const notes = typeof body.notes === 'string' ? body.notes : undefined;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry ID and new status are required.'
      });
    }

    const validStatuses = ['new', 'in_review', 'contacted', 'converted', 'archived'];
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await supabaseService.updateInquiryStatus(id, normalizedStatus, notes);
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json({
      success: true,
      message: `Inquiry ${id} status updated to ${status}.`,
      inquiry: result.inquiry,
      source: result.source
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
