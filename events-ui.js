// Events UI: render Next Event and Upcoming list, calendar links, and multi-image carousel
// Data source: loads events exclusively from the CSV file at "data/creative-space-events.csv".
(function(){
  'use strict';

  const { parseISODate, isUpcoming, formatDate, safe, resolveEventImages, buildGoogleCalendarUrl, buildICSDataUrl } = window.CSUtils || {};

  function pickEvents() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const source = Array.isArray(window.EVENTS) ? window.EVENTS : [];
    const enriched = source.map(e => ({ ...e, _dateObj: parseISODate(e.date) }))
      .filter(e => e._dateObj && isUpcoming(e._dateObj, today))
      .sort((a,b) => a._dateObj - b._dateObj);
    return { all: enriched };
  }

  function injectCalendarButtons(container, ev) {
    if (!container || !ev) return;
    const wrap = document.createElement('div');
    wrap.className = 'calendar-actions';

    const google = document.createElement('a');
    google.href = buildGoogleCalendarUrl(ev);
    google.target = '_blank';
    google.rel = 'noopener noreferrer';
    google.className = 'cal-btn cal-google';
    google.title = 'Add to Google Calendar';
    google.textContent = '📅 Add to Calendar';
    
    wrap.appendChild(google);
    container.appendChild(wrap);
  }

  function enableImageCarousel(imgEl, ev) {
    const imgs = resolveEventImages(ev);
    if (!imgEl || !imgs || !imgs.length) return;
    let idx = 0;
    function set(i){
      idx = ((i % imgs.length) + imgs.length) % imgs.length;
      imgEl.src = imgs[idx];
      imgEl.alt = safe(ev.name);
    }
    set(0);

    // auto-rotate if multiple
    let timer = null;
    function startAuto(){
      if (imgs.length < 2) return;
      stopAuto();
      timer = setInterval(()=> set(idx+1), 4000);
    }
    function stopAuto(){ if (timer) { clearInterval(timer); timer = null; } }
    startAuto();

    // click to advance
    imgEl.addEventListener('click', ()=>{ set(idx+1); startAuto(); });

    // swipe support
    let touchStartX = 0, touchStartY = 0;
    imgEl.addEventListener('touchstart', (e)=>{
      if (!e.touches || !e.touches.length) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      stopAuto();
    }, { passive: true });
    imgEl.addEventListener('touchend', (e)=>{
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) { startAuto(); return; }
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        // horizontal swipe
        set(dx < 0 ? idx+1 : idx-1);
      }
      startAuto();
    });
  }

  function renderNextEvent(next) {
    const section = document.getElementById('next-event-section');
    if (!section) return;
    if (!next) { section.style.display = 'none'; return; }

    const titleEl = document.getElementById('next-title');
    const dateEl = document.getElementById('next-date');
    const descEl = document.getElementById('next-description');
    const locEl = document.getElementById('next-location');
    const imgEl = document.getElementById('next-event-image');

    const dateText = next._dateObj ? formatDate(next._dateObj) : 'TBD';
    if (dateEl) dateEl.textContent = `Date: ${dateText}`;
    if (titleEl) titleEl.textContent = safe(next.name);
    if (descEl) descEl.textContent = safe(next.description);
    if (locEl) locEl.textContent = `Location: ${safe(next.location)}`;

    // Calendar actions inside the text column
    const rightCol = section.querySelector('.right');
    injectCalendarButtons(rightCol, next);

    // Images carousel on the left image element
    enableImageCarousel(imgEl, next);
  }

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
      const calBtn = document.createElement('a');
      calBtn.href = buildGoogleCalendarUrl(ev);
      calBtn.target = '_blank';
      calBtn.rel = 'noopener noreferrer';
      calBtn.className = 'cal-btn';
      calBtn.textContent = 'Add to Calendar';
      actions.appendChild(calBtn);
      const toggle = document.createElement('span');
      toggle.className = 'toggle';
      toggle.textContent = idx === 0 ? '' : '▾';
      actions.appendChild(toggle);
      header.appendChild(actions);

      const body = document.createElement('div');
      body.className = 'event-body';
      body.innerHTML = `<p class="event-meta">${safe(ev.description)}</p>`;

      item.appendChild(header);
      item.appendChild(body);
      container.appendChild(item);

      if (idx === 0) {
        body.style.display = 'block';
      }

      header.addEventListener('click', (e) => {
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
      });
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
