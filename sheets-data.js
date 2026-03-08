// CSV data loader for events (client-side, no server)
// Primary: Google Sheet CSV export. Fallback: local CSV file.
(function(global){
  'use strict';

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1XwudtMLabL1FlTdqDJL_m1dtat0yWJh3PCSuB2L_5LA/gviz/tq?tqx=out:csv';
  const LOCAL_CSV = 'data/creative-space-events.csv';

  function trim(s){ return (s==null? '' : String(s)).trim(); }

  function parseCSV(text){
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;
    while (i < text.length) {
      const ch = text[i++];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else { field += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field=''; }
        else if (ch === '\r') { /* ignore */ }
        else { field += ch; }
      }
    }
    row.push(field);
    rows.push(row);
    return rows;
  }

  function headerIndexMap(header){
    const map = {};
    header.forEach((h, idx)=>{
      const key = trim(h).replace(/^\uFEFF/, '').toLowerCase();
      map[key] = idx;
    });
    return map;
  }

  function rowsToEvents(rows){
    if (!rows || !rows.length) return [];
    const header = rows[0];
    const idx = headerIndexMap(header);
    const events = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every(c => trim(c)==='')) continue;
      const name = row[idx['name'] ?? -1];
      const date = row[idx['date'] ?? -1];
      if (!trim(name) || !trim(date)) continue;
      const location = row[idx['location'] ?? -1];
      const description = row[idx['description'] ?? -1];
      const imagesRaw = row[idx['image(s)'] ?? idx['images'] ?? -1];
      const images = trim(imagesRaw)
        ? trim(imagesRaw).split(',').map(u => u.trim()).filter(Boolean)
        : [];
      const ev = {
        name: trim(name),
        date: trim(date),
        location: trim(location),
        description: trim(description),
        images
      };
      events.push(ev);
    }
    return events;
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  async function loadEventsFromSheet(){
    let text;
    try {
      text = await fetchCSV(GOOGLE_SHEET_URL);
      console.log('[SheetsData] Loaded from Google Sheet');
    } catch (err) {
      console.warn('[SheetsData] Google Sheet fetch failed, falling back to local CSV', err);
      try {
        text = await fetchCSV(LOCAL_CSV);
        console.log('[SheetsData] Loaded from local CSV fallback');
      } catch (err2) {
        console.error('[SheetsData] Both sources failed', err2);
        throw err2;
      }
    }
    const rows = parseCSV(text);
    const events = rowsToEvents(rows);
    if (!events.length) {
      console.warn('[SheetsData] CSV parsed but no events found.');
    } else {
      console.log(`[SheetsData] Loaded ${events.length} event(s)`);
    }
    return events;
  }

  global.SheetsData = { loadEventsFromSheet };
})(window);
