const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 Starting Comprehensive CADC End-to-End (E2E) Test Suite');
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ [TEST] ${name} ... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error(`   Error: ${err.message}\n`);
      failed++;
    }
  }

  // --- SECTION 1: Page Availability & Navigation ---
  const pages = [
    { path: '/', title: 'Home' },
    { path: '/index.html', title: 'Home File' },
    { path: '/about.html', title: 'About' },
    { path: '/services.html', title: 'What We Do' },
    { path: '/academy.html', title: 'Courses' },
    { path: '/work.html', title: 'Our Work' },
    { path: '/contact.html', title: 'Contact' },
    { path: '/login.html', title: 'Login & Signup' },
    { path: '/dashboard.html', title: 'Admin Dashboard' },
    { path: '/css/style.css', title: 'Design System CSS' },
    { path: '/js/main.js', title: 'Main JS' }
  ];

  for (const p of pages) {
    await test(`GET ${p.path} (${p.title}) returns HTTP 200`, async () => {
      const res = await fetch(`${BASE_URL}${p.path}`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const text = await res.text();
      assert.ok(text.length > 50, 'Response body should not be empty');
    });
  }

  // --- SECTION 2: Course Terminology & Marketplace Check ---
  await test('Verify "Courses" terminology & Udemy-style filters in index.html', async () => {
    const res = await fetch(`${BASE_URL}/index.html`);
    const html = await res.text();
    assert.ok(html.includes('Courses'), 'index.html should contain "Courses"');
    assert.ok(html.includes('data-filter="surfaces"'), 'index.html should contain GSD & Surfacing filter');
    assert.ok(html.includes('data-filter="kinematics"'), 'index.html should contain Kinematics filter');
    assert.ok(html.includes('data-filter="electrical"'), 'index.html should contain Electrical filter');
    assert.ok(html.includes('course-enquire-btn'), 'index.html should contain Course Enquire/Enroll buttons');
  });

  // --- SECTION 3: Authentication Tests ---
  await test('Admin Login with lithaansh06@gmail.com / liki', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lithaansh06@gmail.com', password: 'liki' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'admin');
    assert.strictEqual(data.redirect, '/dashboard.html');
  });

  await test('Reject Invalid Login Credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lithaansh06@gmail.com', password: 'wrongpassword' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  const testStudentEmail = `student_${Date.now()}@cadc-test.com`;
  await test('Student Sign-Up with Name, Phone, and Educational Background', async () => {
    const payload = {
      name: 'Pooja Kulkarni',
      email: testStudentEmail,
      phone: '+91 9988776655',
      education: 'B.E. / B.Tech Automobile / Automotive Engineering',
      password: 'testPassword123!'
    };
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.name, 'Pooja Kulkarni');
    assert.strictEqual(data.user.education, 'B.E. / B.Tech Automobile / Automotive Engineering');
    assert.strictEqual(data.user.role, 'student');
  });

  await test('Reject Duplicate Student Sign-Up', async () => {
    const payload = {
      name: 'Pooja Kulkarni',
      email: testStudentEmail,
      phone: '+91 9988776655',
      education: 'B.E. / B.Tech Automobile / Automotive Engineering',
      password: 'testPassword123!'
    };
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.success, false);
  });

  await test('Student Login with newly created account', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: 'testPassword123!' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'student');
    assert.strictEqual(data.user.name, 'Pooja Kulkarni');
  });

  // --- SECTION 4: Mandatory Touchpoint & Call Scheduling API ---
  await test('Submit Inquiry with mandatory Call Time & Touchpoint Channel', async () => {
    const inquiryPayload = {
      name: 'Rohan Varma',
      email: 'rohan.varma@defense-aero.com',
      phone: '+91 9123456780',
      service: 'Course 2: Advanced Generative Shape Design',
      preferred_call_time: 'Afternoon (12:00 PM – 4:00 PM)',
      touchpoint_channel: 'Google Meet / Video',
      message: 'Interested in team training on aerodynamic surfacing.',
      formType: 'Homepage Quick Enquiry'
    };
    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiryPayload)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.inquiry.preferredCallTime, 'Afternoon (12:00 PM – 4:00 PM)');
    assert.strictEqual(data.inquiry.touchpointChannel, 'Google Meet / Video');
  });

  await test('Reject Inquiry missing mandatory fields', async () => {
    const badPayload = {
      name: '',
      email: 'bad@',
      phone: ''
    };
    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badPayload)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  // --- SECTION 5: Admin User Management & Dashboard API ---
  await test('Admin Fetch Users lists student with education background', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.users.length >= 2, 'Should have at least admin and registered student');
    const student = data.users.find(u => u.email === testStudentEmail);
    assert.ok(student, 'Registered student must exist in admin users list');
    assert.strictEqual(student.education, 'B.E. / B.Tech Automobile / Automotive Engineering');
  });

  await test('Admin Fetch Inquiries contains recorded touchpoint details', async () => {
    const res = await fetch(`${BASE_URL}/api/inquiries`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.inquiries.length > 0, 'Inquiries list should not be empty');
    const recent = data.inquiries[0];
    assert.ok(recent.preferredCallTime, 'Inquiry must have preferredCallTime');
    assert.ok(recent.touchpointChannel, 'Inquiry must have touchpointChannel');
  });

  console.log('\n====================================================');
  console.log(`📊 E2E Test Summary: ${passed} Passed | ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runE2ETests().catch(err => {
  console.error('Fatal E2E Error:', err);
  process.exitCode = 1;
});
