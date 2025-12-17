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

  // removed unused image resolution helpers (moved away from per-event images)

  function buildGoogleCalendarUrl(ev) {
    const start = parseISODate(ev.date);
    if (!start) return '#';
    // All-day event on a single day; end date is next day
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

  // removed unused ICS builder (we link to Google Calendar only)

  global.CSUtils = {
    parseISODate,
    isUpcoming,
    formatDate,
    safe,
    buildGoogleCalendarUrl
  };

  // -----------------------------
  // Motion: load animations & parallax
  // -----------------------------
  function initLoadAnimations() {
    try {
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Subtitle fade-in
      const subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        // next frame to ensure transition applies
        requestAnimationFrame(() => subtitle.classList.add('is-visible'));
      }

      // Social links staggered reveal
      const links = Array.from(document.querySelectorAll('.socials a'));
      if (links.length) {
        links.forEach((a, i) => {
          const delay = prefersReduced ? 0 : 120 * i;
          setTimeout(() => a.classList.add('is-visible'), delay);
        });
      }

      // Background parallax pattern (very subtle)
      if (!prefersReduced) initParallaxBackground();
    } catch (e) {
      // avoid breaking the page if any of these fail
      console.warn('[Motion] initLoadAnimations failed', e);
    }
  }

  function initParallaxBackground() {
    let ticking = false;
    let lastY = window.scrollY || 0;

    function update() {
      ticking = false;
      const y = lastY;
      // Move background positions at different, slow rates
      const x1 = (y * 0.03).toFixed(2);
      const y1 = (y * 0.06).toFixed(2);
      const x2 = (y * -0.02).toFixed(2);
      const y2 = (y * 0.04).toFixed(2);
      document.body.style.backgroundPosition = `${x1}px ${y1}px, ${x2}px ${y2}px`;
    }

    window.addEventListener('scroll', () => {
      lastY = window.scrollY || 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    // initial position
    requestAnimationFrame(() => {
      lastY = window.scrollY || 0;
      update();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadAnimations);
  } else {
    initLoadAnimations();
  }
})(window);
