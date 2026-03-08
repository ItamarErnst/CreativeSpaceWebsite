// Past Events UI: loads events and renders only past ones
(function(){
  'use strict';

  const { parseISODate } = window.CSUtils || {};
  const { renderEventCards } = window.EventsUI || {};

  function getPastEvents(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .map(e => ({ ...e, _dateObj: parseISODate(e.date) }))
      .filter(e => e._dateObj && e._dateObj.getTime() < today.getTime())
      .sort((a, b) => b._dateObj - a._dateObj); // most recent first
  }

  async function init() {
    const container = document.getElementById('past-events-list');
    if (container) {
      container.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'empty-state';
      el.textContent = 'Loading events\u2026';
      container.appendChild(el);
    }

    let events = [];
    try {
      if (window.SheetsData && typeof window.SheetsData.loadEventsFromSheet === 'function') {
        events = await window.SheetsData.loadEventsFromSheet();
      }
    } catch (e) {
      console.warn('[PastEvents] Failed to load events.', e);
    }

    const past = getPastEvents(events);
    renderEventCards(past, {
      containerId: 'past-events-list',
      showCalendar: false,
      emptyText: 'No previous events yet'
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
