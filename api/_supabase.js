// ========================================================
// CADC — Supabase Client & Dual-Mode Backend Service
// ========================================================

const path = require('path');
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  // dotenv optional in serverless production if already set
}

const { createClient } = require('@supabase/supabase-js');
const localDb = require('./_db');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('your-project-ref') &&
  !SUPABASE_KEY.includes('your-')
);

let supabase = null;
if (isConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.warn('[Supabase] Initialization warning, falling back to local storage:', err.message);
    supabase = null;
  }
}

function isSupabaseConfigured() {
  return isConfigured && supabase !== null;
}

function getClient() {
  return supabase;
}

function normalizeInquiry(inq) {
  if (!inq) return inq;
  const preferredCallTime = inq.preferredCallTime || inq.preferred_call_time || 'Anytime';
  const touchpointChannel = inq.touchpointChannel || inq.touchpoint_channel || 'Phone Call';
  const formType = inq.formType || inq.form_type || 'Homepage Quick Enquiry';
  const adminNotes = inq.adminNotes || inq.admin_notes || '';
  const createdAt = inq.createdAt || inq.created_at || new Date().toISOString();
  return {
    ...inq,
    preferredCallTime,
    preferred_call_time: preferredCallTime,
    touchpointChannel,
    touchpoint_channel: touchpointChannel,
    formType,
    form_type: formType,
    adminNotes,
    admin_notes: adminNotes,
    createdAt,
    created_at: createdAt
  };
}

// --------------------------------------------------------
// 1. INQUIRIES SERVICE
// --------------------------------------------------------
async function recordInquiry(inquiryData) {
  const newInquiry = normalizeInquiry({
    id: inquiryData.id || ('REQ-' + Math.floor(100000 + Math.random() * 900000)),
    name: (inquiryData.name || '').trim(),
    email: (inquiryData.email || '').trim(),
    phone: (inquiryData.phone || '').trim(),
    service: inquiryData.service || inquiryData.interest || inquiryData.program || 'General Enquiry',
    form_type: inquiryData.formType || inquiryData.form_type || 'Homepage Quick Enquiry',
    preferred_call_time: inquiryData.preferredCallTime || inquiryData.preferred_call_time || 'Anytime',
    touchpoint_channel: inquiryData.touchpointChannel || inquiryData.touchpoint_channel || 'Phone Call',
    message: inquiryData.message || '',
    status: inquiryData.status || 'new',
    admin_notes: inquiryData.adminNotes || inquiryData.admin_notes || '',
    created_at: new Date().toISOString()
  });

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .insert([{
          id: newInquiry.id,
          name: newInquiry.name,
          email: newInquiry.email,
          phone: newInquiry.phone,
          service: newInquiry.service,
          form_type: newInquiry.form_type,
          preferred_call_time: newInquiry.preferred_call_time,
          touchpoint_channel: newInquiry.touchpoint_channel,
          message: newInquiry.message,
          status: newInquiry.status,
          admin_notes: newInquiry.admin_notes,
          created_at: newInquiry.created_at
        }])
        .select()
        .single();

      if (error) {
        console.warn('[Supabase] Insert inquiry failed, syncing with local DB:', error.message);
      } else if (data) {
        const normalized = normalizeInquiry(data);
        // Also sync local cache
        const db = localDb.readDb();
        db.inquiries = db.inquiries || [];
        db.inquiries.unshift(normalized);
        localDb.saveDb(db);
        return { success: true, inquiry: normalized, source: 'supabase' };
      }
    } catch (err) {
      console.warn('[Supabase] Error during recordInquiry:', err.message);
    }
  }

  // Fallback to local DB
  const db = localDb.readDb();
  db.inquiries = db.inquiries || [];
  db.inquiries.unshift(newInquiry);
  localDb.saveDb(db);
  return { success: true, inquiry: newInquiry, source: 'local' };
}

async function getInquiries() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const normalizedList = data.map(normalizeInquiry);
        return { success: true, count: normalizedList.length, inquiries: normalizedList, source: 'supabase' };
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch inquiries, using local DB:', err.message);
    }
  }

  const db = localDb.readDb();
  const normalizedList = (db.inquiries || []).map(normalizeInquiry);
  return {
    success: true,
    count: normalizedList.length,
    inquiries: normalizedList,
    source: 'local'
  };
}

async function updateInquiryStatus(id, status, notes) {
  const updates = { status, updated_at: new Date().toISOString() };
  if (typeof notes === 'string') {
    updates.admin_notes = notes;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const normalized = normalizeInquiry(data);
        // Update local cache
        const db = localDb.readDb();
        const idx = (db.inquiries || []).findIndex(i => i.id === id);
        if (idx !== -1) {
          db.inquiries[idx] = { ...db.inquiries[idx], ...normalized };
          localDb.saveDb(db);
        }
        return { success: true, inquiry: normalized, source: 'supabase' };
      }
    } catch (err) {
      console.warn('[Supabase] Failed to update inquiry status:', err.message);
    }
  }

  // Local DB update
  const db = localDb.readDb();
  const item = (db.inquiries || []).find(i => i.id === id);
  if (!item) {
    return { success: false, message: 'Inquiry not found' };
  }
  item.status = status;
  if (typeof notes === 'string') {
    item.admin_notes = notes;
    item.adminNotes = notes;
  }
  localDb.saveDb(db);
  return { success: true, inquiry: normalizeInquiry(item), source: 'local' };
}

