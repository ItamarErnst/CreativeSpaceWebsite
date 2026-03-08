// Shared utilities for the site

(function(global){
  'use strict';

  function parseISODate(d) {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec((d || '').trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    const dt = new Date(y, mo, day, 0, 0, 0, 0);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  function isUpcoming(dt, today) {
    return dt.getTime() >= today.getTime();
  }

  function isToday(dt) {
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() &&
           dt.getMonth() === now.getMonth() &&
           dt.getDate() === now.getDate();
  }

  function daysUntil(dt) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dt.getTime());
    target.setHours(0, 0, 0, 0);
    return Math.round((target - now) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dt) {
    try {
      return dt.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'TBD';
    }
  }

  function safe(v) {
    return (v && String(v).trim()) || 'TBD';
  }

  function parseTime(timeStr) {
    if (!timeStr) return null;
    var s = timeStr.trim();
    // Handle Google Sheets Date() format: Date(1899,11,30,16,0,0)
    var dm = /^Date\(\d+,\d+,\d+,(\d+),(\d+),\d+\)$/.exec(s);
    if (dm) return { h: Number(dm[1]), min: Number(dm[2]) };
    // Match formats like "18:00", "18:00:00", "6:00 PM", "6PM", "18.00"
    var m = /^(\d{1,2})[:.](\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s);
    if (!m) m = /^(\d{1,2})\s*(am|pm)$/i.exec(s);
    if (!m) return null;
    let h = Number(m[1]);
    const min = m[2] && !/^(am|pm)$/i.test(m[2]) ? Number(m[2]) : 0;
    const ampm = ((m[4] || m[2] || '')).toLowerCase();
    if ((ampm === 'pm' || ampm === 'pm') && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, min };
  }

  function buildGoogleCalendarUrl(ev) {
    const start = parseISODate(ev.date);
    if (!start) return '#';

    const time = parseTime(ev.time);

    if (time) {
      // Timed event: use datetime format
      start.setHours(time.h, time.min, 0, 0);
      const endTime = parseTime(ev.endtime);
      const end = endTime
        ? new Date(new Date(start).setHours(endTime.h, endTime.min, 0, 0))
        : new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2h duration
      function icsDateTime(d) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}${mo}${da}T${hh}${mm}00`;
      }
      var dates = `${icsDateTime(start)}/${icsDateTime(end)}`;
    } else {
      // All-day event
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 1);
      function icsDate(d) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}${mo}${da}`;
      }
      var dates = `${icsDate(start)}/${icsDate(end)}`;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.name || 'Event',
      dates,
      details: ev.description || '',
      location: ev.location || ''
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  }

  global.CSUtils = {
    parseISODate,
    isUpcoming,
    isToday,
    daysUntil,
    formatDate,
    safe,
    parseTime,
    buildGoogleCalendarUrl
  };

  // -----------------------------
  // Intro animation
  // -----------------------------

  // Create 8 comic-style burst lines around a character, pointing outward
  function spawnBurstLines(charWrap) {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const colors = ['var(--accent)', 'var(--accent-gold)', '#E87D6A'];
    const charRect = charWrap.getBoundingClientRect();
    // Push lines further out from the character
    const rx = charRect.width / 2 + 16;
    const ry = charRect.height / 2 + 14;
    // Random rotation offset for this character's entire burst circle
    const randomOffset = Math.random() * 45;

    angles.forEach((angleDeg, i) => {
      const line = document.createElement('div');
      line.className = 'burst-line';
      const rotated = angleDeg + randomOffset;
      const rad = rotated * Math.PI / 180;
      const ox = Math.sin(rad) * rx;
      const oy = -Math.cos(rad) * ry;
      line.style.transform = `translate(-50%, 0) translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${rotated}deg)`;
      line.style.transformOrigin = 'center top';
      line.style.background = colors[i % 3];
      charWrap.appendChild(line);
      setTimeout(() => line.classList.add('active'), 20 + i * 20);
    });
  }

  function initIntroAnimation() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      revealPage();
      return;
    }

    const overlay = document.getElementById('intro-overlay');
    const introBrand = document.getElementById('intro-brand');
    const brand = document.getElementById('brand');
    if (!overlay || !introBrand || !brand) { revealPage(); return; }

    // Hide the real h1 — we'll show it back at the end
    brand.style.visibility = 'hidden';

    // Build character spans
    const text = 'BliBlaBlu';
    const charWraps = [];
    const charSpans = [];
    text.split('').forEach(ch => {
      const wrap = document.createElement('span');
      wrap.className = 'char-wrap';
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      wrap.appendChild(span);
      introBrand.appendChild(wrap);
      charWraps.push(wrap);
      charSpans.push(span);
    });

    // Phase 1: Pop in each character
    const popDelay = 100;
    charSpans.forEach((span, i) => {
      setTimeout(() => {
        span.classList.add('popped');
        spawnBurstLines(charWraps[i]);
      }, i * popDelay);
    });

    // Phase 2: Slide up to the header position + fade overlay background
    // Wait for all chars to pop + a short pause
    const allPoppedTime = charSpans.length * popDelay + 450;
    const slideTime = allPoppedTime + 400;
    setTimeout(() => {
      // Measure where the real brand h1 is
      const brandRect = brand.getBoundingClientRect();
      const introRect = introBrand.getBoundingClientRect();

      const dx = (brandRect.left + brandRect.width / 2) - (introRect.left + introRect.width / 2);
      const dy = (brandRect.top + brandRect.height / 2) - (introRect.top + introRect.height / 2);
      // Use height ratio for accurate text scaling
      const scaleRatio = brandRect.height / introRect.height;

      // Set up the transition first, then apply target on next frame
      introBrand.style.transition = 'transform 800ms ease-in-out';
      overlay.style.transition = 'background-color 800ms ease';

      // Force the browser to acknowledge current state before animating
      introBrand.offsetHeight; // trigger reflow

      // Now set the targets — browser will animate from current to target
      introBrand.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleRatio})`;
      overlay.style.backgroundColor = 'transparent';

      // Phase 4: When slide finishes, swap intro text for real h1
      let settled = false;
      function settle() {
        if (settled) return;
        settled = true;

        // Show the real brand — it's at the exact same position
        brand.style.visibility = '';

        // Remove overlay (intro text gone, real h1 now visible at same spot)
        overlay.remove();

        // Fade in the rest of the page
        const pageContent = document.getElementById('page-content');
        if (pageContent) pageContent.classList.add('visible');

        revealPage(100);
      }

      introBrand.addEventListener('transitionend', function onEnd(e) {
        if (e.target !== introBrand || e.propertyName !== 'transform') return;
        introBrand.removeEventListener('transitionend', onEnd);
        settle();
      });

      // Safety fallback in case transitionend doesn't fire
      setTimeout(settle, 900);
    }, slideTime);
  }

  function revealPage(baseDelay) {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      const pageContent = document.getElementById('page-content');
      if (pageContent) pageContent.classList.add('visible');
    }

    const base = prefersReduced ? 0 : (baseDelay || 200);

    // Fade in the tagline after the intro settles
    const tagline = document.querySelector('.tagline');
    if (tagline) {
      setTimeout(() => tagline.classList.add('is-visible'), base);
    }

    const links = Array.from(document.querySelectorAll('.socials a'));
    if (links.length) {
      const step = prefersReduced ? 0 : 120;
      const socialBase = base + (prefersReduced ? 0 : 300);
      links.forEach((a, i) => {
        setTimeout(() => a.classList.add('is-visible'), socialBase + step * i);
      });
    }
  }

  function startWhenReady() {
    // Wait for the custom font to load before starting the intro animation
    if (document.fonts && document.fonts.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise(r => setTimeout(r, 1500)) // fallback max wait
      ]).then(() => setTimeout(initIntroAnimation, 100));
    } else {
      // Browser doesn't support document.fonts — use a small fixed delay
      setTimeout(initIntroAnimation, 300);
    }
  }

  // Randomize background wave direction and drift on each page load
  function initWaveBackground() {
    const bg = document.querySelector('body::before');
    // Random rotation angle for the wave lines
    const angle = Math.floor(Math.random() * 360);
    // Random drift direction (angle in radians)
    const driftAngle = Math.random() * 2 * Math.PI;
    const driftX = Math.round(Math.cos(driftAngle) * 300);
    const driftY = Math.round(Math.sin(driftAngle) * 300);

    // Inject dynamic keyframes and rotation
    const style = document.createElement('style');
    style.textContent =
      'body::before { transform: rotate(' + angle + 'deg); }' +
      '@keyframes waveDrift {' +
      '  0%   { background-position: 0 0; }' +
      '  100% { background-position: ' + driftX + 'px ' + driftY + 'px; }' +
      '}';
    document.head.appendChild(style);
  }

  initWaveBackground();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWhenReady);
  } else {
    startWhenReady();
  }
})(window);
