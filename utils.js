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
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'TBD';
    }
  }

  function safe(v) {
    return (v && String(v).trim()) || 'TBD';
  }

  function buildGoogleCalendarUrl(ev) {
    const start = parseISODate(ev.date);
    if (!start) return '#';
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);
    function icsDate(d){
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2,'0');
      const da = String(d.getDate()).padStart(2,'0');
      return `${y}${m}${da}`;
    }
    const dates = `${icsDate(start)}/${icsDate(end)}`;
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
    const rx = charRect.width / 2 + 6;
    const ry = charRect.height / 2 + 4;

    angles.forEach((angleDeg, i) => {
      const line = document.createElement('div');
      line.className = 'burst-line';
      const rad = angleDeg * Math.PI / 180;
      const ox = Math.sin(rad) * rx;
      const oy = -Math.cos(rad) * ry;
      line.style.transform = `translate(-50%, 0) translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${angleDeg}deg)`;
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

    // Phase 2: Wiggle
    const allPoppedTime = charSpans.length * popDelay + 450;
    setTimeout(() => {
      charSpans.forEach((span, i) => {
        setTimeout(() => span.classList.add('wiggling'), i * 50);
      });
    }, allPoppedTime);

    // Phase 3: Slide up to the header position + fade overlay background
    const slideTime = allPoppedTime + 600 + 300;
    setTimeout(() => {
      // Measure where the real brand h1 is
      const brandRect = brand.getBoundingClientRect();
      const introRect = introBrand.getBoundingClientRect();

      const dx = (brandRect.left + brandRect.width / 2) - (introRect.left + introRect.width / 2);
      const dy = (brandRect.top + brandRect.height / 2) - (introRect.top + introRect.height / 2);
      const scaleRatio = brandRect.width / introRect.width;

      // Animate the text sliding up
      introBrand.style.transition = 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)';
      introBrand.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleRatio})`;

      // Simultaneously fade the overlay background to transparent
      overlay.style.transition = 'background-color 800ms ease';
      overlay.style.backgroundColor = 'transparent';
    }, slideTime);

    // Phase 4: Clean swap — show the real h1 and remove the overlay
    const settleTime = slideTime + 820;
    setTimeout(() => {
      // Show the real brand
      brand.style.visibility = '';

      // Remove overlay entirely (intro text disappears, real h1 is now visible at same spot)
      overlay.remove();

      // Fade in the rest of the page
      const pageContent = document.getElementById('page-content');
      if (pageContent) pageContent.classList.add('visible');

      revealPage(100);
    }, settleTime);
  }

  function revealPage(baseDelay) {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      const pageContent = document.getElementById('page-content');
      if (pageContent) pageContent.classList.add('visible');
    }

    const links = Array.from(document.querySelectorAll('.socials a'));
    if (links.length) {
      const base = prefersReduced ? 0 : (baseDelay || 200);
      const step = prefersReduced ? 0 : 120;
      links.forEach((a, i) => {
        setTimeout(() => a.classList.add('is-visible'), base + step * i);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIntroAnimation);
  } else {
    initIntroAnimation();
  }
})(window);
