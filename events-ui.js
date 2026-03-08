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

  function buildGoogleMapsUrl(location) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(location);
  }

  function renderHighlightEvent(ev, isTodays) {
    const timeHtml = ev.time ? ` <span class="today-event-location">\u2014 ${safe(ev.time)}</span>` : '';
    const locationHtml = ev.location ? ` <span class="today-event-location">\u2014 ${safe(ev.location)}</span>` : '';

    let actionBtn = '';
    if (isTodays && ev.location) {
      actionBtn = `<a class="today-action" href="${buildGoogleMapsUrl(ev.location)}" target="_blank" rel="noopener noreferrer">📍</a>`;
    } else {
      actionBtn = `<a class="today-action" href="${buildGoogleCalendarUrl(ev)}" target="_blank" rel="noopener noreferrer">📅</a>`;
    }

    return `<div class="today-event-row">
      <div class="today-event-name"><span class="today-event-title">${safe(ev.name)}</span>${timeHtml}${locationHtml}</div>
      ${actionBtn}
    </div>`;
  }

  function renderTodayHighlight(todayEvents, futureEvents) {
    const container = document.getElementById('today-highlight');
    const highlighted = new Set();
    if (!container) return highlighted;
    container.innerHTML = '';

    if (todayEvents.length > 0) {
      todayEvents.forEach(ev => highlighted.add(ev));
      const card = document.createElement('div');
      card.className = 'today-card';
      const eventsHtml = todayEvents.map(ev => renderHighlightEvent(ev, true)).join('');
      card.innerHTML = `
        <div class="today-label">Happening Today!</div>
        ${eventsHtml}
      `;
      container.appendChild(card);
    } else if (futureEvents.length > 0) {
      const nextDate = futureEvents[0]._dateObj.getTime();
      const sameDayEvents = futureEvents.filter(e => e._dateObj.getTime() === nextDate);
      sameDayEvents.forEach(ev => highlighted.add(ev));
      const days = daysUntil(sameDayEvents[0]._dateObj);
      const card = document.createElement('div');
      card.className = 'today-card next-up';
      const eventsHtml = sameDayEvents.map(ev => renderHighlightEvent(ev, false)).join('');
      card.innerHTML = `
        <div class="today-label">Next Up: In ${days} day${days === 1 ? '' : 's'} — ${formatDate(sameDayEvents[0]._dateObj)}</div>
        ${eventsHtml}
      `;
      container.appendChild(card);
    }

    return highlighted;
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

      const dateParts = [ev._dateObj ? formatDate(ev._dateObj) : 'TBD'];
      if (ev.time) dateParts.push(safe(ev.time));
      if (ev.location) dateParts.push(safe(ev.location));
      const dateLocationLine = dateParts.join(' \u2014 ');

      card.innerHTML = `
        <div class="event-name">${safe(ev.name)}</div>
        <div class="event-date">${dateLocationLine}</div>
        <div class="event-card-body">
          <div class="event-card-content">
            ${descHtml}
            ${imagesHtml}
          </div>
          <a class="cal-link" href="${buildGoogleCalendarUrl(ev)}" target="_blank" rel="noopener noreferrer">📅</a>
        </div>
      `;

      container.appendChild(card);
    });

    // Fade in on enter, fade out on leave
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
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
    const highlightedIds = renderTodayHighlight(todayEvents, futureEvents);
    const remaining = all.filter(e => !highlightedIds.has(e));
    renderEventCards(remaining);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
