// Event data loader: Google Sheet (JSONP) with local CSV fallback
// The Google Sheet is shared as "view only" — we use the gviz JSONP endpoint
// which bypasses CORS by injecting a <script> tag.
(function(global){
  'use strict';

  var SHEET_ID = '1XwudtMLabL1FlTdqDJL_m1dtat0yWJh3PCSuB2L_5LA';
  var LOCAL_CSV = 'data/creative-space-events.csv';

  function trim(s){ return (s==null? '' : String(s)).trim(); }

  // Split "16:00 - 18:00" into { time, endtime } or return as-is
  function splitTimeRange(timeStr, existingEndtime) {
    var t = trim(timeStr);
    if (!t) return { time: '', endtime: trim(existingEndtime) };
    var parts = t.split(/\s*[-–—]\s*/);
    if (parts.length === 2 && /^\d{1,2}[:.]?\d{0,2}\s*(am|pm)?$/i.test(parts[0]) && /^\d{1,2}[:.]?\d{0,2}\s*(am|pm)?$/i.test(parts[1])) {
      return { time: parts[0], endtime: trim(existingEndtime) || parts[1] };
    }
    return { time: t, endtime: trim(existingEndtime) };
  }

  // ---- Google Sheet via JSONP (bypasses CORS) ----

  function loadFromGoogleSheet() {
    return new Promise(function(resolve, reject) {
      var callbackName = '_sheetCallback_' + Date.now();
      var timeout = setTimeout(function() {
        cleanup();
        reject(new Error('Google Sheet JSONP timeout'));
      }, 8000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        var el = document.getElementById(callbackName);
        if (el) el.remove();
      }

      window[callbackName] = function(response) {
        cleanup();
        try {
          var events = parseGvizResponse(response);
          resolve(events);
        } catch (err) {
          reject(err);
        }
      };

      var script = document.createElement('script');
      script.id = callbackName;
      script.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
                   '/gviz/tq?tqx=responseHandler:' + callbackName;
      script.onerror = function() {
        cleanup();
        reject(new Error('Google Sheet script load failed'));
      };
      document.head.appendChild(script);
    });
  }

  function parseGvizResponse(response) {
    if (!response || response.status !== 'ok' || !response.table) {
      throw new Error('Invalid gviz response');
    }
    var cols = response.table.cols;
    var rows = response.table.rows;

    // Build column index map from labels
    var colMap = {};
    cols.forEach(function(col, i) {
      var label = trim(col.label).toLowerCase();
      if (label) colMap[label] = i;
    });

    var events = [];
    rows.forEach(function(row) {
      var cells = row.c;
      if (!cells) return;

      function cellVal(colName) {
        var idx = colMap[colName];
        if (idx === undefined || !cells[idx]) return '';
        var cell = cells[idx];
        var raw = String(cell.v || '');
        // Google Sheets Date() for time values → extract HH:MM
        var dm = /^Date\(\d+,\d+,\d+,(\d+),(\d+),\d+\)$/.exec(raw);
        if (dm) {
          return String(dm[1]).padStart(2,'0') + ':' + String(dm[2]).padStart(2,'0');
        }
        // Use formatted value (f) if available, otherwise raw value (v)
        return trim(cell.f || cell.v || '');
      }

      var name = cellVal('name');
      var date = cellVal('date');
      if (!name || !date) return;

      var imagesRaw = cellVal('image(s)') || cellVal('images');
      var images = imagesRaw
        ? imagesRaw.split(',').map(function(u){ return u.trim(); }).filter(Boolean)
        : [];

      var times = splitTimeRange(cellVal('time'), cellVal('endtime') || cellVal('end time'));
      events.push({
        name: name,
        date: date,
        time: times.time,
        endtime: times.endtime,
        location: cellVal('location'),
        price: cellVal('price'),
        description: cellVal('description'),
        images: images
      });
    });

    return events;
  }

  // ---- Local CSV fallback ----

  function parseCSV(text){
    var rows = [];
    var i = 0, field = '', row = [], inQuotes = false;
    while (i < text.length) {
      var ch = text[i++];
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

  function csvToEvents(rows) {
    if (!rows || !rows.length) return [];
    var header = rows[0];
    var idx = {};
    header.forEach(function(h, i) {
      idx[trim(h).replace(/^\uFEFF/, '').toLowerCase()] = i;
    });
    var events = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.every(function(c){ return trim(c)===''; })) continue;
      var name = row[idx['name'] ?? -1];
      var date = row[idx['date'] ?? -1];
      if (!trim(name) || !trim(date)) continue;
      var imagesRaw = row[idx['image(s)'] ?? idx['images'] ?? -1];
      var images = trim(imagesRaw)
        ? trim(imagesRaw).split(',').map(function(u){ return u.trim(); }).filter(Boolean)
        : [];
      var times = splitTimeRange(row[idx['time'] ?? -1], row[idx['endtime'] ?? idx['end time'] ?? -1]);
      events.push({
        name: trim(name),
        date: trim(date),
        time: times.time,
        endtime: times.endtime,
        location: trim(row[idx['location'] ?? -1]),
        price: trim(row[idx['price'] ?? -1]),
        description: trim(row[idx['description'] ?? -1]),
        images: images
      });
    }
    return events;
  }

  async function loadFromLocalCSV() {
    var res = await fetch(LOCAL_CSV, { cache: 'no-store' });
    if (!res.ok) throw new Error('Local CSV HTTP ' + res.status);
    var text = await res.text();
    return csvToEvents(parseCSV(text));
  }

  // ---- Public API ----

  async function loadEventsFromSheet() {
    try {
      var events = await loadFromGoogleSheet();
      console.log('[SheetsData] Loaded ' + events.length + ' event(s) from Google Sheet');
      return events;
    } catch (err) {
      console.warn('[SheetsData] Google Sheet failed, falling back to local CSV', err);
    }
    try {
      var events = await loadFromLocalCSV();
      console.log('[SheetsData] Loaded ' + events.length + ' event(s) from local CSV');
      return events;
    } catch (err2) {
      console.error('[SheetsData] Both sources failed', err2);
      return [];
    }
  }

  global.SheetsData = { loadEventsFromSheet: loadEventsFromSheet };
})(window);
