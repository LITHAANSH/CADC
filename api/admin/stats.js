const supabaseService = require('../_supabase');

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
    const inquiriesRes = await supabaseService.getInquiries();
    const usersRes = await supabaseService.getUsers();

    const inquiries = inquiriesRes.inquiries || [];
    const users = usersRes.users || [];

    const stats = {
      totalInquiries: inquiries.length,
      totalUsers: users.length,
      newInquiries: inquiries.filter(i => (i.status || '').toLowerCase() === 'new' || !i.status).length,
      contactedInquiries: inquiries.filter(i => (i.status || '').toLowerCase() === 'contacted').length,
      convertedProjects: inquiries.filter(i => (i.status || '').toLowerCase() === 'converted').length,
      totalStudents: users.filter(u => u.role === 'student' || u.role !== 'admin').length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      engine: supabaseService.isSupabaseConfigured() ? 'Supabase Cloud (PostgreSQL)' : 'Local Embedded Engine',
      backendMode: supabaseService.isSupabaseConfigured() ? 'Supabase Cloud (PostgreSQL)' : 'Local Embedded Engine',
      isSupabaseConnected: supabaseService.isSupabaseConfigured()
    };

    return res.status(200).json({
      success: true,
      stats,
      source: inquiriesRes.source
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};
