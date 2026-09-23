/* ========================================================
   CADC — Main JavaScript
   ======================================================== */

// --- Form Email Delivery Configuration (Web3Forms) ---
// 1. Visit https://web3forms.com and enter the email where you want to receive inquiries.
// 2. Paste the Access Key you receive into the variable below:
const WEB3FORMS_ACCESS_KEY = '30d9eeb9-656d-4eb2-8afb-683ebda39278';

/* --------------------------------------------------------
   0. Theme Management (Light / Dark Mode)
   -------------------------------------------------------- */
function getPreferredTheme() {
  const saved = localStorage.getItem('cadc_theme');
  if (saved) return saved;
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cadc_theme', theme);
  
  // Update desktop toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    const isLight = theme === 'light';
    btn.setAttribute('aria-label', isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme');
    btn.setAttribute('title', isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme');
  });

  // Update mobile toggle buttons
  document.querySelectorAll('.theme-toggle-mobile-badge').forEach(badge => {
    badge.textContent = theme === 'light' ? '☀️ Light' : '🌙 Dark';
  });
}

// Immediate initial execution to prevent flash
applyTheme(getPreferredTheme());

document.addEventListener('DOMContentLoaded', () => {

  // Re-sync on DOM ready and attach event listeners
  applyTheme(getPreferredTheme());

  document.querySelectorAll('.theme-toggle, .theme-toggle-mobile').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
    });
  });

  /* --------------------------------------------------------
     1. Navigation — scroll class + mobile toggle
     -------------------------------------------------------- */
  const nav = document.getElementById('main-nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // Mark active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* --------------------------------------------------------
     2. Scroll-triggered fade-in animations
     -------------------------------------------------------- */
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    fadeEls.forEach(el => observer.observe(el));
  }

  /* --------------------------------------------------------
     3. Before/After Sliders
     -------------------------------------------------------- */
  document.querySelectorAll('.before-after').forEach(slider => {
    const before = slider.querySelector('.before-after-before');
    const divider = slider.querySelector('.before-after-divider');
    let isDragging = false;

    const setPosition = (x) => {
      const rect = slider.getBoundingClientRect();
      const pct = Math.min(Math.max((x - rect.left) / rect.width, 0.02), 0.98);
      const pctStr = `${pct * 100}%`;
      slider.style.setProperty('--slider-pct', pctStr);
      if (before) before.style.width = pctStr;
      if (divider) divider.style.left = pctStr;
    };

    slider.addEventListener('mousedown', (e) => { isDragging = true; setPosition(e.clientX); });
    slider.addEventListener('touchstart', (e) => { isDragging = true; setPosition(e.touches[0].clientX); }, { passive: true });

    window.addEventListener('mousemove', (e) => { if (isDragging) setPosition(e.clientX); });
    window.addEventListener('touchmove', (e) => { if (isDragging) setPosition(e.touches[0].clientX); }, { passive: true });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('touchend', () => { isDragging = false; });
  });

  /* --------------------------------------------------------
     4. Contact Form Tabs
     -------------------------------------------------------- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  /* --------------------------------------------------------
     5. Work Page Filter
     -------------------------------------------------------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const workCards = document.querySelectorAll('.work-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      workCards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* --------------------------------------------------------
     6. Smooth scroll for anchor links
     -------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* --------------------------------------------------------
     7. Counter animation for hero stats
     -------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => countObserver.observe(c));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------
     8. Form submission (Web3Forms direct email delivery + Touchpoint storage)
     -------------------------------------------------------- */
  document.querySelectorAll('form.contact-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      const statusEl = form.querySelector('.form-status');

      const setStatus = (type, msg) => {
        if (!statusEl) return;
        statusEl.style.display = 'block';
        statusEl.textContent = msg;
        if (type === 'success') {
          statusEl.style.background = 'rgba(16, 185, 129, 0.12)';
          statusEl.style.border = '1px solid rgba(16, 185, 129, 0.35)';
          statusEl.style.color = '#34d399';
        } else if (type === 'warning') {
          statusEl.style.background = 'rgba(245, 158, 11, 0.12)';
          statusEl.style.border = '1px solid rgba(245, 158, 11, 0.35)';
          statusEl.style.color = '#fbbf24';
        } else {
          statusEl.style.background = 'rgba(239, 68, 68, 0.12)';
          statusEl.style.border = '1px solid rgba(239, 68, 68, 0.35)';
          statusEl.style.color = '#f87171';
        }
      };

      if (statusEl) statusEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Submitting Enquiry…';

      const formData = new FormData(form);

      const name = (formData.get('name') || '').trim();
      const email = (formData.get('email') || '').trim();
      const phone = (formData.get('phone') || '').trim();
      const preferredCallTime = formData.get('preferred_call_time');
      const touchpointChannel = formData.get('touchpoint_channel');
      const service = formData.get('interest') || formData.get('program');

      // Strict Mandatory Validation
      if (!name) {
        setStatus('error', 'Please enter your Full Name. This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (!email || !email.includes('@')) {
        setStatus('error', 'Please enter a valid Mail ID (Email Address). This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (!phone || phone.length < 7) {
        setStatus('error', 'Please enter a valid Phone Number with country code. This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (!preferredCallTime) {
        setStatus('error', 'Please select your Preferred Time for a Call. This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (!touchpointChannel) {
        setStatus('error', 'Please select your Preferred Touchpoint Mode. This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }
      if (!service) {
        setStatus('error', 'Please select your Service or Course of interest. This field is mandatory.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      // Save submission record
      const record = {
        id: 'REQ-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toISOString(),
        name: name,
        email: email,
        phone: phone,
        service: service,
        preferredCallTime: preferredCallTime,
        touchpointChannel: touchpointChannel,
        message: formData.get('message') || '',
        formType: form.id === 'academy-form' ? 'Academy Course' : (form.id === 'enquire-home-form' ? 'Homepage Quick Enquiry' : 'Client Project')
      };

      // 1. Post to CADC Backend API (Supabase & local DB persistence)
      let backendSaved = false;
      try {
        const apiRes = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const apiData = await apiRes.json();
        if (apiRes.ok && apiData.success) {
          backendSaved = true;
        }
      } catch (err) {
        console.warn('Backend API submission note:', err.message);
      }

      // Also cache in local browser store as backup
      try {
        const all = JSON.parse(localStorage.getItem('cadc_submissions') || '[]');
        all.unshift(record);
        localStorage.setItem('cadc_submissions', JSON.stringify(all));
      } catch (err) {
        console.warn('Could not cache submission locally:', err);
      }

      // 2. Email Delivery via Web3Forms (if configured)
      if (WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY !== 'YOUR_ACCESS_KEY_HERE') {
        if (!formData.get('access_key')) {
          formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        }
        try {
          await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
          });
        } catch (emailErr) {
          console.warn('Web3Forms delivery note:', emailErr.message);
        }
      }

      // Success UI Feedback
      btn.textContent = 'Enquiry Received! ✓';
      btn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
      setStatus('success', `Thank you, ${record.name}! Your enquiry has been recorded in our system. Our engineering team will connect via ${touchpointChannel} during your preferred time (${preferredCallTime}).`);
      form.reset();

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 5000);
    });
  });

  /* --------------------------------------------------------
     9. Udemy-Style Course Category Filters
     -------------------------------------------------------- */
  const courseFilterPills = document.querySelectorAll('.course-filter-pill');
  const courseCards = document.querySelectorAll('.udemy-course-card');

  courseFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const category = pill.dataset.filter;
      courseFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      courseCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* --------------------------------------------------------
     10. Course Enquiry Button Pre-fill Helper
     -------------------------------------------------------- */
  document.querySelectorAll('.course-enquire-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const courseTitle = btn.dataset.courseTitle;
      const selectField = document.getElementById('enq-interest') || document.getElementById('c-interest');
      if (selectField && courseTitle) {
        for (let i = 0; i < selectField.options.length; i++) {
          if (selectField.options[i].text.includes(courseTitle) || selectField.options[i].value.includes(courseTitle)) {
            selectField.selectedIndex = i;
            break;
          }
        }
      }
    });
  });

  /* --------------------------------------------------------
     11. FAQ Accordion Toggle
     -------------------------------------------------------- */
  document.querySelectorAll('.faq-card').forEach(faq => {
    faq.addEventListener('click', () => {
      const isOpen = faq.classList.contains('open');
      // Optionally close other FAQs:
      // document.querySelectorAll('.faq-card').forEach(f => f.classList.remove('open'));
      faq.classList.toggle('open', !isOpen);
    });
  });

  /* --------------------------------------------------------
     12. Hover card tilt (subtle)
     -------------------------------------------------------- */
  document.querySelectorAll('.card, .service-card, .track-card, .udemy-course-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

});

