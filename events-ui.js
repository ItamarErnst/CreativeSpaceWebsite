// Events UI: loads events, renders today highlight and upcoming event cards
(function(){
  'use strict';

  const { parseISODate, isUpcoming, isToday, daysUntil, formatDate, safe, buildGoogleCalendarUrl } = window.CSUtils || {};

  function categorizeEvents(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enriched = events
      .map(e => ({ ...e, _dateObj: parseISODate(e.date) }))
      .filter(e => e._dateObj && isUpcoming(e._dateObj, today))
      .sort((a, b) => a._dateObj - b._dateObj);

    const todayEvents = enriched.filter(e => isToday(e._dateObj));
    const futureEvents = enriched.filter(e => !isToday(e._dateObj));
    return { todayEvents, futureEvents, all: enriched };
  }

  function renderTodayHighlight(todayEvents, futureEvents) {
    const container = document.getElementById('today-highlight');
    if (!container) return;
    container.innerHTML = '';

    if (todayEvents.length > 0) {
      todayEvents.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'today-card';
        card.innerHTML = `
          <div class="today-label">Happening Today!</div>
          <div class="today-event-name">${safe(ev.name)}</div>
          <div class="today-meta">${safe(ev.location)}</div>
        `;
        container.appendChild(card);
      });
    } else if (futureEvents.length > 0) {
      const next = futureEvents[0];
      const days = daysUntil(next._dateObj);
      const card = document.createElement('div');
      card.className = 'today-card next-up';
      card.innerHTML = `
        <div class="today-label">Next Up: In ${days} day${days === 1 ? '' : 's'}</div>
        <div class="today-event-name">${safe(next.name)}</div>
        <div class="today-meta">${formatDate(next._dateObj)}${next.location ? ' \u2022 ' + safe(next.location) : ''}</div>
      `;
      container.appendChild(card);
    }
  }

  function renderEventCards(events) {
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';

    if (!events.length) {
      const el = document.createElement('div');
      el.className = 'empty-state';
      el.textContent = 'No upcoming events right now';
      container.appendChild(el);
      return;
    }

    events.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card';

      let imagesHtml = '';
      if (ev.images && ev.images.length) {
        imagesHtml = `<div class="event-images">${ev.images.map(url => `<img src="${url}" alt="" />`).join('')}</div>`;
      }

      const descHtml = ev.description && ev.description !== 'TBD'
        ? `<div class="event-description">${safe(ev.description)}</div>`
        : '';

      const locationHtml = ev.location
        ? `<div class="event-location">${safe(ev.location)}</div>`
        : '';

      card.innerHTML = `
        <div class="event-name">${safe(ev.name)}</div>
        <div class="event-date">${ev._dateObj ? formatDate(ev._dateObj) : 'TBD'}</div>
        ${locationHtml}
        ${imagesHtml}
        ${descHtml}
        <a class="cal-link" href="${buildGoogleCalendarUrl(ev)}" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
      `;

      container.appendChild(card);
    });

    // Fade-up animation via IntersectionObserver
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      container.querySelectorAll('.event-card').forEach(card => observer.observe(card));
    } else {
      container.querySelectorAll('.event-card').forEach(card => card.classList.add('visible'));
    }
  }

  async function init() {
    let events = [];
    try {
      if (window.SheetsData && typeof window.SheetsData.loadEventsFromSheet === 'function') {
        events = await window.SheetsData.loadEventsFromSheet();
      }
    } catch (e) {
      console.warn('[Events] Failed to load events.', e);
    }

    const { todayEvents, futureEvents, all } = categorizeEvents(events);
    renderTodayHighlight(todayEvents, futureEvents);
    renderEventCards(all);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
