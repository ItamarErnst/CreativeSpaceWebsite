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
  // Intro animation + load animations
  // -----------------------------
  // Create 8 comic-style burst lines around a character, pointing outward
  function spawnBurstLines(charWrap) {
    // 8 directions: top, top-right, right, bottom-right, bottom, bottom-left, left, top-left
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const colors = ['var(--accent)', 'var(--accent-gold)', '#E87D6A'];
    const charRect = charWrap.getBoundingClientRect();
    // Distance from center to edge of char, plus gap
    const rx = charRect.width / 2 + 6;
    const ry = charRect.height / 2 + 4;

    angles.forEach((angleDeg, i) => {
      const line = document.createElement('div');
      line.className = 'burst-line';

      const rad = angleDeg * Math.PI / 180;
      // Push the line start to just outside the character edge
      const ox = Math.sin(rad) * rx;
      const oy = -Math.cos(rad) * ry;

      // Rotate so the line points outward (away from center)
      // angle 0 = top = line grows upward (no rotation needed)
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

    // Hide the real h1 — intro brand will replace it
    brand.classList.add('hidden');

    // Split "BliBlaBlu" into individual character spans with wrappers
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

    // Pop in each character with stagger + burst lines
    const popDelay = 100;
    charSpans.forEach((span, i) => {
      setTimeout(() => {
        span.classList.add('popped');
        spawnBurstLines(charWraps[i]);
      }, i * popDelay);
    });

    // After all chars popped, do a little wiggle on each
    const allPoppedTime = charSpans.length * popDelay + 450;
    setTimeout(() => {
      charSpans.forEach((span, i) => {
        setTimeout(() => {
          span.classList.add('wiggling');
        }, i * 50);
      });
    }, allPoppedTime);

    // After wiggle, slide the text up to the header brand position
    const slideTime = allPoppedTime + 600 + 300;
    setTimeout(() => {
      // Temporarily show real brand to measure its position
      brand.style.display = '';
      brand.style.visibility = 'hidden';
      const brandRect = brand.getBoundingClientRect();
      brand.style.display = 'none';

      const introRect = introBrand.getBoundingClientRect();

      // Slide to center-top (where the brand h1 sits)
      const dx = brandRect.left + brandRect.width / 2 - (introRect.left + introRect.width / 2);
      const dy = brandRect.top + brandRect.height / 2 - (introRect.top + introRect.height / 2);
      const scaleRatio = brandRect.width / introRect.width;

      // Start fading overlay background as the text moves
      overlay.classList.add('reveal');

      introBrand.classList.add('sliding');
      introBrand.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleRatio})`;
    }, slideTime);

    // After slide completes, settle the brand into the header permanently
    const settleTime = slideTime + 850;
    setTimeout(() => {
      // Move the intro brand element into the header, replacing the h1
      const header = document.getElementById('site-header');
      introBrand.classList.remove('sliding');
      introBrand.classList.add('settled');
      introBrand.style.transform = '';
      introBrand.removeAttribute('aria-hidden');
      introBrand.setAttribute('role', 'heading');
      introBrand.setAttribute('aria-level', '1');
      header.insertBefore(introBrand, header.firstChild);

      // Remove the overlay (background is already transparent)
      overlay.classList.add('done');
      setTimeout(() => overlay.remove(), 50);

      // Fade in page content
      const pageContent = document.getElementById('page-content');
      if (pageContent) {
        setTimeout(() => pageContent.classList.add('visible'), 50);
      }

      // Stagger social links
      revealPage(200);
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
