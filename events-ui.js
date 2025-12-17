// Events UI: render Next Event and Upcoming list, calendar links, and multi-image carousel
// Data source: loads events exclusively from the CSV file at "data/creative-space-events.csv".
(function(){
  'use strict';

  const { parseISODate, isUpcoming, formatDate, safe, buildGoogleCalendarUrl } = window.CSUtils || {};

  // Track scroll direction (kept for potential future use, but animations are reveal-once now)
  let lastScrollY = window.scrollY || 0;
  let scrollingDown = true;
  window.addEventListener('scroll', () => {
    const y = window.scrollY || 0;
    scrollingDown = y >= lastScrollY;
    lastScrollY = y;
  }, { passive: true });

  function pickEvents() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const source = Array.isArray(window.EVENTS) ? window.EVENTS : [];
    const enriched = source.map(e => ({ ...e, _dateObj: parseISODate(e.date) }))
      .filter(e => e._dateObj && isUpcoming(e._dateObj, today))
      .sort((a,b) => a._dateObj - b._dateObj);
    return { all: enriched };
  }

  // removed: legacy next-event rendering and inline carousel helpers (unused)

  function renderAccordion(all) {
    const container = document.getElementById('upcoming-list');
    if (!container) return;
    container.innerHTML = '';
    if (!all || !all.length) {
      const empty = document.createElement('div');
      empty.className = 'event';
      empty.textContent = 'No upcoming events.';
      container.appendChild(empty);
      return;
    }

    all.forEach((ev, idx) => {
      const dateText = ev._dateObj ? formatDate(ev._dateObj) : 'TBD';
      const nameText = safe(ev.name);
      const locText = safe(ev.location);

      const item = document.createElement('div');
      item.className = 'event';
      if (idx === 0) item.classList.add('open','locked');

      const header = document.createElement('div');
      header.className = 'event-header';

      const left = document.createElement('div');
      left.innerHTML = `<div class="title">${nameText}</div><div class="meta">${dateText} • ${locText}</div>`;
      header.appendChild(left);

      const actions = document.createElement('div');
      header.appendChild(actions);

      // Calendar emoji anchored to top-right of the event panel
      const calIcon = document.createElement('a');
      calIcon.href = buildGoogleCalendarUrl(ev);
      calIcon.target = '_blank';
      calIcon.rel = 'noopener noreferrer';
      calIcon.className = 'calendar-icon';
      calIcon.title = 'Add to Calendar';
      calIcon.textContent = '📅';

      // Blue arrow anchored to bottom-right of the event panel
      const toggle = document.createElement('span');
      toggle.className = 'toggle';
      toggle.textContent = idx === 0 ? '' : '▾';

      const body = document.createElement('div');
      body.className = 'event-body';
      body.innerHTML = `<p class="event-meta">${safe(ev.description)}</p>`;

      item.appendChild(header);
      item.appendChild(calIcon);
      item.appendChild(toggle);
      item.appendChild(body);
      container.appendChild(item);

      if (idx === 0) {
        body.style.display = 'block';
      }

      function toggleItem() {
        if (idx === 0) return; // locked open
        const isOpen = item.classList.contains('open');
        if (isOpen) {
          item.classList.remove('open');
          body.style.display = 'none';
          toggle.textContent = '▾';
        } else {
          item.classList.add('open');
          body.style.display = 'block';
          toggle.textContent = '▴';
        }
      }

      header.addEventListener('click', (e) => {
        toggleItem();
      });

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleItem();
      });
    });

    // After rendering, hook up intersection-based animations
    setupEventAnimations();
  }

  function setupEventAnimations() {
    const items = Array.from(document.querySelectorAll('#upcoming-list .event'));
    if (!items.length) return;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (!entry.isIntersecting) return; // Only act on enter

        // Reveal only once: if already animated, stop observing
        if (el.dataset.animated === '1') {
          observer.unobserve(el);
          return;
        }

        // Use a consistent direction to avoid visual reversal
        el.classList.remove('from-left', 'from-right');
        el.classList.add('from-left');

        // Stagger by index in DOM order
        const idx = items.indexOf(el);
        const delayMs = prefersReduced ? 0 : Math.min(80 * idx, 320);
        el.style.transitionDelay = `${delayMs}ms`;
        el.classList.add('in-view');
        el.dataset.animated = '1';

        // Stop observing after first reveal to prevent disappearing/reversing
        observer.unobserve(el);
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    items.forEach(el => {
      // initialize off-screen position
      el.classList.add('from-left');
      observer.observe(el);
    });
  }

  async function init() {
    // Load events from the default CSV in data/ (no fallback)
    try {
      if (window.SheetsData && typeof window.SheetsData.loadEventsFromSheet === 'function') {
        const loaded = await window.SheetsData.loadEventsFromSheet(); // defaults to data/creative-space-events.csv
        if (Array.isArray(loaded)) {
          window.EVENTS = loaded;
        }
      }
    } catch (e) {
      console.warn('[Events] Failed to load events from CSV. No events will be shown.', e);
    }

    const { all } = pickEvents();
    // Hide separate next-event block since we use accordion now
    const nextSection = document.getElementById('next-event-section');
    if (nextSection) nextSection.style.display = 'none';
    // Render accordion list
    renderAccordion(all);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
