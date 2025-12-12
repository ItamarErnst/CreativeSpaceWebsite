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

  function resolveEventImage(image) {
    const DEFAULT_IMG = 'images/nextEvent/cover.png';
    const raw = (image == null) ? '' : String(image).trim();
    if (!raw) return DEFAULT_IMG;
    if (raw.includes('/') || /\.[a-z0-9]+$/i.test(raw)) return raw;
    return `images/nextEvent/${raw}.png`;
  }

  function resolveEventImages(ev) {
    // Support ev.images (array) or fallback to single ev.image
    if (Array.isArray(ev && ev.images) && ev.images.length) {
      return ev.images.map(resolveEventImage);
    }
    return [resolveEventImage(ev && ev.image)];
  }

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

  function buildICSDataUrl(ev) {
    const start = parseISODate(ev.date);
    if (!start) return '#';
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);
    function icsDateTime(d){
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2,'0');
      const da = String(d.getDate()).padStart(2,'0');
      return `${y}${m}${da}`; // all-day floating
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CreativeSpace//Site//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${(ev.name||'Event').replace(/\n/g,' ')}`,
      `DTSTART;VALUE=DATE:${icsDateTime(start)}`,
      `DTEND;VALUE=DATE:${icsDateTime(end)}`,
      `DESCRIPTION:${(ev.description||'').replace(/\n/g,' ')}`,
      `LOCATION:${(ev.location||'').replace(/\n/g,' ')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = lines.join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(blob);
  }

  global.CSUtils = {
    parseISODate,
    isUpcoming,
    formatDate,
    safe,
    resolveEventImage,
    resolveEventImages,
    buildGoogleCalendarUrl,
    buildICSDataUrl
  };
})(window);
