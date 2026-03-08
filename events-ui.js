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
    let timeStr = ev.time ? safe(ev.time) : '';
    if (timeStr && ev.endtime) timeStr += ` - ${safe(ev.endtime)}`;

    // Time - Location on one line
    const timeLocParts = [];
    if (timeStr) timeLocParts.push(timeStr);
    if (ev.location) timeLocParts.push(safe(ev.location));
    const timeLocHtml = timeLocParts.length ? `<div class="today-event-time">${timeLocParts.join(' \u2014 ')}</div>` : '';

    const priceHtml = ev.price && ev.price !== 'TBD' ? `<div class="today-event-detail today-event-price">${safe(ev.price)}</div>` : '';
    const descHtml = ev.description && ev.description !== 'TBD' ? `<div class="today-event-detail today-event-desc">${safe(ev.description)}</div>` : '';

    let actionBtn = '';
    if (isTodays && ev.location) {
      actionBtn = `<a class="today-action" href="${buildGoogleMapsUrl(ev.location)}" target="_blank" rel="noopener noreferrer">📍</a>`;
    } else {
      actionBtn = `<a class="today-action" href="${buildGoogleCalendarUrl(ev)}" target="_blank" rel="noopener noreferrer">📅</a>`;
    }

    return `<div class="today-event-row">
      <div class="today-event-info">
        <div class="today-event-title">${safe(ev.name)}</div>
        ${timeLocHtml}
        ${priceHtml}
        ${descHtml}
      </div>
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
      const wrapper = document.createElement('div');
      wrapper.className = 'today-card';
      wrapper.innerHTML = `<div class="today-label">Happening Today!</div>`;
      todayEvents.forEach((ev, i) => {
        const row = document.createElement('div');
        row.className = 'today-event-card float-card';
        if (todayEvents.length > 1) row.style.animationDelay = `${i * 0.8}s`;
        row.innerHTML = renderHighlightEvent(ev, true);
        wrapper.appendChild(row);
      });
      container.appendChild(wrapper);
    } else if (futureEvents.length > 0) {
      const nextDate = futureEvents[0]._dateObj.getTime();
      const sameDayEvents = futureEvents.filter(e => e._dateObj.getTime() === nextDate);
      sameDayEvents.forEach(ev => highlighted.add(ev));
      const days = daysUntil(sameDayEvents[0]._dateObj);
      const wrapper = document.createElement('div');
      wrapper.className = 'today-card next-up';
      wrapper.innerHTML = `<div class="today-label">Next Up: In ${days} day${days === 1 ? '' : 's'} \u2014 ${formatDate(sameDayEvents[0]._dateObj)}</div>`;
      sameDayEvents.forEach((ev, i) => {
        const row = document.createElement('div');
        row.className = 'today-event-card float-card';
        if (sameDayEvents.length > 1) row.style.animationDelay = `${i * 0.8}s`;
        row.innerHTML = renderHighlightEvent(ev, false);
        wrapper.appendChild(row);
      });
      container.appendChild(wrapper);
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

    const total = events.length;
    events.forEach((ev, idx) => {
      const card = document.createElement('div');
      card.className = 'event-card';

      // Gradient: creamy terracotta at top → white at bottom
      const t = total > 1 ? idx / (total - 1) : 1;
      const r = Math.round(242 + (255 - 242) * t);
      const g = Math.round(214 + (255 - 214) * t);
      const b = Math.round(196 + (255 - 196) * t);
      card.style.background = `rgb(${r}, ${g}, ${b})`;

      let imagesHtml = '';
      if (ev.images && ev.images.length) {
        imagesHtml = `<div class="event-images">${ev.images.map(url => `<img src="${url}" alt="" />`).join('')}</div>`;
      }

      const priceHtml = ev.price && ev.price !== 'TBD'
        ? `<div class="event-price">${safe(ev.price)}</div>`
        : '';

      const descHtml = ev.description && ev.description !== 'TBD'
        ? `<div class="event-description">${safe(ev.description)}</div>`
        : '';

      const dateLine = ev._dateObj ? formatDate(ev._dateObj) : 'TBD';
      let timeLine = '';
      if (ev.time) {
        timeLine = safe(ev.time);
        if (ev.endtime) timeLine += ` - ${safe(ev.endtime)}`;
      }
      const locationLine = ev.location ? safe(ev.location) : '';

      card.innerHTML = `
        <div class="event-name">${safe(ev.name)}</div>
        <div class="event-details">
          <div class="event-date">${dateLine}</div>
          ${timeLine ? `<div class="event-time">${timeLine}</div>` : ''}
          ${locationLine ? `<div class="event-location">${locationLine}</div>` : ''}
        </div>
        <div class="event-card-body">
          <div class="event-card-content">
            ${imagesHtml}
            ${priceHtml}
            ${descHtml}
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

  function showFetchingMessage() {
    const highlight = document.getElementById('today-highlight');
    const list = document.getElementById('events-list');
    if (highlight) highlight.innerHTML = '';
    if (list) {
      list.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'empty-state';
      el.textContent = 'Loading events… please refresh the page if this takes too long.';
      list.appendChild(el);
    }
  }

  async function init() {
    // Clear any previously displayed events and show fetching message
    showFetchingMessage();

    let events = [];
    try {
      if (window.SheetsData && typeof window.SheetsData.loadEventsFromSheet === 'function') {
        events = await window.SheetsData.loadEventsFromSheet();
      }
    } catch (e) {
      console.warn('[Events] Failed to load events.', e);
    }

    // Clear everything before rendering fresh data (override previous fetch)
    const highlight = document.getElementById('today-highlight');
    const list = document.getElementById('events-list');
    if (highlight) highlight.innerHTML = '';
    if (list) list.innerHTML = '';

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