// --------------------------------------------------------
// 2. AUTH & PROFILES SERVICE
// --------------------------------------------------------
async function signUpUser({ name, email, phone, education, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === 'lithaansh06@gmail.com';
  const role = isAdmin ? 'admin' : 'student';

  if (isSupabaseConfigured()) {
    try {
      // 1. Create auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            education_background: education,
            role: role
          }
        }
      });

      if (authError) {
        if (authError.message && authError.message.includes('already registered')) {
          return { success: false, status: 409, message: 'An account with this email address already exists. Please log in.' };
        }
        throw authError;
      }

      const userId = authData.user ? authData.user.id : ('USR-' + Math.floor(100000 + Math.random() * 900000));

      // 2. Ensure profile exists in profiles table
      const profile = {
        id: userId,
        email: normalizedEmail,
        full_name: name,
        phone: phone,
        education_background: education,
        role: role,
        created_at: new Date().toISOString()
      };

      await supabase.from('profiles').upsert(profile);

      // Cache locally
      const db = localDb.readDb();
      db.users = db.users || [];
      if (!db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
        db.users.push({ ...profile, name, education, password });
        localDb.saveDb(db);
      }

      return {
        success: true,
        user: { id: userId, email: normalizedEmail, name, phone, education, role },
        source: 'supabase'
      };
    } catch (err) {
      console.warn('[Supabase] Auth signUp error, falling back to local DB:', err.message);
    }
  }

  // Local fallback
  const db = localDb.readDb();
  db.users = db.users || [];
  const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return {
      success: false,
      status: 409,
      message: 'An account with this email address already exists. Please log in.'
    };
  }

  const newUser = {
    id: 'USR-' + Math.floor(100000 + Math.random() * 900000),
    name,
    email: normalizedEmail,
    phone,
    education,
    password,
    role,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  localDb.saveDb(db);

  const { password: _, ...safeUser } = newUser;
  return { success: true, user: safeUser, source: 'local' };
}

async function signInUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // Special Admin check
  if (normalizedEmail === 'lithaansh06@gmail.com' && password === 'liki') {
    const adminProfile = {
      id: 'USR-ADMIN-01',
      name: 'Lithaansh (Admin)',
      email: 'lithaansh06@gmail.com',
      phone: '+91 7483271232',
      education: 'Aerospace & Automotive Engineering Leadership',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    return {
      success: true,
      message: 'Admin authentication successful!',
      user: adminProfile,
      redirect: '/dashboard.html',
      source: isSupabaseConfigured() ? 'supabase' : 'local'
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (!error && data && data.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const safeUser = {
          id: data.user.id,
          email: data.user.email,
          name: profile ? profile.full_name : (data.user.user_metadata.full_name || 'Student User'),
          phone: profile ? profile.phone : (data.user.user_metadata.phone || ''),
          education: profile ? profile.education_background : (data.user.user_metadata.education_background || ''),
          role: profile ? profile.role : (data.user.user_metadata.role || 'student')
        };

        return {
          success: true,
          message: `Welcome back, ${safeUser.name}!`,
          user: safeUser,
          redirect: safeUser.role === 'admin' ? '/dashboard.html' : '/academy.html',
          session: data.session,
          source: 'supabase'
        };
      }
    } catch (err) {
      console.warn('[Supabase] signIn error, checking local DB:', err.message);
    }
  }

  // Local fallback
  const db = localDb.readDb();
  const user = (db.users || []).find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
  if (!user) {
    return {
      success: false,
      status: 401,
      message: 'Invalid email address or password. Please try again.'
    };
  }

  const { password: _, ...safeUser } = user;
  return {
    success: true,
    message: `Welcome back, ${user.name}!`,
    user: safeUser,
    redirect: user.role === 'admin' ? '/dashboard.html' : '/academy.html',
    source: 'local'
  };
}

async function getUsers() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const users = data.map(p => ({
          id: p.id,
          name: p.full_name,
          email: p.email,
          phone: p.phone,
          education: p.education_background,
          role: p.role,
          createdAt: p.created_at
        }));
        return { success: true, count: users.length, users, source: 'supabase' };
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch profiles, using local DB:', err.message);
    }
  }

  const db = localDb.readDb();
  const safeUsers = (db.users || []).map(({ password, ...rest }) => rest);
  return {
    success: true,
    count: safeUsers.length,
    users: safeUsers,
    source: 'local'
  };
}

module.exports = {
  isSupabaseConfigured,
  getClient,
  recordInquiry,
  getInquiries,
  updateInquiryStatus,
  signUpUser,
  signInUser,
  getUsers
};
