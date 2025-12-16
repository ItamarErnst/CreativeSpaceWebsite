// Image rotation and discovery script
// Tries to automatically load all .png files from the images/ folder.
// Strategy:
// 1) Try to fetch the directory listing and parse .png links (works on some static servers)
// 2) Fallback: probe common numbered names art1.png..art50.png and include existing ones

let images = [];
let index = 0;
const imageElement = document.getElementById("art-image");

function setTitleFromImage(path) {
    const fileWithExt = path.split('/').pop();
    const file = fileWithExt.replace(/\.[^/.]+$/, ''); // strip extension like .png
    const titleElement = document.getElementById('art-title');
    if (titleElement) {
        titleElement.textContent = file;
    }
}

async function fetchDirectoryPNGs() {
    try {
        const res = await fetch('images/');
        // Expecting an HTML directory listing
        if (res.ok) {
            const text = await res.text();
            const matches = Array.from(text.matchAll(/href=["']([^"']+\.png)["']/gi))
                .map(m => m[1])
                .filter(href => href.toLowerCase().endsWith('.png'))
                .map(href => href.startsWith('images/') ? href : `images/${href}`);
            // Deduplicate and keep order
            const unique = [...new Set(matches)];
            return unique;
        }
    } catch (_) {
        // ignore
    }
    return [];
}

async function probeNumberedPNGs(max = 50) {
    const found = [];
    const checks = [];
    for (let i = 1; i <= max; i++) {
        const url = `images/art${i}.png`;
        checks.push(
            fetch(url, { method: 'HEAD' }).then(r => {
                if (r.ok) found.push(url);
            }).catch(() => {})
        );
    }
    await Promise.all(checks);
    return found;
}

async function discoverImages() {
    let list = await fetchDirectoryPNGs();
    if (!list.length) {
        list = await probeNumberedPNGs();
    }
    // Final fallback: use whatever is currently set in the img
    if (!list.length && imageElement && imageElement.src) {
        const url = imageElement.getAttribute('src') || imageElement.src;
        list = [url];
    }
    images = list;

    // Initialize display with the first image
    if (images.length && imageElement) {
        index = 0;
        imageElement.src = images[0];
        setTitleFromImage(images[0]);
    }

    // Start rotation if there's more than one image
    if (images.length > 1) {
        setInterval(() => {
            index = (index + 1) % images.length;
            imageElement.src = images[index];
            setTitleFromImage(images[index]);
        }, 4000);
    }
}

// Kick off discovery once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', discoverImages);
} else {
    discoverImages();
}

// --------------------------------------------
// Events data (loaded from events.js) and rendering
// --------------------------------------------

// Expect a global `window.EVENTS` provided by events.js.
// Keep past events in the data; rendering will filter them out.

function parseISODate(d) {
  // Return Date object at local midnight for consistency
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec((d || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(y, mo, day, 0, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function isUpcoming(dt, today) {
  // Consider events on or after today as upcoming
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

function pickEvents() {
  const today = new Date();
  // Normalize today to local midnight
  today.setHours(0, 0, 0, 0);

  const source = Array.isArray(window.EVENTS) ? window.EVENTS : [];
  const enriched = source.map(e => {
    const dt = parseISODate(e.date);
    return { ...e, _dateObj: dt };
  }).filter(e => {
    if (!e._dateObj) return false; // drop invalid dates
    return isUpcoming(e._dateObj, today);
  }).sort((a, b) => a._dateObj - b._dateObj);

  const next = enriched[0] || null;
  const upcoming = next ? enriched.slice(1, 7) : enriched.slice(0, 6); // cap 6
  return { next, upcoming };
}


function renderNextEvent(next) {
  const section = document.getElementById('next-event-section');
  if (!section) return;
  if (!next) {
    // No upcoming events — hide the section
    section.style.display = 'none';
    return;
  }
  const titleEl = document.getElementById('next-title');
  const dateEl = document.getElementById('next-date');
  const descEl = document.getElementById('next-description');
  const locEl = document.getElementById('next-location');

  const dateText = next._dateObj ? formatDate(next._dateObj) : 'TBD';
  const locationText = safe(next.location);
  if (dateEl) dateEl.textContent = `Date: ${dateText}`;
  if (titleEl) titleEl.textContent = safe(next.name);
  if (descEl) descEl.textContent = safe(next.description);
  if (locEl) locEl.textContent = `Location: ${locationText}`;
}

function renderUpcoming(list) {
  const container = document.getElementById('upcoming-list');
  if (!container) return;
  container.innerHTML = '';
  if (!list || !list.length) {
    // No upcoming events beyond the next
    const empty = document.createElement('div');
    empty.className = 'event';
    empty.textContent = 'No additional upcoming events.';
    container.appendChild(empty);
    return;
  }

  for (const ev of list) {
    const div = document.createElement('div');
    div.className = 'event';
    const dateText = ev._dateObj ? formatDate(ev._dateObj) : 'TBD';
    const nameText = safe(ev.name);
    const locText = safe(ev.location);
    div.textContent = `${nameText} — ${dateText} — ${locText}`;
    container.appendChild(div);
  }
}

function initEvents() {
  const { next, upcoming } = pickEvents();
  renderNextEvent(next);
  renderUpcoming(upcoming);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEvents);
} else {
  initEvents();
}
