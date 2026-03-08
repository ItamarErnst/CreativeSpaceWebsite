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
  // Motion: load animations (social link stagger)
  // -----------------------------
  function initLoadAnimations() {
    try {
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Social links staggered reveal
      const links = Array.from(document.querySelectorAll('.socials a'));
      if (links.length) {
        const base = prefersReduced ? 0 : 400;
        const step = prefersReduced ? 0 : 150;
        links.forEach((a, i) => {
          const delay = base + step * i;
          setTimeout(() => a.classList.add('is-visible'), delay);
        });
      }
    } catch (e) {
      console.warn('[Motion] initLoadAnimations failed', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadAnimations);
  } else {
    initLoadAnimations();
  }
})(window);
