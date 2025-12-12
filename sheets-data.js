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
      const key = trim(h).toLowerCase();
      map[key] = idx;
    });
    // Normalize common variations
    if (Object.prototype.hasOwnProperty.call(map, 'image(s)')) {
      // Treat `image(s)` as `images`
      map['images'] = map['image(s)'];
    }
    if (Object.prototype.hasOwnProperty.call(map, 'imgs')) {
      map['images'] = map['imgs'];
    }
    return map;
  }

  function splitImages(val){
    const raw = trim(val);
    if (!raw) return [];
    // support comma or pipe separated
    return raw.split(/[|,]/).map(s=>trim(s)).filter(Boolean);
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
      const image = row[idx['image'] ?? -1];
      const imagesCell = row[idx['images'] ?? -1];
      const ev = {
        name: trim(name),
        date: trim(date),
        location: trim(location),
        description: trim(description)
      };
      const imgs = splitImages(imagesCell);
      if (imgs.length) ev.images = imgs;
      else if (trim(image)) ev.image = trim(image);
      events.push(ev);
    }
    return events;
  }

  async function loadEventsFromSheet(url){
    const target = (url && String(url).trim()) || 'data/creative-space-events.csv';
    const res = await fetch(encodeURI(target), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch CSV');
    const text = await res.text();
    const rows = parseCSV(text);
    return rowsToEvents(rows);
  }

  global.SheetsData = { loadEventsFromSheet };
})(window);
