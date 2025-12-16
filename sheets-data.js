// CSV data loader for events (client-side, no server)
// Exposes window.SheetsData.loadEventsFromSheet(url?) which reads a CSV file.
// Default source (when url omitted): "data/creative-space-events.csv" (no spaces; mobile-safe path).
(function(global){
  'use strict';

  function trim(s){ return (s==null? '' : String(s)).trim(); }

  // Small CSV parser supporting quoted fields and commas/newlines inside quotes
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
        else if (ch === '\r') { /* ignore, handle on \n */ }
        else { field += ch; }
      }
    }
    // push last
    row.push(field);
    rows.push(row);
    return rows;
  }

  function headerIndexMap(header){
    const map = {};
    header.forEach((h, idx)=>{
      // Normalize header: trim, lowercase, strip BOM if present
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
      // Require at least name and date
      if (!trim(name) || !trim(date)) continue;
      const location = row[idx['location'] ?? -1];
      const description = row[idx['description'] ?? -1];
      const ev = {
        name: trim(name),
        date: trim(date),
        location: trim(location),
        description: trim(description)
      };
      events.push(ev);
    }
    return events;
  }

  async function loadEventsFromSheet(url){
    const target = (url && String(url).trim()) || 'data/creative-space-events.csv';
    let res;
    try {
      res = await fetch(encodeURI(target), { cache: 'no-store' });
    } catch (err) {
      console.error('[SheetsData] Network error fetching CSV', { target }, err);
      throw err;
    }
    if (!res.ok) {
      const msg = `[SheetsData] Failed to fetch CSV ${target} (status ${res.status})`;
      console.error(msg);
      throw new Error(msg);
    }
    const text = await res.text();
    const rows = parseCSV(text);
    const events = rowsToEvents(rows);
    if (!events.length) {
      console.warn('[SheetsData] CSV parsed but no events found. Check headers (need name,date,location,description).', { target, header: rows && rows[0] });
    } else {
      console.log(`[SheetsData] Loaded ${events.length} event(s) from`, target);
    }
    return events;
  }

  global.SheetsData = { loadEventsFromSheet };
})(window);
